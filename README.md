# Overview

This is a collection of node tools to make express server development quicker and cleaner. Contains tools for jwt generation, SQL utilities, file management, error handling and others.

- [Overview](#overview)
- [SimpleToken](#simpletoken)
- [PermissionsManager](#permissionsmanager)
- [EasySQL](#easysql)
- [AdminFile](#adminfile)
- [ErrorHandler](#errorhandler)
- [RESTful](#restful)
  - [Default handlers](#default-handlers)
    - [**Find**](#find)
    - [**FindOne**](#findone)
    - [**Create**](#create)
    - [**Update**](#update)
    - [**Delete**](#delete)

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

Bcrypt algorithm is used to have better security, set the _saltRound_ or _cost factor_  (10 by default) into the instance of a _SimpleToken_ object.

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

# EasySQL

```ts
  import { EasySQL } from 'backend-tools';

  const testDBConnection = new EasySQL.Connection({
    username: 'tester',
    database: 'test'
  })

  /**
   * Table object implements CRUD operation like Find, FindOne, Create, Update, Delete
   */
  const usersTable = testDBConnection.table('users');

  /**
   * Equals to "SELECT * FROM users this WHERE team IN ('A','Y','E','X','B') ORDER BY team ASC ;" query
   */
  usersTable.find({
    _sort: 'team:ASC'
    team_in: 'A,Y,E,X,B'
  })
  .then(users => {
    console.log(users)
  })
```

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

# RESTful

```ts
import express from 'express';
import { EasySQL, SimpleToken, RESTful } from 'backend-tools';

const connectionStore = new EasySQL.Connection({
    user: 'seller',
    database: 'store',
});
const products = connectionStore.table('products', 'id');
const simpleToken = new SimpleToken('Secret store key');

/**
 * Enable
 *  - Find: Get /products
 *  - FindOne: Get /products/:id
 *  - Create: Post /products
 *  - Update: Put /products/:id
 *
 * Default security middleware on:
 *  - Find: Require valid token.
 *  - FindOne: Require valid token.
 *  - Create: Payload of the token must have { canModify: true }
 *  - Update: Payload of the token must have { canModify: true }
 *
 * The token is passed into header Authorization.
 *
 */
const productsAPI = new RESTful('/products', products)
    .find('default')
    .findOne('default')
    .create('default')
    .update('default')
    .setSecurity(simpleToken.verify, {
        find: {},
        findOne: {},
        create: payload => {
            return payload.canModify;
        },
        update: { canModify: true },
    });

const app = express();
app.use(express.json());
app.use(productsAPI.router);
```

[PermissionsManager](#permissionsmanager) Verifiers can be used

```ts
import { PermissionsManager } from 'backend-tools';

const permissionsManager = new PermissionsManager([
    'providers_create',
    'providers_update',
    'providers_delete',
    'admin_users',
]);

const canCreateVerify = permissionsManager.getVerifier('providers_create');
const canUpdateVerify = permissionsManager.getVerifier('providers_update');

const providersAPI = new RESTful('/providers', providers)
    .find('default')
    .findOne('default')
    .create('default')
    .update('default')
    .setSecurity(simpleToken.verify, {
        find: {},
        findOne: {},
        create: canCreateVerify,
        update: canUpdateVerify,
    });
```

## Default handlers

These handlers will do a _Find_, _FindOne_, _Create_, _Update_ or _Delete_ operation to the CRUD object, declared in the instance of the RESTful object and will respond different values in each operation.

### **Find**

The context of the operation will be set by the query of the request.
This handler will respond with the array resulting from the operation.

**Example:** GET `/products?_sort=cost:ASC&category_in=5,2,9` equals to:

```ts
productsCRUD.find({ _sort: 'cost:ASC', category_in: '5,2,9' });
```

### **FindOne**

The context of the operation will be set by the query and the id parameter of the request. The response of this handler will be an object resulting from the operation.

**Example:** GET `/products/265?category_inner=this.category:categories.id&_fields=this.*,categories.name%20AS%20category_name` equals to:

```ts
productsCRUD.findOne({
    [productsCRUD.id_name]: req.params.id, // id: 265
    _fields: 'this.*,categories.name AS category_name',
    category_inner: 'this.category:categories.id',
});
```

### **Create**

The values to be created are set by the request body.

-   If it's 1 object in the body:
    -   If it has id, the handler will respond with that object.
    -   If it doesn't have id, it will make a FindOne with the insertId property resulting from the operation.
    -   If it has no id and the result does not have the insertId property, it will respond with status 200.
-   If the body is an array, it will respond with the result of the operation.

**Example:** POST `/products` body `{ name: 'Atari 2600', cost: 849.88 }` equals to:

```ts
productsCRUD.create(req.body);
/**
 * Result:
 * {
 *  insertId: 265
 * }
 */
```

So it will respond with the result of:

```ts
productsCRUD.findOne({ [productsCRUD.id_name]: 265 });
```

### **Update**

The request body should have only the properties that will be set and passed to the operation. The context of the operation will be set by the id parameter of the request. The handler responds with status code 200.

**Example:** PUT `/products/265` body `{ cost: 850 }` equals to:

```ts
productsCRUD.create(
    {
        [productsCRUD.id_name]: req.params.id, // id: 265
    },
    req.body
);
```

### **Delete**

The context of the operation will be set by the id parameter of the request. The handler responds with status code 200.

**Example:** DELETE `/products/265` equals to:

```ts
productsCRUD.delete({
    [productsCRUD.id_name]: req.params.id, // id: 265
});
```
