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