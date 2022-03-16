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

- [EasySQL](#easysql)
  - [Connection](#connection)
    - [Connection.query](#connectionquery)
    - [Connection.createTable](#connectioncreatetable)
    - [Connection.table](#connectiontable)
  - [Table](#table)
    - [TableConfig](#tableconfig)
    - [Table.find](#tablefind)
    - [Table.findOne](#tablefindone)
    - [Table.count](#tablecount)
    - [Table.create](#tablecreate)
    - [Table.replace](#tablereplace)
    - [Table.update](#tableupdate)
    - [Table.delete](#tabledelete)
  - [QueryContext](#querycontext)

## Connection

### Connection.query

```ts
type query = <T = any>(
    query: string,
    callback?: (
        error: mysql.MysqlError | null,
        results?: T,
        fields?: mysql.FieldInfo[]
    ) => void
) => Promise<T>;
```

Do a query to the database and return a `Promise` with the result of the query, if you need fields info, you can set callback arg.

### Connection.createTable

```ts
type createTable = (
    name: string,
    ...table_definition: (Column | string | Constraint)[]
) => Promise<Table>;
```

Create a table with name and definition that you set (to learn more about the table_definition see `Column` and `Constraint` section of this document), and return an Promise with the `Table` object that have been already created.

### Connection.table

```ts
type table = (name: string, config?: TableConfig) => Table;
```

Get an `Table` object of the table on database who match with the `name`.

## Table

### TableConfig

```ts
interface TableConfig {
    /**
     * Name of the primary key column
     */
    id_name?: string;
    /**
     * Table names that can be populated
     */
    tablesRelated?: string[];
    /**
     * Schema to validate a `value` object before
     * has been inserted or replaced
     */
    createSchema?: ObjectSchema<any>;
    /**
     * Schema to validate a `value` object before
     * has been update
     */
    updateSchema?: ObjectSchema<any>;
}
```

Security considerations

-   If you want to populate with another table, be sure to have been listed on `tableRelated`, otherwise it throw an error.
-   `createSchema` and `updateSchema`, it is recommended to use [yup.ObjectSchema](https://www.npmjs.com/package/yup#object), to validate values ​​before some operations, and use the [object.noUnknow()](https://www.npmjs.com/package/yup#objectnounknownonlyknownkeys-boolean--true-message-string--function-schema) function to ensure that potentially malicious properties are not injected.

### Table.find

```ts
type find = <T = any[]>(ctx: PureContext) => Promise<T>;
```

Select to many rows that match with the `PureContext` (could be builded with `QueryContext`) and return a `Promise` with the result.

### Table.findOne

```ts
type findOne = <T = any>(ctx: PureContext) => Promise<T>;
```

Select the first row that match with the `PureContext` (could be builded with `QueryContext`) and return a `Promise` with the result, if it doesn't exist throw a `code:404` error.

### Table.count

```ts
type count = <T = any[]>(ctx: PureContext) => Promise<number>;
```

Count the rows that match with the `PureContext` (could be builded with `QueryContext`) and return a `Promise` with the result.

### Table.create

```ts
type create = (
    values: { [field: string]: any } | { [field: string]: any }[],
    fields?: string[]
) => Promise<{ insertId: any; affectedRows: any }>;
```

Insert one or more rows into the table, you can declare the `fields` array to set which properties will be inserted and the order in which they will be listed.

**Example**

```ts
const result = await products.create(
    {
        name: 'Atari 2600',
        cost: 849.88,
        taxes: 84.98,
    },
    ['name', 'cost']
);
// result.insertId is 265
```

Creates a row with values

```ts
    {
        id: 265,
        name: 'Atari 2600',
        cost: 849.88
    }
```

### Table.replace

```ts
type replace = (
    values: { [field: string]: any },
    fields?: string[]
) => Promise<void>;
```

Replace one row of the table, `values` should have the id of the row to be replaced, you can declare the `fields` array to set which properties will be inserted and the order in which they will be listed.

### Table.update

```ts
type update = (
    where_ctx: WhereContext,
    values: { [field: string]: any },
    fields?: string[]
) => Promise<{ affectedRows: any }>;
```

Update rows who respect to `where_ctx` (could be builded with `QueryContext`), and set the `values` properties, you can declare the `fields` array to set which properties will be inserted and the order in which they will be listed.

**Example**

From a row:

```ts
    {
        id: 265,
        name: 'Atari 2600',
        cost: 849.88
    }
```

Modify:

```ts
products.update({ id: 265 }, { cost: 850 });
```

The new row values will be:

```ts
    {
        id: 265,
        name: 'Atari 2600',
        cost: 850
    }
```

### Table.delete

```ts
Table.delete : (where_ctx: WhereContext) => Promise<void>
```

Remove to many rows that match with the `where_ctx` (could be builded with `QueryContext`)

**Example**

```ts
    const result = await products.replace({
        id: 265
        name: 'Atari 2600',
        cost: 849.88,
        taxes: 84.98
    },['name','cost'])
```

Replace a row with values

```ts
    {
        id: 265,
        name: 'Atari 2600',
        cost: 849.88
    }
```

## QueryContext

Class that help to build PureContext objects.

Example

```ts
const query = new QueryContext()
    .field('id')
    .notEqualTo('1234567890')
    .field('date')
    .between('2025/01/01', '2025/07/01')
    .field('price')
    .lessOrEqualThan(200)
    .field('price')
    .greaterThan(10);
```

`query.getPureContext()` will be

```ts
{
    id_n: '1234567890',
    date_btw: '2025/01/01,2025/07/01',
    price_lseq: 200,
    price_gt: 10,
}
```

Also it can send it as query params with some HTTP client like [axios](https://www.npmjs.com/package/axios) to your api REST like

```ts
axios.get('/products', {
    params: queryContext.getPureContext(),
});
```

To populate with other tables it must be declared in the constructor

```ts
let ctxSaleProducts = new QueryContext(['products']);
```
