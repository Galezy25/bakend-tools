# Overview

This is a collection of node tools to make express server development quicker and cleaner. Contains tools for jwt generation, SQL utilities, file management, error handling and others.

- [Overview](#overview)
- [SimpleToken](#simpletoken)
- [PermissionsManager](#permissionsmanager)
- [Session manager](#session-manager)
  - [Configuration](#configuration)
  - [Usage](#usage)
    - [req.setSession](#reqsetsession)
    - [verifySession](#verifysession)
    - [req.removeSession](#reqremovesession)
- [EasySQL](#easysql)
- [AdminFile](#adminfile)
- [ErrorHandler](#errorhandler)
- [ApiREST](#apirest)

# SimpleToken

```ts
import { SimpleToken } from 'backend-tools';

const simpleToken = new SimpleToken('SECRET KEY STRING');
const payload = {
    user: 265,
    permissions: 'af8',
};

/**
 * Create a token that expires in 300 seconds (5 minutes)
 */
const token = simpleToken.sign(payload, 300);

simpleToken
    .verify(token)
    .then(payloadIntoToken => {
        /**
         * Must be:
         * {
         *  user: 265,
         *  permissions: 'af8'
         * }
         */
        console.log(payloadIntoToken);
    })
    .catch(err => {
        // Invalid token
    });
```

Bcrypt algorithm is used to have better security, set the _saltRound_ or _cost factor_ (10 by default) into the instance of a _SimpleToken_ object.

```ts
const simpleToken = new SimpleToken('SECRET KEY STRING', 15);
```

# PermissionsManager

```ts
import { PermissionsManager } from 'backend-tools';

const permissionsManager = new PermissionsManager([
    'products_create',
    'products_update',
    'products_delete',
    'clients_create',
    'clients_update',
    'clients_delete',
    'providers_create',
    'providers_update',
    'providers_delete',
    'admin_users',
]);
```

Decode and encode permissions object into a short string of a base 32 number (each digit can be between _0_ and _v_).

```ts
const permissions = {
    clients_create: true,
    clients_update: true,
    providers_create: true,
    providers_update: true,
};

/**
 * Must be equal to '6o'
 */
const encoded = permissionsManager.encode(permissions);

/*
 * Must match to permissions object previously declared
 */
const decodedPermissions = permissionsManager.decode(encoded);
```

Build and verify payloads according to a list of permissions declared.

```ts
const permissions = {
    products_delete: true,
    clients_delete: true,
    providers_delete: true,
    admin_users: true,
};

/**
 * Payload must be
 * {
 *  user: 'admin',
 *  _pp: 'p4',
 * }
 */
const payload = permissionsManager.buildPayload(
    {
        user: 'admin',
    },
    permissions
);

/**
 * Return the permissions object
 */
const canDeleteClients = permissionsManager.verifyPayload(
    payload,
    'clients_delete'
);

/**
 * Must be false
 */
const canUpdateClients = permissionsManager.verifyPayload(
    payload,
    'clients_update'
);
```

Verify the permissions by other methods too.

```ts
const adminUsersVerifier = permissionsManager.getVerifier('admin_users');

const canAdminUsers = adminUsersVerifier(payload);
```

```ts
const {
    products_create,
    products_update,
    products_delete,
} = permissionsManager.verifyPayload(payload);
```

# Session manager

```ts
import express from 'express';
import { sessionManager, verifySession } from 'backend-tools';

let expressApp = express();
expressApp.use(express.json());

expressApp.use(sessionManager('SECRET KEY STRING'));

expressApp.post('/login', (req, res, next) => {
    let { username, password } = req.body;

    // ...

    // Success login

    /*
        Expires on 1800 seconds (30 min).
    */
    req.setSession({ user: username, canReadPrivate: true }, 1800, {
        // Only accepted on https request.
        secure: true,
    });

    res.sendStatus(200);
});

expressApp.get(
    '/private-resource',
    verifySession(session_data => session_data.canReadPrivate),
    (req, res, next) => {
        res.send('This is a private data');
    }
);
```

## Configuration

```ts
sessionManager(secret, defaultOptions);
```

-   _secret_: Password to sign sessions.
-   _defaultOptions_: Options to configure sessions by default.
    -   _lifetime_: Seconds of lifetime before expires.
    -   _authorizationHeader_: Set if the manager accept authorization header (Default: `true`).
    -   _cookie_: Cookie configuration.
    -   _errorHandler_: Function that handle if a token verify is unsuccessful.

## Usage

### req.setSession

```ts
req.setSession(payload, expiresIn, options);
```

-   _payload_: Object with session information.
-   _expiresIn_: (Optional) Seconds of lifetime before expires (By default defaultOption.lifetime), if it's `0` or `undefined` never expires.
-   _options_: (Optional) Set session url (By default defaultOption.cookie).

    -   _secure_: If only used on HTTPS protocol.
    -   _domain_
    -   _path_

**Returns** a object that can be used on [OAuth2](https://oauth.net/2/).

-   access_token.
-   token_type: `Bearer`.
-   expires_in.
-   expires_at.

### verifySession

```ts
verifySession(verifyPayload?: (payload) => boolean)
```

Returns a middleware that checks if the request has a session and checks its payload (if verifyPayload has setted).

[PermissionsManager](#permissionsmanager) Verifiers can be used

```ts
canCreateVerify = permissionsManager.getVerifier('products_create');

expressApp.post(
    '/products',
    verifySession(canCreateVerify),
    createProductsHandler
);
```

### req.removeSession

```ts
req.removeSession(path?: string)
```

Delete the session associated with the _path_.

# EasySQL

```ts
import { EasySQL } from 'backend-tools';

const testDBConnection = new EasySQL.Connection({
    username: 'tester',
    database: 'test',
});

/**
 Table object implements CRUD operation like Find, FindOne, Create, Update, Delete
 */
const usersTable = testDBConnection.table('users');

/**
  Equals to "SELECT * FROM users WHERE team IN ('A','Y','E','X','B') AND (email LIKE '%@gmail.com' OR email LIKE '%@outlook.com') ORDER BY team ASC ;" query
 */
usersTable
    .find({
        _sort: 'team:ASC',
        team_in: 'A,Y,E,X,B',
        email_like: ['%@gmail.com', '%@outlook.com'],
    })
    .then(users => {
        console.log(users);
    });
```

More details on [docs/EasySQL.md](docs/EasySQL.md) file in the [repository](https://github.com/Galezy25/bakend-tools).

# AdminFile

```ts
import { AdminFile } from 'backend-tools';

const adminFile = new AdminFile(AdminFile.path.resolve(__dirname, 'adminfile'));

adminFile.makeDir('logs');

adminFile.appendFile(
    'logs',
    'access.log',
    `
    <-------------------------------------------->
    Start at ${new Date().toLocaleString()}
    `
);
```

# ErrorHandler

```ts
import express from 'express';
import path from 'path';

import { ErrorHandler } from 'backend-tools';

import mainRouter from './routes';

let expressApp = express();
const errorHandler = new ErrorHandler(
    path.resolve(__dirname, 'logs', 'error.log')
);
expressApp.use('/', mainRouter);
expressApp.use(errorHandler.handler);
```

# ApiREST


```ts
import express from 'express';
import { ApiREST, EasySQL } from 'backend-tools';

const connectionStore = new EasySQL.Connection({
    user: 'seller',
    database: 'store',
});
const products = connectionStore.table('products', { id_name: 'id' });
const simpleToken = new SimpleToken('Secret store key');

/**
 * Set Securit middlewares
 */
const getSecurityMiddleware = ApiREST.defaultSecurity(simpleToken.verify);
/**
 *  Require valid token
 */
const authNeeded = getSecurityMiddleware(payload => true);
/**
 * Payload of the token must have { canModify: true }
 */
const canModifyPermission = getSecurityMiddleware(payload => payload.canModify);

/**
 * Enable
 *  - Find: Get /
 *  - FindOne: Get /:id
 *  - Create: Post /
 *  - Modify: Patch /:id
 *
 * The token is passed into header Authorization.
 *
 */
const productsAPI = ApiREST.createApiREST({
    find: [authNeeded, ApiREST.defaultFind(products)],
    findOne: [
      authNeeded,
      ApiREST.defaultFindOne(products)
    ]
    create: [
      canModifyPermission,
      ApiREST.defaultCreate(products)
    ],
    modify: [
      canModifyPermission,
      ApiREST.defaultModify(products)
    ]
}, 'id')

const app = express();
app.use(express.json());
app.use('/products', productsAPI);
```

More details on [docs/ApiREST.md](docs/ApiREST.md) file in the [repository](https://github.com/Galezy25/bakend-tools).