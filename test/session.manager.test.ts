import express from 'express';
import request from 'supertest';

import { sessionManager, verifySession } from '../src/session.manager';

describe('Session Manager', () => {
    let app = express();

    app.use(express.json());
    app.use(sessionManager('Secret key'));
    app.post('/session', (req, res, _next) => {
        res.json(req.setSession(req.body));
    });

    app.get('/remove-session', (req, res, _next) => {
        req.removeSession();
        res.sendStatus(200);
    });

    app.get('/public', (_req, res, _next) => {
        res.sendStatus(200);
    });

    app.get('/require-session', verifySession(), (_req, res, _next) => {
        res.sendStatus(200);
    });

    app.get(
        '/require-propTest',
        verifySession(payload => payload.propTest),
        (_req, res, _next) => {
            res.sendStatus(200);
        }
    );

    app.use(
        (
            err: any,
            _req: express.Request,
            res: express.Response,
            _next: any
        ) => {
            res.status(err.statusCode || 500).json(err);
        }
    );

    test('Public access', async () => {
        await request(app)
            .get('/public')
            .send()
            .expect(200);
    });

    test('Session required', async () => {
        await request(app)
            .get('/require-session')
            .send()
            .expect(401);
        let response = await request(app)
            .post('/session')
            .send({ prop: true });
        expect(response.headers['set-cookie'][0]).toMatch(
            /_ses=TmFO\.eyJwcm9wIjp0cnVlfQ%3D%3D\.\S*; Path=\/; HttpOnly; SameSite=Strict/
        );
        await request(app)
            .get('/require-session')
            .set('Cookie', response.headers['set-cookie'])
            .expect(200);
        await request(app)
            .get('/require-session')
            .set(
                'Authorization',
                response.body.token_type + ' ' + response.body.access_token
            )
            .expect(200);
    });

    test('Requires a sesion with propTest in payload', async () => {
        let response = await request(app)
            .post('/session')
            .send({ prop: true });
        let token_no_valid = response.body.access_token;
        response = await request(app)
            .post('/session')
            .send({ propTest: true });
        let token_valid = response.body.access_token;

        await request(app)
            .get('/require-propTest')
            .set('Authorization', 'Bearer ' + token_no_valid)
            .expect(403);
        await request(app)
            .get('/require-propTest')
            .set('Authorization', 'Bearer ' + token_valid)
            .expect(200);
    });

    test('Remove session', async () => {
        let response = await request(app)
            .get('/remove-session')
            .send();
        expect(response.headers['set-cookie']).toMatchObject([
            '_ses=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        ]);
    });
});
