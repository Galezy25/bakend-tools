# ApiREST

- [ApiREST](#apirest)
  - [createApiREST](#createapirest)
  - [defaultSecurity](#defaultsecurity)
  - [Default handlers](#default-handlers)
    - [**defaultFind**](#defaultfind)
    - [**defaultFindOne**](#defaultfindone)
    - [**defaultCount**](#defaultcount)
    - [**defaultCreate**](#defaultcreate)
    - [**defaultReplace**](#defaultreplace)
    - [**defaultModify**](#defaultmodify)
    - [**defaultRemove**](#defaultremove)

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
const authNeeded = getSecurityMiddleware();
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

## createApiREST

```ts
type RESTfulHandler = express.RequestHandler | express.RequestHandler[];

type createApiREST = (
    handlers: {
        find?: RESTfulHandler;
        findOne?: RESTfulHandler;
        count?: RESTfulHandler;
        create?: RESTfulHandler;
        replace?: RESTfulHandler;
        modify?: RESTfulHandler;
        remove?: RESTfulHandler;
    },
    idName?: string
) => express.Router;
```

Return a Express Router with the api defined with `handlers` object, the paths are.

-   find (`GET: /`): Return an array of objects.
-   findOne (`GET: /:idName`): Return the first object with the property `idName`.
-   count (`GET: /count`): Return how many elements match with the query params.
-   create (`POST /`): Save a new object, return status 201 if successful.
-   replace (`PUT /:idName`): Remove and replace an object that matches the `idName` property.
-   modify (`PATCH /:idName`) Update some data of an object that matches the `idName` property.
-   remove (`DELETE /:idName`): Delete an object that matches the `idName` property.

In requests that needed `idName`, it should be defined.

## defaultSecurity

```ts
type defaultSecurity = (
    verifyToken: (token: string) => Promise<any>
) => (
    validateData: (payloadToMatch: Matcher) => boolean
) => express.RequestHandler;
```

defaultSecurity return a function that build distincts middlewares to verify the access token and the payload of the token also reques data has cookies, headers, query and params.

`PermissionsManager` Verifiers can be used

```ts
import { PermissionsManager, ApiREST } from 'backend-tools';

const permissionsManager = new PermissionsManager([
    'providers_create',
    'providers_update',
    'providers_delete',
    'admin_users',
]);

const getSecurityMiddleware = ApiREST.defaultSecurity(simpleToken.verify);

const authNeeded = getSecurityMiddleware();
const canCreateNeeded = getSecurityMiddleware(
    permissionsManager.getVerifier('providers_create')
);
const canUpdateNeeded = getSecurityMiddleware(
    permissionsManager.getVerifier('providers_update')
);

const providersAPI = ApiREST.createApiREST({
    find: [authNeeded, ApiREST.defaultFind(providers)],
    findOne: [authNeeded, ApiREST.defaultFindOne(providers)],
    count: [authNeeded, ApiREST.defaultCount(providers)],
    create: [canCreateNeeded, ApiREST.defaultCreate(providers)],
    replace: [canUpdateNeeded, ApiREST.defaultReplace(providers)],
    modify: [canUpdateNeeded, ApiREST.defaultModify(providers)],
});
```

## Default handlers

These handlers will do a _Find_, _FindOne_, _Create_, _Replace_, _Modify_ or _Remove_ operation to the CRUD object and will respond different values in each operation.

```ts
interface CRUD {
    id_name: string;
    find: <T = any[]>(context: { [key: string]: any }) => Promise<T>;
    findOne: <T = any>(context: { [key: string]: any }) => Promise<T>;
    count: (context: { [key: string]: any }) => Promise<number>;
    create: (
        valuesToCreate: any
    ) => Promise<{
        [key: string]: any;
        insertId: any;
    }>;
    update: (
        context: { [key: string]: any },
        valuesToUpdate: any
    ) => Promise<any>;
    replace: (valuesToReplace: any) => Promise<any>;
    delete: (context: { [key: string]: any }) => Promise<any>;
}
```

### **defaultFind**

The context of the operation will be set by the query of the request.
This handler will respond with the array resulting from the operation.

**Example:** GET `/products?_sort=cost:ASC&category_in=5,2,9` equals to:

```ts
productsCRUD.find({
    /**
     * _sort: 'cost:ASC',
     * category_in: '5,2,9'
     */
    ...req.query,
    ...req.params,
});
```

### **defaultFindOne**

The context of the operation will be set by the query and the id parameter of the request. The response of this handler will be an object resulting from the operation.

**Example:** GET `/products/265?categories_inner=this.category:categories.id,name%20AS%20category_name` equals to:

```ts
productsCRUD.findOne({
    /**
     * categories_inner: 'this.category:categories.id,name:category_name'
     */
    ...req.query,
    ...req.params, // id: 265
});
```

### **defaultCount**

The context of the operation will be set by the query of the request.
This handler will respond with total of records that matches the context.

**Example:** GET `/count?category_in=5,2,9` equals to:

```ts
productsCRUD.count({
    /**
     * category_in: '5,2,9'
     */
    ...req.query,
    ...req.params,
});
```

### **defaultCreate**

The values to be created are set by the request body.

-   If it's 1 object in the body:
    -   If it has id, the handler will respond with that object.
    -   If it doesn't have id, it will make a FindOne with the insertId property resulting from the operation.
    -   If it has no id and the result does not have the insertId property, it will respond with status 201.
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

### **defaultReplace**

The request body should have the full object that replace the current object with the same id. The handler responds with status code 200.

**Example:** PUT `/products/265` body `{ id:265, name: 'Atari 2600', cost: 850 }` equals to:

```ts
productsCRUD.replace(
    {
        ...req.body
        ...req.params, // id: 265
    },
);
```

### **defaultModify**

The request body should have only the properties that will be set and passed to the operation. The context of the operation will be set by the id parameter of the request. The handler responds with status code 200.

**Example:** PATCH `/products/265` body `{ cost: 850 }` equals to:

```ts
productsCRUD.update(
    {
        ...req.query,
        ...req.params, // id: 265
    },
    req.body
);
```

### **defaultRemove**

The context of the operation will be set by the id parameter of the request. The handler responds with status code 200.

**Example:** DELETE `/products/265` equals to:

```ts
productsCRUD.delete({
    ...req.query,
    ...req.params, // id: 265
});
```
