# Backend-tools
A collection of node tools to make express server development quicker and cleaner. Contains tools for jwt generation, SQL utilities, file management, error handling and others.
# SimpleToken
```ts
  import { SimpleToken } from 'backend-tools';

  const simpleToken = new SimpleToken('SECRET KEY STRING');
  const payload = {
    user: 265,
    permissions: 'af8'
  };

  /**
   * Create a token that expires in 300 seconds (5 minutes)
   */
  const token= simpleToken.sign(payload, 300);

  simpleToken.verify(token)
  .then(payloadIntoToken => {

    /**
     * Must be:
     * {
     *  user: 265,
     *  permissions: 'af8'
     * }
     */
    console.log(payloadIntoToken)
  })
  .catch(err => {
    // Invalid token
  })
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

  const adminFile = new AdminFile( AdminFile.path.resolve(__dirname, 'adminfile') );

  adminFile.makeDir('logs');

  adminFile.appendFile('logs', 'access.log', `
  <-------------------------------------------->
  Start at ${ new Date().toLocaleString() }
  `)
```
# ErrorHandler
```ts
  import express from 'express';
  import path from 'path';

  import { ErrorHandler } from 'backend-tools';
  
  import mainRouter from './routes';

  let expressApp = express();
  const errorHandler = new ErrorHandler( path.resolve(__dirname, 'logs' , 'error.log') );
  expressApp.use('/', mainRouter);
  expressApp.use( errorHandler.handler );
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
            create: { canModify: true },
            update: { canModify: true },
        });
  const app = express();
  app.use( express.json() );
  app.use( productsAPI.router );
```
## Default handlers
These handlers will do a *Find*, *FindOne*, *Create*, *Update* or *Delete* operation to the CRUD object, declared in the instance of the RESTful object and will respond different values in each operation.

### **Find** 
The context of the operation will be set by the query of the request.
This handler will respond with the array resulting from the operation.

#### **Example:** GET `/products?_sort=cost:ASC&category_in=5,2,9` equals to: 
```ts
productsCRUD.find({ _sort: 'cost:ASC', category_in: '5,2,9' })
```
  
### **FindOne**
The context of the operation will be set by the query and the id parameter of the request. The response of this handler will be an object resulting from the operation.

#### **Example:** GET `/products/265?category_inner=this.category:categories.id&_fields=this.*,categories.name%20AS%20category_name` equals to:
```ts
productsCRUD.findOne({ 
  [productsCRUD.id_name]: req.params.id, // id: 265
  _fields: 'this.*,categories.name AS category_name', 
  category_inner: 'this.category:categories.id'
})
```

### **Create**
The values to be created are set by the request body. 
  - If it's 1 object in the body: 
    - If it has id, the handler will respond with that object.
    - If it doesn't have id, it will make a FindOne with the insertId property resulting from the operation.
    - If it has no id and the result does not have the insertId property, it will respond with status 200.
  - If the body is an array, it will respond with the result of the operation.
#### **Example:** POST `/products` body `{ name: 'Atari 2600', cost: 849.88 }` equals to:
```ts
productsCRUD.create(req.body)
/**
 * Result:
 * {
 *  insertId: 265
 * }
*/
```
So it will respond with the result of:
```ts
productsCRUD.findOne({ [productsCRUD.id_name]: 265 })
```
### **Update**
The request body should have only the properties that will be set and passed to the operation. The context of the operation will be set by the id parameter of the request. The handler responds with status code 200.
#### **Example:** PUT `/products/265` body `{ cost: 850 }` equals to:
```ts
productsCRUD.create({ 
  [productsCRUD.id_name]: req.params.id // id: 265
}, req.body)
```

### **Delete**
The context of the operation will be set by the id parameter of the request. The handler responds with status code 200.
#### **Example:** DELETE `/products/265` equals to:
```ts
productsCRUD.delete({ 
  [productsCRUD.id_name]: req.params.id // id: 265 
})
```
