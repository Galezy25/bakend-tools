import express from 'express';
import { NextFunction } from 'express-serve-static-core';
import request = require('supertest');
import Connection from '../../src/easysql/connection';
import * as ApiREST from '../../src/apirest';
import SimpleToken from '../../src/simpletoken';
import CRUD from '../../src/crud.interface';

const mockQuery = jest.fn(
    (
        query: string,
        callback: (err: any, results: any, fields: any) => void
    ) => {
        if (query.includes('INSERT INTO')) {
            callback(
                undefined,
                {
                    insertId: 265,
                },
                []
            );
        } else {
            callback(
                undefined,
                [
                    {
                        id: 265,
                        name: 'Atari 2600',
                        cost: 849.88,
                    },
                ],
                []
            );
        }
    }
);
jest.mock('mysql', () => {
    return {
        createPool: jest.fn(_config => ({
            query: mockQuery,
            end: jest.fn(),
        })),
        escape: jest.fn((value: any) => {
            return typeof value === 'string' ? `'${value}'` : value + '';
        }),
    };
});

describe('ApiREST tests', () => {
    const body = {
        id: 265,
        name: 'Atari 2600',
        cost: 849.88,
    };
    const confirmationMd5 = 'Confirmation pass';
    const connection = new Connection({
        user: 'tester',
        database: 'test',
    });
    const table = connection.table('products', {
        id_name: 'id',
        tablesRelated: ['categories'],
    });
    const errorCRUD: CRUD = {
        id_name: 'id',
        count() {
            throw new Error('Error');
        },
        find() {
            throw new Error('Error');
        },
        findOne() {
            throw new Error('Error');
        },
        create() {
            throw new Error('Error');
        },
        update() {
            throw new Error('Error');
        },
        replace() {
            throw new Error('Error');
        },
        delete() {
            throw new Error('Error');
        },
    };
    const simpleToken = new SimpleToken('RESTful tests');
    const getSecurityMiddleware = ApiREST.defaultSecurity(simpleToken.verify);
    const defaultRESTful = ApiREST.createApiREST(
        {
            find: ApiREST.defaultFind(table),
            findOne: ApiREST.defaultFindOne(table),
            count: ApiREST.defaultCount(table),
            create: [
                getSecurityMiddleware(payload => {
                    return payload.modify;
                }),
                ApiREST.defaultCreate(table, 'id'),
            ],
            modify: [
                getSecurityMiddleware(payload => {
                    return payload.modify;
                }),
                ApiREST.defaultModify(table),
            ],
            replace: [
                getSecurityMiddleware(payload => {
                    return payload.modify;
                }),
                ApiREST.defaultReplace(table),
            ],
            remove: [
                getSecurityMiddleware(payload => {
                    return (
                        payload.modify &&
                        !!payload._headers &&
                        payload._headers['x-confirmation'] === confirmationMd5
                    );
                }),
                ApiREST.defaultRemove(table),
            ],
        },
        'id'
    );
    const onlyFindRESTful = ApiREST.createApiREST(
        {
            find: ApiREST.defaultFind(table),
        },
        'id'
    );
    const errorRESTful = ApiREST.createApiREST(
        {
            find: ApiREST.defaultFind(errorCRUD),
            findOne: ApiREST.defaultFindOne(errorCRUD),
            count: ApiREST.defaultCount(errorCRUD),
            create: ApiREST.defaultCreate(errorCRUD),
            replace: ApiREST.defaultReplace(errorCRUD),
            modify: ApiREST.defaultModify(errorCRUD),
            remove: ApiREST.defaultRemove(errorCRUD),
        },
        'id'
    );
    const tokenCanModify = simpleToken.sign({ modify: true });
    const tokenCantModify = simpleToken.sign({});
    const app = express();
    app.use(express.json());
    app.use('/default/', defaultRESTful);
    app.use('/resources/onlyFind/', onlyFindRESTful);
    app.use('/resources/errors/', errorRESTful);

    app.use(
        (err: any, __req: any, res: express.Response, next: NextFunction) => {
            if (err.statusCode <= 500) {
                res.sendStatus(err.statusCode);
            } else {
                next(err);
            }
        }
    );

    beforeEach(() => {
        mockQuery.mockClear();
    });

    test('createApiREST error to create "idName needed"', async () => {
        expect(() =>
            ApiREST.createApiREST({
                findOne: () => {},
            })
        ).toThrow();
        expect(() =>
            ApiREST.createApiREST({
                modify: () => {},
            })
        ).toThrow();
        expect(() =>
            ApiREST.createApiREST({
                replace: () => {},
            })
        ).toThrow();
        expect(() =>
            ApiREST.createApiREST({
                remove: () => {},
            })
        ).toThrow();
    });

    test('Default find, findOne, count tests', async () => {
        await request(app)
            .get('/default?_sort=cost:ASC&_limit=50&_start=250')
            .expect(200);
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();

        await request(app)
            .get(
                '/default/265?categories_inner=this.category:categories.id,name:category_name'
            )
            .expect(200);
        expect(mockQuery.mock.calls[1][0]).toMatchSnapshot();

        await request(app)
            .get('/default/count?category_in=1,2,3,4')
            .expect(200);
        expect(mockQuery.mock.calls[2][0]).toMatchSnapshot();
    });

    test('Default create and payload security tests', async () => {
        await request(app)
            .post('/default')
            .send(body)
            .set('authorization', tokenCantModify)
            .expect(403);
        await request(app)
            .post('/default')
            .send(body)
            .set('authorization', tokenCanModify)
            .expect(201);
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Default modify tests', async () => {
        await request(app)
            .patch('/default/265')
            .set('authorization', tokenCanModify)
            .send({ cost: 850 })
            .expect(200);
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Default replace tests', async () => {
        await request(app)
            .put('/default/265')
            .set('authorization', tokenCanModify)
            .send(body)
            .expect(200);
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Default remove and headers tests', async () => {
        await request(app)
            .delete('/default/265')
            .set('authorization', tokenCanModify)
            .expect(403);
        await request(app)
            .delete('/default/265')
            .set('authorization', tokenCanModify)
            .set('x-confirmation', confirmationMd5)
            .expect(200);
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('OnlyFind test', async () => {
        await request(app)
            .get('/resources/onlyFind')
            .expect(200);
        await request(app)
            .get('/resources/onlyFind/265')
            .expect(404);
        await request(app)
            .post('/resources/onlyFind')
            .expect(404);
        await request(app)
            .patch('/resources/onlyFind/265')
            .expect(404);
        await request(app)
            .delete('/resources/onlyFind/265')
            .expect(404);
    });

    test('Errors test', async () => {
        await request(app)
            .get('/resources/errors')
            .expect(500);
        await request(app)
            .get('/resources/errors/265')
            .expect(500);
        await request(app)
            .post('/resources/errors')
            .expect(500);
        await request(app)
            .put('/resources/errors/265')
            .expect(500);
        await request(app)
            .patch('/resources/errors/265')
            .expect(500);
        await request(app)
            .delete('/resources/errors/265')
            .expect(500);
        await request(app)
            .get('/resources/errors/count')
            .expect(500);
    });
});
