import express from 'express';
import { NextFunction } from 'express-serve-static-core';
import request = require('supertest');
import Connection from '../src/easysql/connection';
import RESTful from '../src/restful.api';
import SimpleToken from '../src/simpletoken';

const mockQuery = jest.fn(
    (__query, callback: (err: any, results: any, fields: any) => void) => {
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

describe('RESTful tests', () => {
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
    const simpleToken = new SimpleToken('RESTful tests');
    const defaultRESTful = new RESTful('/default', table)
        .find('default')
        .findOne('default')
        .create('default')
        .update('default')
        .delete('default')
        .setSecurity(simpleToken.verify, {
            create: payload => {
                return payload.modify;
            },
            update: { modify: true },
            delete: {
                modify: true,
                _headers: {
                    'x-confirmation': confirmationMd5,
                },
            },
        });
    const onlyFindRESTful = new RESTful('/onlyFind', table).find('default');
    const errorRESTful = new RESTful('/errors', {
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
    })
        .find('default')
        .findOne('default')
        .create('default')
        .update('default')
        .delete('default')
        .count('default');
    const customRESTful = new RESTful('/custom')
        .find((_req, res) => res.sendStatus(200))
        .findOne((_req, res) => res.sendStatus(200))
        .count((_req, res) => res.sendStatus(200))
        .create((_req, res) => res.sendStatus(200))
        .update((_req, res) => res.sendStatus(200))
        .delete((_req, res) => res.sendStatus(200));

    const tokenCanModify = simpleToken.sign({ modify: true });
    const tokenCantModify = simpleToken.sign({});
    const app = express();
    app.use(express.json());
    app.use('/', defaultRESTful.router);
    app.use('/resources', onlyFindRESTful.router);
    app.use('/resources', errorRESTful.router);
    app.use('/resources', customRESTful.router);

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

    test('Default find, findOne tests', async () => {
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
    });

    test('Default create and payload security tests', async () => {
        await request(app)
            .post('/default')
            .send(body)
            .set('authorization', tokenCantModify)
            .expect(401);
        await request(app)
            .post('/default')
            .send(body)
            .set('authorization', tokenCanModify)
            .expect(200);
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Default update tests', async () => {
        await request(app)
            .put('/default/265')
            .set('authorization', tokenCanModify)
            .send({ cost: 850 })
            .expect(200);
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Default delete and headers tests', async () => {
        await request(app)
            .delete('/default/265')
            .set('authorization', tokenCanModify)
            .expect(401);
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
            .put('/resources/onlyFind/265')
            .expect(404);
        await request(app)
            .delete('/resources/onlyFind/265')
            .expect(404);
    });

    test('OnlyFind test', async () => {
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
            .delete('/resources/errors/265')
            .expect(500);
        await request(app)
            .get('/resources/errors/count')
            .expect(500);
    });

    test('Custom test', async () => {
        await request(app)
            .get('/resources/custom')
            .expect(200);
        await request(app)
            .get('/resources/custom/265')
            .expect(200);
        await request(app)
            .post('/resources/custom')
            .expect(200);
        await request(app)
            .put('/resources/custom/265')
            .expect(200);
        await request(app)
            .delete('/resources/custom/265')
            .expect(200);
        await request(app)
            .get('/resources/custom/count')
            .expect(200);
    });
});
