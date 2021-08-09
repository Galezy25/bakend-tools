import Column from './column';
import Connection from './connection';
import { Constraint } from './constraint';

export default class Table {
    /* 
        Where patterns
    */
    private RE_in = new RegExp(/^\S+_in$/); // IN <val1>,<val2>,<val3>,....,<valN>
    private RE_nin = new RegExp(/^\S+_nin$/); // NOT IN <val1>,<val2>,<val3>,....,<valN>
    private RE_n = new RegExp(/^\S+_n$/); // <> <value>
    private RE_ls = new RegExp(/^\S+_ls$/); // < <value>
    private RE_lseq = new RegExp(/^\S+_lseq$/); // <= <value>
    private RE_gt = new RegExp(/^\S+_gt$/); // > <value>
    private RE_gteq = new RegExp(/^\S+_gteq$/); // >= <value>
    private RE_btw = new RegExp(/^\S+_btw$/); // BETWEEN <value1>,<value2>
    private RE_like = new RegExp(/^\S+_like$/); // LIKE <value>

    /* 
        populate relation pattern 
        <table_name>_<'inner' | 'left' | 'right' | 'full'>=<field>:<field> 
    */
    private RE_join = new RegExp(
        /^(\S+_inner)|(\S+_left)|(\S+_right)|(\S+_full)$/
    );

    private _con: Connection;
    private _name: string;

    /**
     * Name of the table
     */
    public get name() {
        return this._name;
    }

    /**
     * Current datetime with format YYYY-MM-DD hh:mm:ss
     */
    public get CURRENT_TIMESTAMP() {
        return this._con.CURRENT_TIMESTAMP;
    }

    /**
     * @summary
     * Parse a Date to a format 'YYYY-MM-DD hh:mm:ss'
     * @param date Date
     * @returns string with format 'YYYY-MM-DD hh:mm:ss'
     */
    public getDateTimeFormat(date: Date) {
        return (
            date.getFullYear() +
            '-' +
            (date.getMonth() + 1 < 10
                ? '0' + (date.getMonth() + 1)
                : date.getMonth() + 1) +
            '-' +
            (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) +
            ' ' +
            date.toLocaleTimeString()
        );
    }

    /**
     * @summary
     * Parse a Date to a format 'YYYY/MM/DD'
     * @param date Date
     * @returns string with format 'YYYY/MM/DD'
     */
    public getDateFormat(date: Date) {
        return (
            date.getFullYear() +
            '/' +
            (date.getMonth() + 1 < 10
                ? '0' + (date.getMonth() + 1)
                : date.getMonth() + 1) +
            '/' +
            (date.getDate() < 10 ? '0' + date.getDate() : date.getDate())
        );
    }

    constructor(con: Connection, name: string) {
        this._con = con;
        this._name = name;
    }

    /**
     * @summary
     * Add a column or field to this table
     *
     * @param column_def Definition of the column to add
     *
     * @returns Promise\<void\>
     */
    public addColumn(column_def: string | Column) {
        return this._con.query(
            `ALTER TABLE ${this._name} ADD COLUMN ${column_def.toString()}`
        );
    }

    /**
     * @summary
     * Modify a column or field of this table
     *
     * @param column_def Definition of the column already changed, the name must be equal to the column to modify
     *
     * @returns Promise\<void\>
     */
    public modifyColumn(column_def: string | Column) {
        return this._con.query(
            `ALTER TABLE ${this._name} MODIFY COLUMN ${column_def.toString()}`
        );
    }

    /**
     * @summary
     * Change a column or field of this table
     *
     * @param old_name Name of the column to change
     *
     * @param column_def Definition of the column already changed
     *
     * @returns Promise\<void\>
     */
    public changeColumn(old_name: string, column_def: string | Column) {
        return this._con.query(
            `ALTER TABLE ${
                this._name
            } CHANGE COLUMN ${old_name} ${column_def.toString()}`
        );
    }

    /**
     * @summary
     * Rename a column of this table
     *
     * @param old_name string
     * @param new_name string
     *
     * @returns Promise<void>
     */
    public renameColumn(old_name: string, new_name: string) {
        return this._con.query(
            `ALTER TABLE ${this._name} RENAME COLUMN ${old_name} TO ${new_name}`
        );
    }

    /**
     * @summary
     * Drop or delete a column of this table
     *
     * @param column_name string
     *
     * @returns Promise<void>
     */
    public dropColumn(column_name: string) {
        return this._con.query(
            `ALTER TABLE ${this._name} DROP COLUMN ${column_name}`
        );
    }

