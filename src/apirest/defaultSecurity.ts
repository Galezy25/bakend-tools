import { IncomingHttpHeaders } from 'http';
import express from 'express';
import { ErrorHTTP } from '../error.handler';

export const defaultSecurity = (
    verifyToken: (token: string) => Promise<any>
) => (
    validateData: (payloadToMatch: Matcher) => boolean = () => true
) => async (req: express.Request, _res: any, next: express.NextFunction) => {
    try {
        if (!req.headers.authorization) {
            return next(
                new ErrorHTTP('No token authorization', {
                    statusCode: 401,
                })
            );
        }

        const payload = await verifyToken(req.headers.authorization);
        const payloadToMatch: Matcher = {
            ...payload,
            _params: req.params,
            _query: req.query,
            _headers: req.headers,
            _cookies: req.cookies,
        };

        if (!validateData(payloadToMatch)) {
            next(new ErrorHTTP('No match', { statusCode: 403 }));
        }
        next();
    } catch (error) {
        next(error);
    }
};

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
