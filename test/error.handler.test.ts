import express = require('express');
import path = require('path');
import request = require('supertest');
import ErrorHandler, { ErrorHTTP } from '../src/error.handler';

describe('Error handler', () => {
    const app = express();
    const errorHandler = new ErrorHandler(path.resolve(__dirname, 'error.log'));
    afterAll(() => {
        errorHandler.restartErrorLog();
    });

    app.get('/sendError/:status', (req, _res, next) => {
        next({
            code: Number.parseInt(req.params.status),
        });
    });
    app.get('/throwError/:status', (req, _res, _next) => {
        throw new ErrorHTTP('Some error throwed', {
            statusCode: Number(req.params.status),
            details: 'Description more extended of the problem',
        });
    });
    app.get('/throwError', (_req, _res, _next) => {
        throw new ErrorHTTP('Some error throwed by default settings', {
            details: 'Description more extended of the problem',
        });
    });
    app.use(errorHandler.handler);

    test('Handler 400', done => {
        request(app)
            .get('/sendError/400')
            .expect(400)
            .end((err, __res) => {
                if (err) return done(err);
                return done();
            });
    });

    test('Handler 500, error.log must be not empty', async done => {
        await errorHandler.restartErrorLog();
        request(app)
            .get('/sendError/500')
            .expect(500)
            .then(async () => {
                const errorLog = await errorHandler.getErrorLog();
                expect(errorLog.toString()).not.toBeFalsy();
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    test('Handler throw 401, error.log must be empty', async done => {
        await errorHandler.restartErrorLog();
        request(app)
            .get('/throwError/401')
            .expect(401)
            .then(async () => {
                const errorLog = await errorHandler.getErrorLog();
                expect(errorLog.toString()).toBeFalsy();
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    test('Handler throw default, error.log must be not empty', async done => {
        await errorHandler.restartErrorLog();
        request(app)
            .get('/throwError')
            .expect(500)
            .then(async () => {
                const errorLog = await errorHandler.getErrorLog();
                expect(errorLog.toString()).not.toBeFalsy();
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    test('AppendError, error.log must be not empty', async () => {
        await errorHandler.restartErrorLog();
        await errorHandler.appendError(
            new Error('This is a test error'),
            'AppendError test'
        );
        const errorLog = await errorHandler.getErrorLog();
        expect(errorLog).not.toBeFalsy();
    });
});
