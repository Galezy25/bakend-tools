import mysql from 'mysql';
import Column from './column';
import { functionsRegexp } from './const.types';
import { Constraint } from './constraint';
import Table from './table';

export class Connection {
    private _cnn: mysql.Connection;

    /**
     *
     * @param config
     */
    constructor(config: mysql.ConnectionConfig) {
        this._cnn = mysql.createConnection(config);
    }

    /**
     *
     * @param query String with the sql instructions.
     * @param callback (Optional) Listener that will be called with the results or error of the query.
     * @returns Promise\<T\> T is the type of the result of the query.
     */
    public query<T = any>(
        query: string,
        callback?: (
            error: mysql.MysqlError | null,
            results?: T,
            fields?: mysql.FieldInfo[]
        ) => void
    ) {
        return new Promise<T>((resolve, reject) => {
            this._cnn.query(query, (err, results, fields) => {
                if (err) {
                    if (callback) callback(err);
                    else reject(err);
                } else {
                    if (callback) callback(null, results, fields);
                    else resolve(results);
                }
            });
        });
    }

    public get end() {
        return this._cnn.end;
    }

    /**
     * @example
     * ```ts
     *  con.secureQuery(
     *      'INSERT INTO products (name, cost, used) VALUES ({{ name }},{{ cost }},{{ used }})',
     *      {
     *          name: 'Atari 2600',
     *          cost: 849.88
     *      }
     *  );
     *
     *  //will return
     *  'INSERT INTO products (name, cost, used) VALUES ('Atari 2600','849.88',default)'
     * ```
     *
     * @param query Query template to resolve
     * @param values Object with the values that will be inject into the query template
     * @returns String with the query alredy to use with the variables escaped
     */
    public secureQuery(query: string, values: { [key: string]: any }) {
        let propsRegexp = new RegExp('{{\\s*([^\\s}]+)\\s*}}', 'gi');
        let matchResults = query.matchAll(propsRegexp);
        let templateProps: string[][] = [];
        let auxMatch = matchResults.next();
        while (!auxMatch.done) {
            templateProps.push(auxMatch.value);
            auxMatch = matchResults.next();
        }
        templateProps.forEach(([expresion, property]) => {
            let toInject = 'DEFAULT';
            if (
                values[property] !== undefined &&
                values[property] !== 'undefined'
            ) {
                if (values[property] === null || values[property] === 'null') {
                    toInject = 'NULL';
                } else {
                    toInject = functionsRegexp.test(values[property])
                        ? values[property]
                        : this.escape(values[property]);
                }
            }
            query = query.replace(new RegExp(expresion, 'g'), toInject);
        });
        return query;
    }

    /**
     * Current datetime with format YYYY-MM-DD hh:mm:ss
     */
    public get CURRENT_TIMESTAMP() {
        return this.getDateTimeFormat(new Date());
    }

    /**
     * @summary
     * Parse a Date to a format 'YYYY-MM-DD hh:mm:ss'
     * @param date Date
     * @returns string with format 'YYYY-MM-DD hh:mm:ss'
     */
    public getDateTimeFormat(date: Date) {
        return `${date.getFullYear()}-${
            date.getMonth() + 1 < 10
                ? '0' + (date.getMonth() + 1)
                : date.getMonth() + 1
        }-${
            date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
        } ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    }

    /**
     * @summary
     * Parse a Date to a format 'YYYY/MM/DD'
     * @param date Date
     * @returns string with format 'YYYY/MM/DD'
     */
    public getDateFormat(date: Date) {
        return `${date.getFullYear()}/${
            date.getMonth() + 1 < 10
                ? '0' + (date.getMonth() + 1)
                : date.getMonth() + 1
        }/${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()}`;
    }

    /**
     *
     * @param name Name of the table to get
     * @returns Table object
     */
    public table(name: string, id_name?: string) {
        return new Table(this, name, id_name);
    }

    /**
     *
     * @param name Name of the table to create
     * @param table_definition Array with the definition of the table
     * @returns Promise\<Table\> Table object of the recent created
     */
    public async createTable(
        name: string,
        ...table_definition: (Column | string | Constraint)[]
    ) {
        await this.query(
            `CREATE TABLE ${name}(
        ` +
                table_definition
                    .map(table_definition => table_definition.toString())
                    .join(',\n') +
                ');'
        );
        return this.table(name);
    }

    public escape = mysql.escape;
}

export default Connection;
