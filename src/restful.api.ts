import {
    NextFunction,
    RequestHandler,
    Router,
    Request,
    Response,
} from 'express';
import { IncomingHttpHeaders } from 'http';
import { ErrorHTTP } from './error.handler';
import CRUD from './crud.interface';

export type PayloadHandler<Params = {}, Payload = any> = RequestHandler<
    {
        [key: string]: string;
    } & {
        payload: Payload;
    } & Params
>;

export interface Matcher {
    /**
     * Property into payload of the token.
     */
    [property: string]: any;
    /**
     * Request params.
     */
    _params?: { id: string };
    /**
     * Request query
     */
    _query?: any;
    /**
     * Request headers
     */
    _headers?: IncomingHttpHeaders;
    /**
     * Request cookies
     */
    _cookies?: any;
}

export class RESTful {
    private _path: string;
    private _findHandlers: PayloadHandler[] = [];
    private _findOneHandlers: PayloadHandler<{ id: string }>[] = [];
    private _countHandlers: PayloadHandler[] = [];
    private _createHandlers: PayloadHandler[] = [];
    private _updateHandlers: PayloadHandler<{ id: string }>[] = [];
    private _deleteHandlers: PayloadHandler<{ id: string }>[] = [];
    private _crud?: CRUD;

    private get crud() {
        if (this._crud) {
            return this._crud;
        } else {
            throw new Error('CRUD no defined');
        }
    }

    /**
     *
     * @param path Path base of this API.
     * @param crud (Optional) CRUD Model with operations find, findOne, create, update and delete,  must be declared if the defaults CRUD handlers are used.
     */
    constructor(path: string, crud?: CRUD) {
        this._path = path;
        this._crud = crud;

        this.__defaultFind = this.__defaultFind.bind(this);
        this.__defaultFindOne = this.__defaultFindOne.bind(this);
        this.__defaultCreate = this.__defaultCreate.bind(this);
        this.__defaultUpdate = this.__defaultUpdate.bind(this);
        this.__defaultDelete = this.__defaultDelete.bind(this);

        this.find = this.find.bind(this);
        this.findOne = this.findOne.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);

        this.setSecurity = this.setSecurity.bind(this);
        this.setSecurityCustom = this.setSecurityCustom.bind(this);

        this.__match = this.__match.bind(this);

