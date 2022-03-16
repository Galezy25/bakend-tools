import { ObjectSchema } from 'yup';

import CRUD from '../crud.interface';
import Column from './column';
import Connection from './connection';
import { Constraint } from './constraint';
import { PureContext, Value } from './pure.context';
import QueryContext from './query.context';

interface WhereContext {
    [filter: string]: Value | Value[];
}

export interface TableConfig {
    /**
     * Name of the primary key column
     */
    id_name?: string;
    /**
     * Table names that can be `JOIN`
     */
    tablesRelated?: string[];
    /**
     * Schema to validate a value object before
     * have been inserted or replaced
     */
    createSchema?: ObjectSchema<any>;
    /**
     * Schema to validate a value object before
     * have been update
     */
    updateSchema?: ObjectSchema<any>;
}

export class Table implements CRUD {
    private _con: Connection;
    private _name: string;
    private _id_name?: string;
    private _tablesRelated: string[] = [];
    public readonly createSchema?: ObjectSchema<any>;
    public readonly updateSchema?: ObjectSchema<any>;

    public get id_name() {
        if (this._id_name) return this._id_name;

        throw new Error('id_name no defined');
    }

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
        return this._con.getDateTimeFormat(date);
    }

    /**
     * @summary
     * Parse a Date to a format 'YYYY/MM/DD'
     * @param date Date
     * @returns string with format 'YYYY/MM/DD'
     */
    public getDateFormat(date: Date) {
        return this._con.getDateFormat(date);
    }

    constructor(con: Connection, name: string, config?: TableConfig) {
        this._con = con;
        this._name = name;
        if (config) {
            this._id_name = config.id_name;
            this._tablesRelated = config.tablesRelated || [];
            this.createSchema = config.createSchema;
            this.updateSchema = config.updateSchema;
        }
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

    private getSelectQuery(ctx: PureContext) {
        let queryContext = new QueryContext(this._tablesRelated).setPureContext(
            ctx
        );
        let query = `SELECT ${queryContext.getSelectedFields()} FROM ${
            this._name
        } this ${queryContext.getRelations()}`;
        query = query.trim();
        query += this.getWhere(queryContext);
        query += ` ${queryContext.getOrderSentence()} ${queryContext.getLimitSentence()}`;
        query = `${query.trim()};`;
        return query;
    }

    /**
     * @summary
     * Get an Array of rows with respect to ctx.
     *
     * @param ctx {@link PureContext}
     *
     * @returns Promise\<T\> T must be an Array
     */
    public find<T = any[]>(ctx: PureContext) {
        return this._con.query<T>(this.getSelectQuery(ctx));
    }

    /**
     * @summary
     * Get the first row who respect to ctx.
     * @param ctx {@link PureContext}
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
    public async findOne(ctx: PureContext) {
        let query = this.getSelectQuery(ctx);
        let qRes = await this._con.query<any[]>(query);
        if (qRes.length) return qRes[0];

        const error = new Error('Not Found');
        (error as any).code = 404;
        throw error;
    }

    /**
     * @summary
     * Count rows who respect to where_ctx
     * @param ctx {@link PureContext}
     * @returns Promise<number>
     */
    public async count(ctx: WhereContext = {}) {
        let queryContext = new QueryContext(this._tablesRelated).setPureContext(
            ctx
        );
        let query = `SELECT COUNT(*) as count FROM ${
            this._name
        } this ${queryContext.getRelations()}`;
        query = query.trim();
        query += this.getWhere(queryContext);
        const queryRes = await this._con.query<{ count: number }[]>(query);
        return queryRes[0].count;
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
     *  ```ts
     *      const result = await products.create({
     *          name: 'Atari 2600',
     *          cost: 849.88,
     *          taxes: 84.98
     *      },['name','cost'])
     *
     *      // result.insertId is 265
     *  ```
     *  Creates a row with values
     *  ```ts
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
     *  affectedRows: any
     * }\>
     */
    public async create(
        values: { [field: string]: any } | { [field: string]: any }[],
        fields: string[] = Object.getOwnPropertyNames(
            values instanceof Array ? values[0] : values
        ).filter(prop =>
            values instanceof Array ? true : values[prop] !== undefined
        )
    ) {
        let toInsert: any[] = values instanceof Array ? values : [values];

        if (this.createSchema) {
            try {
                toInsert = toInsert.map(value => {
                    return this.createSchema!.validateSync(value);
                });
            } catch (err) {
                (err as any).code = 400;
                throw err;
            }
            const postSchemaFields = Object.getOwnPropertyNames(toInsert[0]);
            fields = fields.filter(field => postSchemaFields.includes(field));
        }

        let template = fields.map(field => '{{' + field + '}}').join(', ');
        let query =
            'INSERT INTO ' + this._name + ' (' + fields.join(',') + ') VALUES ';

        query +=
            toInsert
                .map(
                    value => '(' + this._con.secureQuery(template, value) + ')'
                )
                .join(',') + ';';

        return await this._con.query<{ insertId: any; affectedRows: any }>(
            query
        );
    }

    /**
     * @summary
     * Replace a rows into the table
     *
     * @param value
     * Object with the new data to replace
     * @param fields
     * Indicate wich fields will set it, into a string array, example
     *  ```
     *    ['name','email']
     *  ```
     *
     * @example
     *  ```ts
     *      const result = await products.replace({
     *          id: 265
     *          name: 'Atari 2600',
     *          cost: 849.88,
     *          taxes: 84.98
     *      },['name','cost'])
     *
     *  ```ts
     *  Replace a row with values
     *  ```
     *      {
     *          id: 265,
     *          name: 'Atari 2600',
     *          cost: 849.88
     *      }
     *  ```
     *
     * @returns
     * Promise\<void\>
     */
    public async replace(
        values: { [field: string]: any },
        fields: string[] = Object.getOwnPropertyNames(values)
    ) {
        if (this.createSchema) {
            try {
                values = this.createSchema.validateSync(values);
            } catch (err) {
                (err as any).code = 400;
                throw err;
            }
            const postSchemaFields = Object.getOwnPropertyNames(values);
            fields = fields.filter(field => postSchemaFields.includes(field));
        }

        let template = fields.map(field => '{{' + field + '}}').join(', ');
        let query =
            'REPLACE INTO ' +
            this._name +
            ' (' +
            fields.join(',') +
            ') VALUES ';

        query += '(' + this._con.secureQuery(template, values) + ');';

        return await this._con.query(query);
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
     *      products.update({ id: 265 },{ cost: 850 })
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
     * @param where_ctx {@link PureContext}
     * @param fields (Optional)
     * Indicate wich fields will set it, into a string array, example
     *  ```
     *    ['name','email']
     *  ```
     * @returns Promise
     */
    public async update(
        where_ctx: WhereContext,
        values: { [field: string]: any },
        fields: string[] = Object.getOwnPropertyNames(values).filter(
            prop => values[prop] !== undefined
        )
    ) {
        if (this.updateSchema) {
            try {
                values = this.updateSchema.validateSync(values);
            } catch (err) {
                (err as any).code = 400;
                throw err;
            }
            const postSchemaFields = Object.getOwnPropertyNames(values);
            fields = fields.filter(field => postSchemaFields.includes(field));
        }
        let queryContext = new QueryContext(this._tablesRelated).setPureContext(
            where_ctx
        );
        let query =
            'UPDATE ' +
            this._name +
            ' SET ' +
            fields.map(field => field + '={{' + field + '}}').join(', ') +
            ' ' +
            this.getWhere(queryContext);
        return await this._con.query<{ affectedRows: any }>(
            this._con.secureQuery(query, values)
        );
    }

    /**
     * @summary
     * Delete rows who respect to where_ctx
     * @param where_ctx {@link PureContext}
     * @returns Promise
     */
    public delete(where_ctx: WhereContext) {
        let query =
            'DELETE FROM ' +
            this._name +
            ' ' +
            this.getWhere(new QueryContext().setPureContext(where_ctx));
        return this._con.query(query);
    }

    private getWhere(queryContext: QueryContext) {
        let filterSentences = queryContext.getFilterSentences();
        return filterSentences ? ' WHERE ' + filterSentences : '';
    }
}

export default Table;