    /**
     * @summary
     * Add a constraint to this table
     *
     * @param constraint_def Definition of the constraint to add
     *
     * @returns Promise\<void\>
     */
    public addConstraint(constraint_def: Constraint | string) {
        return this._con.query(
            `ALTER TABLE ${this._name} ADD ${constraint_def.toString()}`
        );
    }

    /**
     * Drop or delete a constraint of this table
     *
     * @param constraint_name string
     *
     * @returns Promise\<void\>
     */
    public dropConstraint(constraint_name: string) {
        return this._con.query(
            `ALTER TABLE ${this._name} DROP CONSTRAINT ${constraint_name}`
        );
    }

    /**
     * @summary
     * Get an Array of rows with respect to ctx.
     *
     * @param ctx
     * Set the order of the array will get it
     *  - Sorted ascending by the field_name
     *  ```ts
     *      _sort: `${field_name}:ASC`
     *  ```
     *  - Sorted descending by the field_name
     *  ```ts
     *      _sort: `${field_name}:DESC`
     *  ```
     *
     * Set how many rows to get
     * ```ts
     *   _limit: number_of_rows
     * ```
     *
     * Set the index who start to get it
     * ```ts
     *   // The index of the first element is 0, and the last is length - 1
     *   _start: index
     * ```
     *
     * Set wich fields will get it
     * ```ts
     *   _fields: `${field_1},${field_2},${field_3},${field_n}`
     * ```
     *
     * Set filter values
     *
     *  - Rows with field_name equal to value
     *  ```ts
     *      [field_name]: value
     *  ```
     *
     *  - Rows with field_name not equal to value
     *  ```ts
     *      [field_name + '_n']: value
     *  ```
     *
     *  - Rows with field_name must be equal to val_1, val_2 or val_3
     *  ```ts
     *      [field_name + '_in']: `${val_1},${val_2},${val_3}`
     *  ```
     *
     *  - Rows with field_name must not be equal to val_1, val_2 or val_3
     *  ```ts
     *      [field_name + '_nin']: `${val_1},${val_2},${val_3}`
     *  ```
     *
     *  - Rows with field_name greater than value
     *  ```ts
     *      [field_name + '_gt']: value
     *  ```
     *
     *  - Rows with field_name greater than or equal to value
     *  ```ts
     *      [field_name + '_gteq']: value
     *  ```
     *
     *  - Rows with field_name less than value
     *  ```ts
     *      [field_name + '_ls']: value
     *  ```
     *
     *  - Rows with field_name less than or equal to value
     *  ```ts
     *      [field_name + '_lseq']: value
     *  ```
     *
     *  - Rows with field_name math with the pattern
     *  ```ts
     *      [field_name + '_like']: pattern
     *  ```
     *
     *  - Rows with field_name is between value_1 and value_2
     *  ```ts
     *      [field_name + '_btw']:  `${value_1}:${value_2}`
     *  ```
     *
     * Populate relation
     *
     * - Inner join table_name on field_1 = field_2
     * ```ts
     *      [table_name + '_inner']:  `${field_1}:${field_2}`
     * ```
     *
     * - Left join table_name on field_1 = field_2
     * ```ts
     *      [table_name + '_left']:  `${field_1}:${field_2}`
     * ```
     *
     * - Right join table_name on field_1 = field_2
     * ```ts
     *      [table_name + '_right']:  `${field_1}:${field_2}`
     * ```
     *
     * - Full join table_name on field_1 = field_2
     * ```ts
     *      [table_name + '_full']:  `${field_1}:${field_2}`
     * ```
     *
     * You can use 'this' to do a reference to this table example.
     * ```ts
     *      {
     *          _fields: 'this.username,this.name,teams.name AS team_name'
     *          teams_left: 'this.team:teams.id'
     *      }
     * ```
     *
     * @param fields (Optional)
     * Set wich fields will get it, into a string array, example
     *  ```ts
     *    ['id','name','email']
     *  ```
     *
     * @returns Promise\<T\> T must be an Array
     */
    public find<T = any[]>(
        ctx: {
            [whereOrJoinPattern: string]: any;
            _sort?: string;
            _limit?: number;
            _start?: number;
            _fields?: string;
        },
        fields: string[] = ['*']
    ) {
        if (ctx._fields) {
            fields = ctx._fields.split(',');
        }

        let query =
            ' SELECT ' + fields.join(', ') + ' FROM ' + this._name + ' this ';
        let joins = this.getRelationTables(ctx);

        if (joins.length > 0) {
            query += joins
                .map(join => {
                    return (
                        ' ' +
                        join.type +
                        ' JOIN ' +
                        join.table +
                        ' ON ' +
                        join.relation[0] +
                        '=' +
                        join.relation[1]
                    );
                })
                .join(' ');
        }
        query += this.getWhere(ctx);

        if (ctx._sort !== undefined) {
            let auxSort = ctx._sort.split(':');
            query +=
                ' ORDER BY ' +
                auxSort[0] +
                ' ' +
                (auxSort.length === 2 ? auxSort[1] : ' ASC ');
        }

        if (ctx._limit !== undefined || ctx._start !== undefined) {
            query +=
                ' LIMIT ' +
                (ctx._start ? ctx._start + ', ' : '') +
                (ctx._limit ? ctx._limit : '18446744073709551615') +
                ' ';
        }

        query += '; ';

        return this._con.query<T>(query);
    }