        this.__defaultSecurity = this.__defaultSecurity.bind(this);
    }

    /**
     * Express router with the RESTful API ready to use.
     *  - Find: Get this._path
     *  - FindOne: Get this._path + '/:id'
     *  - Create: Post this._path
     *  - Update: Put this._path + '/:id'
     *  - Delete: Delete this._path + '/:id'
     */
    public get router() {
        let router = Router();
        if (this._findHandlers.length) {
            router.get(this._path, ...this._findHandlers);
        }
        if (this._findOneHandlers.length) {
            router.get(`${this._path}/:id`, ...this._findOneHandlers);
        }
        if (this._createHandlers.length) {
            router.post(this._path, ...this._createHandlers);
        }
        if (this._updateHandlers.length) {
            router.put(`${this._path}/:id`, ...this._updateHandlers);
        }
        if (this._deleteHandlers.length) {
            router.delete(`${this._path}/:id`, ...this._deleteHandlers);
        }
        return router;
    }

    private __match(payloadToMatch: any, toMatch: any) {
        const toMatchProps = Object.getOwnPropertyNames(toMatch);
        toMatchProps.forEach(toMatchProp => {
            if (
                typeof toMatch[toMatchProp] === 'object' &&
                typeof payloadToMatch[toMatchProp] === 'object'
            ) {
                this.__match(payloadToMatch[toMatchProp], toMatch[toMatchProp]);
            } else if (toMatch[toMatchProp] !== payloadToMatch[toMatchProp]) {
                throw new ErrorHTTP('No match', { statusCode: 401 });
            }
        });
    }

    private __defaultSecurity(
        verifyToken: (token: string) => Promise<any>,
        toMatch: Matcher | ((payloadToMatch: Matcher) => boolean)
    ): PayloadHandler {
        return async (req, __res, next) => {
            try {
                if (req.headers.authorization) {
                    const payload = await verifyToken(
                        req.headers.authorization
                    );
                    const payloadToMatch = {
                        ...payload,
                        _params: req.params,
                        _query: req.query,
                        _headers: req.headers,
                        _cookies: req.cookies,
                    };
                    req.params.payload = payload;
                    if (typeof toMatch === 'object') {
                        this.__match(payloadToMatch, toMatch);
                    } else if (!toMatch(payloadToMatch)) {
                        next(new ErrorHTTP('No match', { statusCode: 401 }));
                    }
                    next();
                } else {
                    next(
                        new ErrorHTTP('No token authorization', {
                            statusCode: 401,
                        })
                    );
                }
            } catch (err) {
                next(err);
            }
        };
    }

    private async __defaultFind(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const rows = await this.crud.find(req.query);
            return res.json(rows);
        } catch (err) {
            return next(err);
        }
    }
    private async __defaultFindOne(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const row = await this.crud.findOne({
                ...req.query,
                [this.crud.id_name]: req.params.id,
            });
            return res.json(row);
        } catch (err) {
            return next(err);
        }
    }
    private async __defaultCount(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const count = await this.crud.count(req.query);
            return res.json({ count });
        } catch (err) {
            return next(err);
        }
    }
    private async __defaultCreate(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const queryRes = await this.crud.create(req.body);
            if (req.body instanceof Array) {
                return res.json(queryRes);
            } else if (req.body[this.crud.id_name]) {
                return res.json(req.body);
            } else if (queryRes.insertId) {
                const row = this.crud.findOne({
                    [this.crud.id_name]: queryRes.insertId,
                });
                return res.json(row);
            } else {
                return res.sendStatus(200);
            }
        } catch (err) {
            return next(err);
        }
    }
    private async __defaultUpdate(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            await this.crud.update(
                {
                    [this.crud.id_name]: req.params.id,
                },
                req.body
            );
            return res.sendStatus(200);
        } catch (err) {
            return next(err);
        }
    }
    private async __defaultDelete(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            await this.crud.delete({ [this.crud.id_name]: req.params.id });
            return res.sendStatus(200);
        } catch (err) {
            return next(err);
        }
    }

    /**
     *
     * @param handlers Set a custom handler to any CRUD operation.
     */
    public setSecurityCustom(handlers: {
        find?: PayloadHandler;
        findOne?: PayloadHandler<{ id: string }>;
        create?: PayloadHandler;
        update?: PayloadHandler<{ id: string }>;
        delete?: PayloadHandler<{ id: string }>;
    }) {
        if (handlers.find) {
            this._findHandlers = [handlers.find, ...this._findHandlers];
        }
        if (handlers.findOne) {
            this._findOneHandlers = [
                handlers.findOne,
                ...this._findOneHandlers,
            ];
        }
        if (handlers.create) {
            this._createHandlers = [handlers.create, ...this._createHandlers];
        }
        if (handlers.update) {
            this._updateHandlers = [handlers.update, ...this._updateHandlers];
        }
        if (handlers.delete) {
            this._deleteHandlers = [handlers.delete, ...this._deleteHandlers];
        }
        return this;
    }

    /**
     * Set the default security handler that verify the token and compare the payload with
     * @param verifyToken Funtion to verify the token recived into the header authorization of the HTTP Request
     * @param toMatch Set a Matcher object or predicate function to any CRUD operation (it can be {}).
     * If it doesn't define to some operation that operation won't have the security handler.
     *
     */
    setSecurity(
        verifyToken: (token: string) => Promise<any>,
        toMatch: {
            find?: Matcher | ((payloadToMatch: Matcher) => boolean);
            findOne?: Matcher | ((payloadToMatch: Matcher) => boolean);
            create?: Matcher | ((payloadToMatch: Matcher) => boolean);
            update?: Matcher | ((payloadToMatch: Matcher) => boolean);
            delete?: Matcher | ((payloadToMatch: Matcher) => boolean);
        }
    ) {
        if (toMatch.find) {
            this._findHandlers = [
                this.__defaultSecurity(verifyToken, toMatch.find),
                ...this._findHandlers,
            ];
        }
        if (toMatch.findOne) {
            this._findOneHandlers = [
                this.__defaultSecurity(verifyToken, toMatch.findOne),
                ...this._findOneHandlers,
            ];
        }
        if (toMatch.create) {
            this._createHandlers = [
                this.__defaultSecurity(verifyToken, toMatch.create),
                ...this._createHandlers,
            ];
        }
        if (toMatch.update) {
            this._updateHandlers = [
                this.__defaultSecurity(verifyToken, toMatch.update),
                ...this._updateHandlers,
            ];
        }
        if (toMatch.delete) {
            this._deleteHandlers = [
                this.__defaultSecurity(verifyToken, toMatch.delete),
                ...this._deleteHandlers,
            ];
        }
        return this;
    }

    /**
     *
     * @param handler If it's 'default' will be set the default handler to this operation.
     *  - 'default': Make a Find operation into CRUD, the context will be set by the query of the request.
     * Other wise, you can define a custom handler.
     * @param middlewares Express middleware that will be execute before the handler
     */
    find<Payload = any>(
        handler: 'default' | PayloadHandler<{}, Payload>,
        ...middlewares: PayloadHandler<{}, Payload>[]
    ) {
        this._findHandlers = [
            ...this._findHandlers,
            ...middlewares,
            handler === 'default' ? this.__defaultFind : handler,
        ];
        return this;
    }
    /**
     *
     * @param handler If it's 'default' will be set the default handler to this operation.
     *  - 'default': Make a FindOne operation into CRUD, the context will be { [this.crud.id_name]: request.params.id }.
     * Other wise, you can define a custom handler.
     * @param middlewares Express middleware that will be execute before the handler
     */
    findOne<Payload = any>(
        handler: 'default' | PayloadHandler<{ id: string }, Payload>,
        ...middlewares: PayloadHandler<{ id: string }, Payload>[]
    ) {
        this._findOneHandlers = [
            ...this._findOneHandlers,
            ...middlewares,
            handler === 'default' ? this.__defaultFindOne : handler,
        ];
        return this;
    }
    /**
     *
     * @param handler If it's 'default' will be set the default handler to this operation.
     *  - 'default': Make a Count operation into CRUD, the context will be set by the query of the request.
     * Other wise, you can define a custom handler.
     * @param middlewares Express middleware that will be execute before the handler
     */
    count<Payload = any>(
        handler: 'default' | PayloadHandler<{}, Payload>,
        ...middlewares: PayloadHandler<{}, Payload>[]
    ) {
        this._countHandlers = [
            ...this._countHandlers,
            ...middlewares,
            handler === 'default' ? this.__defaultCount : handler,
        ];
        return this;
    }
    /**
     *
     * @param handler If it's 'default' will be set the default handler to this operation.
     *  - 'default': Make a Create operation into CRUD, the values will be set by the body of the request.
     * Other wise, you can define a custom handler.
     * @param middlewares Express middleware that will be execute before the handler
     */
    create<Payload = any>(
        handler: 'default' | PayloadHandler<{}, Payload>,
        ...middlewares: PayloadHandler<{}, Payload>[]
    ) {
        this._createHandlers = [
            ...this._createHandlers,
            ...middlewares,
            handler === 'default' ? this.__defaultCreate : handler,
        ];
        return this;
    }
    /**
     *
     * @param handler If it's 'default' will be set the default handler to this operation.
     *  - 'default': Make an Update operation into CRUD:
     *      - context will be { [this.crud.id_name]: request.params.id },
     *      - valuesToUpdate will be the body of the request.
     * Other wise, you can define a custom handler.
     * @param middlewares Express middleware that will be execute before the handler
     */
    update<Payload = any>(
        handler: 'default' | PayloadHandler<{ id: string }, Payload>,
        ...middlewares: PayloadHandler<{ id: string }, Payload>[]
    ) {
        this._updateHandlers = [
            ...this._updateHandlers,
            ...middlewares,
            handler === 'default' ? this.__defaultUpdate : handler,
        ];
        return this;
    }
    /**
     *
     * @param handler If it's 'default' will be set the default handler to this operation.
     *  - 'default': Make a Delete operation into CRUD, the context will be { [this.crud.id_name]: request.params.id }.
     * Other wise, you can define a custom handler.
     * @param middlewares Express middleware that will be execute before the handler
     */
    delete<Payload = any>(
        handler: 'default' | PayloadHandler<{ id: string }, Payload>,
        ...middlewares: PayloadHandler<{ id: string }, Payload>[]
    ) {
        this._deleteHandlers = [
            ...this._deleteHandlers,
            ...middlewares,
            handler === 'default' ? this.__defaultDelete : handler,
        ];
        return this;
    }
}

export default RESTful;
