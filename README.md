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