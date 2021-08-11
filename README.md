# Backend-tools
A collection of node tools to make express server development quicker and cleaner. Contains tools for jwt generation, SQL utilities, file management, error handling and others.
# SimpleToken
```ts
  import { SimpleToken } from 'backend-tools';

  const simpleToken = new SimpleToken('SECRET KEY STRING');
```
# EasySQL
```ts
  import { EasySQL } from 'backend-tools';

  const testDBConnection = new EasySQL.Connection({
    username: 'tester',
    database: 'test'
  })

  const usersTable = testDBConnection.table('users');

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
  const errorHandler = new ErrorHandler(path.resolve(__dirname, 'logs' , 'error.log'));
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
  const productsAPI = new RESTful('/products', products)
        .find('default')
        .findOne('default')
        .create('default')
        .update('default')
        .setSecurity(simpleToken.verify, {
            create: { canModify: true },
            update: { canModify: true },
        });
  const app = express();
  app.use(express.json());
  app.use('/resources', productsAPI.router);
```