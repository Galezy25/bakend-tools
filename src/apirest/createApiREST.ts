import express from 'express';

type RESTfulHandler = express.RequestHandler | express.RequestHandler[];

/**
 *
 * @param handlers
 * @param idName
 * @returns
 */
export function createApiREST(
    handlers: {
        /**
         * GET: `/`
         */
        find?: RESTfulHandler;

        /**
         * GET: `/:idName`
         */
        findOne?: RESTfulHandler;

        /**
         * GET: `/count`
         */
        count?: RESTfulHandler;

        /**
         * POST: `/`
         */
        create?: RESTfulHandler;

        /**
         * PUT: `/:idName`
         */
        replace?: RESTfulHandler;

        /**
         * PATCH: `/:idName`
         */
        modify?: RESTfulHandler;

        /**
         * DELETE: `/:idName`
         */
        remove?: RESTfulHandler;
    },
    idName?: string
): express.Router {
    const router = express.Router();
    if (handlers.find) {
        router.get('/', ...getHandlers(handlers.find));
    }
    if (handlers.count) {
        router.get(`/count`, ...getHandlers(handlers.count));
    }
    if (handlers.findOne) {
        if (!idName) throw new Error('idName needed');
        router.get(`/:${idName}`, ...getHandlers(handlers.findOne));
    }
    if (handlers.create) {
        router.post('/', ...getHandlers(handlers.create));
    }
    if (handlers.replace) {
        if (!idName) throw new Error('idName needed');
        router.put(`/:${idName}`, ...getHandlers(handlers.replace));
    }
    if (handlers.modify) {
        if (!idName) throw new Error('idName needed');
        router.patch(`/:${idName}`, ...getHandlers(handlers.modify));
    }
    if (handlers.remove) {
        if (!idName) throw new Error('idName needed');
        router.delete(`/:${idName}`, ...getHandlers(handlers.remove));
    }
    return router;
}

const getHandlers = (handlers: RESTfulHandler) =>
    handlers instanceof Array ? handlers : [handlers];
