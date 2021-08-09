import mysql from 'mysql';
import Column from './column';
import { functionsRegexp } from './const.types';
import { Constraint } from './constraint';
import Table from './table';

export default class Connection {
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
                    if (callback) {
                        callback(err);
                    }
                    reject(err);
                } else {
                    if (callback) {
                        callback(null, results, fields);
                    }
                    resolve(results);
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
        let templateProps: string[][] = [...query.matchAll(propsRegexp)];
        templateProps.forEach(([expresion, property]) => {
            let toInject = 'DEFAULT';
            if (values[property] !== undefined) {
                if (values[property] === null) {
                    toInject = 'NULL';
                } else {
                    toInject = functionsRegexp.test(values[property])
                        ? values[property]
                        : this.escape(values[property]);
                }
            }
            query = query.replaceAll(expresion, toInject);
        });
        return query;
    }

    /**
     * Current datetime with format YYYY-MM-DD hh:mm:ss
     */
    public get CURRENT_TIMESTAMP() {
        const now = new Date();
        return (
            now.getFullYear() +
            '-' +
            (now.getMonth() + 1 < 10
                ? '0' + (now.getMonth() + 1)
                : now.getMonth() + 1) +
            '-' +
            (now.getDate() < 10 ? '0' + now.getDate() : now.getDate()) +
            ' ' +
            now.toLocaleTimeString()
        );
    }

    /**
     *
     * @param name Name of the table to get
     * @returns Table object
     */
    public table(name: string) {
        return new Table(this, name);
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