    /**
     * @summary
     * Get the first row who respect to ctx.
     * @param ctx
     * Set filter values
     *
     * - Rows with field_name equal to value
     * ```ts
     *      [field_name]: value
     * ```
     *
     * - Rows with field_name not equal to value
     * ```ts
     *      [field_name + '_n']: value
     * ```
     *
     * - Rows with field_name must be equal to val_1, val_2 or val_3
     * ```ts
     *      [field_name + '_in']: `${val_1},${val_2},${val_3}`
     * ```
     *
     * - Rows with field_name must not be equal to val_1, val_2 or val_3
     * ```ts
     *      [field_name + '_nin']: `${val_1},${val_2},${val_3}`
     * ```
     *
     * - Rows with field_name greater than value
     * ```ts
     *      [field_name + '_gt']: value
     * ```
     *
     * - Rows with field_name greater than or equal to value
     * ```ts
     *      [field_name + '_gteq']: value
     * ```
     *
     * - Rows with field_name less than value
     * ```ts
     *      [field_name + '_ls']: value
     * ```
     *
     * - Rows with field_name less than or equal to value
     * ```ts
     *      [field_name + '_lseq']: value
     * ```
     *
     * - Rows with field_name math with the pattern
     * ```ts
     *      [field_name + '_like']: pattern
     * ```
     *
     * - Rows with field_name is between value_1 and value_2
     * ```ts
     *      [field_name + '_btw']:  `${value_1}:${value_2}`
     * ```
     *
     * Populate relation
     *
     * - Inner join table_name on field_1 = field_2
     * ```ts
     *      [table_name + '_inner']:  `${field_1}:${field_2}`
     * ```
     *
     * - Left join table_name on field_1 = field_2
     * ```ts
     *      [table_name + '_left']:  `${field_1}:${field_2}`
     * ```
     *
     * - Right join table_name on field_1 = field_2
     * ```ts
     *      [table_name + '_right']:  `${field_1}:${field_2}`
     * ```
     *
     * - Full join table_name on field_1 = field_2
     * ```ts
     *      [table_name + '_full']:  `${field_1}:${field_2}`
     * ```
     *
     * You can use 'this' to do a reference to this table example.
     * ```ts
     *      {
     *          _fields: 'this.username,this.name,teams.name AS team_name'
     *          teams_left: 'this.team:teams.id'
     *      }
     * ```
     *
     * @param fields (Optional)
     * - Set wich fields will get it, into a string array, example
     * ```
     *      ['id','name','email']
     * ```
     * @returns
     * Promise\<T\> A single object with T type,
     * if not found rejects
     * ```
     *  {
     *      code : 404,
     *      message: 'Not Found'
     *  }
     * ```
     */
    public findOne(
        ctx: {
            [whereOrJoinPattern: string]: any;
            _fields?: string;
        },
        fields: string[] = ['*']
    ) {
        if (ctx._fields) {
            fields = ctx._fields.split(',');
        }

        let query = ' SELECT ' + fields.join(',') + ' ';
        query += ' FROM ' + this._name + ' this ';

        let joins = this.getRelationTables(ctx);
        if (joins.length > 0) {
            query += joins
                .map(join => {
                    return (
                        ' ' +
                        join.type +
                        ' JOIN ' +
                        join.table +
                        ' ON ' +
                        join.relation[0] +
                        '=' +
                        join.relation[1]
                    );
                })
                .join(' ');
        }

        query += this.getWhere(ctx);

        return new Promise<any>((resolve, reject) => {
            this._con
                .query<any[]>(query)
                .then(qRes => {
                    if (qRes.length > 0) {
                        resolve(qRes[0]);
                    } else {
                        reject({ code: 404, message: 'Not Found' });
                    }
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    /**
     * @summary
     * Create 1 or more rows into the table
     *
     * @param values
     * It can be a Object or an Array of objects to insert into the table
     * @param fields
     * Indicate wich fields will set it, into a string array, example
     *  ```
     *    ['name','email']
     *  ```
     *
     * @example
     *  ```
     *      const result = await products.create({
     *          name: 'Atari 2600',
     *          cost: 849.88,
     *          taxes: 84.98
     *      },['name','cost'])
     *
     *      // result.insertId is 265
     *  ```
     *  Creates a row whith values
     *  ```
     *      {
     *          id: 265,
     *          name: 'Atari 2600',
     *          cost: 849.88
     *      }
     *  ```
     *
     * @returns
     * Promise\<{
     *  insertId: any,
     *  affectedRows: any[]
     * }\>
     */
    public create(
        values: { [field: string]: any } | { [field: string]: any }[],
        fields: string[] = Object.getOwnPropertyNames(
            values instanceof Array ? values[0] : values
        ).filter(prop =>
            values instanceof Array ? true : values[prop] !== undefined
        )
    ) {
        let template = fields.map(field => '{{' + field + '}}').join(', ');
        let query =
            ' INSERT INTO ' +
            this._name +
            ' (' +
            fields.join(',') +
            ') VALUES ';
        if (values instanceof Array) {
            query +=
                values
                    .map(
                        value =>
                            '(' + this._con.secureQuery(template, value) + ')'
                    )
                    .join(',') + ';';
        } else {
            query += '(' + this._con.secureQuery(template, values) + ');';
        }
        return this._con.query<{ insertId: any; affectedRows: any }>(query);
    }

    /**
     * @summary
     * Update rows who respect to where_ctx
     *
     * Example:
     *
     *  From a row:
     *  ```ts
     *      {
     *          id: 265,
     *          name: 'Atari 2600',
     *          cost: 849.88
     *      }
     *  ```
     *
     *  Modify:
     *  ```ts
     *      products.update({ cost: 850 },{ id: 265 })
     *  ```
     *
     *  The new row values will be:
     *  ```ts
     *      {
     *          id: 265,
     *          name: 'Atari 2600',
     *          cost: 850
     *      }
     *  ```
     *
     * @param values
     * Is a object with properties that will be udated.
     *
     * @param where_ctx
     * Set filter values
     *
     *  - Rows with field_name equal to value
     *  ```ts
     *      [field_name]: value
     *  ```
     *
     *  - Rows with field_name not equal to value
     *  ```ts
     *      [field_name + '_n']: value
     *  ```
     *
     *  - Rows with field_name must be equal to val_1, val_2 or val_3
     *  ```ts
     *      [field_name + '_in']: `${val_1},${val_2},${val_3}`
     *  ```
     *
     *  - Rows with field_name must not be equal to val_1, val_2 or val_3
     *  ```ts
     *      [field_name + '_nin']: `${val_1},${val_2},${val_3}`
     *  ```
     *
     *  - Rows with field_name greater than value
     *  ```ts
     *      [field_name + '_gt']: value
     *  ```
     *
     *  - Rows with field_name greater than or equal to value
     *  ```ts
     *      [field_name + '_gteq']: value
     *  ```
     *
     *  - Rows with field_name less than value
     *  ```ts
     *      [field_name + '_ls']: value
     *  ```
     *
     *  - Rows with field_name less than or equal to value
     *  ```ts
     *      [field_name + '_lseq']: value
     *  ```
     *
     *  - Rows with field_name math with the pattern
     *  ```ts
     *      [field_name + '_like']: pattern
     *  ```
     *
     *  - Rows with field_name is between value_1 and value_2
     *  ```ts
     *      [field_name + '_btw']:  `${value_1}:${value_2}`
     *  ```
     *
     * @param fields (Optional)
     * Indicate wich fields will set it, into a string array, example
     *  ```
     *    ['name','email']
     *  ```
     * @returns Promise
     */
    public update(
        values: { [field: string]: any },
        where_ctx: { [wherePattern: string]: any },
        fields: string[] = Object.getOwnPropertyNames(values).filter(
            prop => values[prop] !== undefined
        )
    ) {
        let query =
            ' UPDATE ' +
            this._name +
            ' SET ' +
            fields.map(field => field + '={{' + field + '}}').join(', ') +
            ' ' +
            this.getWhere(where_ctx);
        return this._con.query(this._con.secureQuery(query, values));
    }

    /**
     * @summary
     * Delete rows who respect to where_ctx
     * @param where_ctx
     * Set filter values
     *
     *  - Rows with field_name equal to value
     *  ```ts
     *      [field_name]: value
     *  ```
     *
     *  - Rows with field_name not equal to value
     *  ```ts
     *      [field_name + '_n']: value
     *  ```
     *
     *  - Rows with field_name must be equal to val_1, val_2 or val_3
     *  ```ts
     *      [field_name + '_in']: `${val_1},${val_2},${val_3}`
     *  ```
     *
     *  - Rows with field_name must not be equal to val_1, val_2 or val_3
     *  ```ts
     *      [field_name + '_nin']: `${val_1},${val_2},${val_3}`
     *  ```
     *
     *  - Rows with field_name greater than value
     *  ```ts
     *      [field_name + '_gt']: value
     *  ```
     *
     *  - Rows with field_name greater than or equal to value
     *  ```ts
     *      [field_name + '_gteq']: value
     *  ```
     *
     *  - Rows with field_name less than value
     *  ```ts
     *      [field_name + '_ls']: value
     *  ```
     *
     *  - Rows with field_name less than or equal to value
     *  ```ts
     *      [field_name + '_lseq']: value
     *  ```
     *
     *  - Rows with field_name math with the pattern
     *  ```ts
     *      [field_name + '_like']: pattern
     *  ```
     *
     *  - Rows with field_name is between value_1 and value_2
     *  ```ts
     *      [field_name + '_btw']:  `${value_1}:${value_2}`
     *  ```
     *
     * @returns Promise
     */
    public delete(where_ctx: { [field: string]: any }) {
        let query =
            ' DELETE FROM ' + this._name + ' ' + this.getWhere(where_ctx);
        return this._con.query(query);
    }

    private getWhere(ctx: { [field: string]: any }) {
        let propsWhere = Object.getOwnPropertyNames(ctx);
        propsWhere = propsWhere.filter(prop => {
            return (
                prop !== '_sort' &&
                prop !== '_limit' &&
                prop !== '_start' &&
                prop !== '_fields' &&
                !this.RE_join.test(prop)
            );
        });

        propsWhere = propsWhere.map(prop => {
            if (this.RE_n.test(prop)) {
                return prop.replace('_n', '') + ' <> ' + this.escape(ctx[prop]);
            } else if (this.RE_gt.test(prop)) {
                return prop.replace('_gt', '') + ' > ' + this.escape(ctx[prop]);
            } else if (this.RE_gteq.test(prop)) {
                return (
                    prop.replace('_gteq', '') + ' >= ' + this.escape(ctx[prop])
                );
            } else if (this.RE_ls.test(prop)) {
                return prop.replace('_ls', '') + ' < ' + this.escape(ctx[prop]);
            } else if (this.RE_lseq.test(prop)) {
                return (
                    prop.replace('_lseq', '') + ' <= ' + this.escape(ctx[prop])
                );
            } else if (this.RE_like.test(prop)) {
                return (
                    prop.replace('_like', '') +
                    ' LIKE ' +
                    this.escape(ctx[prop])
                );
            } else if (this.RE_nin.test(prop)) {
                return (
                    prop.replace('_nin', '') +
                    ' NOT IN (' +
                    ctx[prop]
                        .split(',')
                        .map((val: any) => this.escape(val))
                        .join(',') +
                    ')'
                );
            } else if (this.RE_in.test(prop)) {
                return (
                    prop.replace('_in', '') +
                    ' IN (' +
                    ctx[prop]
                        .split(',')
                        .map((val: any) => this.escape(val))
                        .join(',') +
                    ')'
                );
            } else if (this.RE_btw.test(prop)) {
                let btwValues = ctx[prop].split(',');
                return (
                    prop.replace('_btw', '') +
                    ' BETWEEN ' +
                    this.escape(btwValues[0]) +
                    ' AND ' +
                    this.escape(btwValues[1])
                );
            } else {
                return prop + ' = ' + this.escape(ctx[prop]);
            }
        });

        if (propsWhere.length > 0) {
            return ' WHERE ' + propsWhere.join(' AND ') + ' ';
        } else {
            return '';
        }
    }

    private getRelationTables(ctx: { [table_join: string]: any }) {
        return Object.getOwnPropertyNames(ctx)
            .filter(prop => this.RE_join.test(prop))
            .map(prop => {
                let table = prop.split('_');
                let type = table.splice(table.length - 1, 1)[0];
                let relation = ctx[prop].split(':');
                return {
                    table: table.join('_'),
                    type: type.toUpperCase(),
                    relation,
                };
            });
    }

    public get escape() {
        return this._con.escape;
    }
}
