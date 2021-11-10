import express from 'express';
import cookie from 'cookie';

import SimpleToken from './simpletoken';
import { ErrorHTTP } from './error.handler';

declare global {
    namespace Express {
        interface Request {
            /**
             * Session payload
             */
            session?: {
                _token: string;
                /**
                 * ```ts
                 * [ protocol, domain, path ]
                 * ```
                 */
                _url: ['http' | 'https', string, string];
                [key: string]: any;
            };
            /**
             *
             * @param payload Object with session information.
             * @param expiresIn (Optional) Seconds of lifetime before expires.
             * @param options (Optional) Set session url.
             */
            setSession(
                payload: any,
                expiresIn?: number,
                options?: {
                    /**
                     * Indicates a URL path that must exist in the requested URL.
                     */
                    path?: string;
                    /**
                     * Specifies which hosts can receive the session.
                     */
                    domain?: string;
                    /**
                     * Only used on HTTPS protocol.
                     */
                    secure?: boolean;
                }
            ): {
                access_token: string;
                token_type: 'Bearer';
                expires_in: number | undefined;
                expires_at: Date | undefined;
            };
            /**
             *
             * @param path Indicates a URL path that must exist in the requested URL.
             */
            removeSession(path?: string): void;
        }
    }
}

const cookieParser = (cookies: string) => cookie.parse(cookies);

interface Options {
    /**
     * Seconds of lifetime before expires.
     */
    lifetime?: number;
    /**
     * The manager accept authorization header (Default: true).
     */
    authorizationHeader: boolean;
    /**
     * Cookie configuration.
     */
    cookie?: {
        name: string;
        path?: string;
        domain?: string;
        secure?: boolean;
    };
    /**
     * Function that handle if a token verify is unsuccessful
     */
    errorHandler?: (err: any, req: express.Request) => void;
}

/**
 *
 * @param secret Password to sign sessions.
 * @param defaultOptions Options to configure sessions.
 * @returns Session manager middleware.
 */
export const sessionManager: (
    secret: string,
    defaultOptions?: Options
) => express.RequestHandler = (secret, defaultOptions) => {
    let simpleToken = new SimpleToken(secret);
    let cookieName = defaultOptions?.cookie?.name || '_ses';

    const getToken = (req: express.Request) => {
        let sesToken;
        if (defaultOptions?.authorizationHeader !== false) {
            sesToken =
                req.headers.authorization ||
                cookieParser(req.headers.cookie || '')[cookieName];
            sesToken = sesToken.replace('Bearer ', '');
        } else {
            sesToken = cookieParser(req.headers.cookie || '')[cookieName];
        }
        return sesToken;
    };

    return async (req, res, next) => {
        try {
            let sesToken = getToken(req);

            if (sesToken) {
                req.session = {
                    _token: sesToken,
                    ...(await simpleToken.verify(sesToken)),
                };
            }
        } catch (err) {
            if (defaultOptions?.errorHandler)
                defaultOptions.errorHandler(err, req);
        }

        req.setSession = (
            payload,
            expires_in = defaultOptions?.lifetime,
            options = defaultOptions?.cookie
        ) => {
            if (options) {
                payload = {
                    ...payload,
                    _url: [
                        options.secure ? 'https' : 'http',
                        options.domain || '',
                        options.path || '',
                    ],
                };
            }
            let access_token = simpleToken.sign(payload, expires_in);
            let cookieOptions: express.CookieOptions = {
                httpOnly: true,
                sameSite: 'strict',
                secure: options?.secure || req.protocol === 'https',
                path: options?.path,
                domain: options?.domain,
            };

            let [expires_encoded] = access_token.split('.');
            let expires_decoded = Number(
                Buffer.from(expires_encoded, 'base64').toString()
            );
            let expires_at = expires_decoded
                ? new Date(expires_decoded)
                : undefined;

            if (expires_in) cookieOptions.maxAge = expires_in * 1000;
            if (expires_at) cookieOptions.expires = expires_at;

            res.cookie(cookieName, access_token, cookieOptions);
            req.session = {
                _token: access_token,
                ...payload,
            };

            return {
                access_token,
                token_type: 'Bearer',
                expires_at,
                expires_in,
            };
        };

        req.removeSession = (path = defaultOptions?.cookie?.path) => {
            res.clearCookie(
                cookieName,
                path && {
                    path,
                }
            );
        };

        next();
    };
};

/**
 *
 * @param verifyPayload Function that verifies the session payload.
 * @returns Express handler.
 */
export const verifySession: (
    verifyPayload?: (payload: any) => boolean
) => express.RequestHandler = verifyPayload => (req, _res, next) => {
    if (req.session) {
        let isPermitted = true;
        if (verifyPayload) {
            isPermitted = verifyPayload(req.session);
        }
        if (req.session._url) {
            let [protocol, domain, path] = req.session._url;
            isPermitted = isPermitted && req.protocol.includes(protocol, 0);
            isPermitted = isPermitted && req.hostname.includes(domain);
            isPermitted = isPermitted && req.originalUrl.includes(path, 0);
        }
        if (isPermitted) {
            next();
        } else {
            next(
                new ErrorHTTP('No access', {
                    statusCode: 403,
                    originalUrl: req.originalUrl,
                    ip: req.ip,
                    session: req.session,
                })
            );
        }
    } else {
        next(
            new ErrorHTTP('No session', {
                statusCode: 401,
                originalUrl: req.originalUrl,
                ip: req.ip,
            })
        );
    }
};
