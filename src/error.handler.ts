import { Request, Response } from 'express';
import fs from 'fs';

export class ErrorHandler {
    private _pathLog: string;

    /**
     *
     * @param pathLog Path of the log that will be append the errors.
     */
    constructor(pathLog: string) {
        this._pathLog = pathLog;
        this.appendError = this.appendError.bind(this);
        this.handler = this.handler.bind(this);
    }

    /**
     * Error handler, this should be used after all routes of the Express server.
     *
     * @example
     * ```ts
     *      expressApp.use(errorHandler.handler)
     * ```
     */
    handler(err: any, req: Request, res: Response, _next: any) {
        let toLog = false;
        let code: number | null = null;
        if (typeof err === 'number') code = err;
        if (typeof err.code === 'number') code = err.code;
        if (typeof err.status === 'number') code = err.status;
        if (typeof err.statusCode === 'number') code = err.statusCode;

        if (code) {
            if (code >= 500) {
                toLog = true;
            }
            res.sendStatus(code);
        } else {
            toLog = true;
            res.sendStatus(500);
        }
        if (toLog) {
            this.appendError(err, req.originalUrl);
        }
    }

    /**
     * Append a error into the log.
     * @example
     * ```ts
     *      errorHandler.appendError(new Error("Something happened"), "Some funtion")
     * ```
     * @param err Error throwed
     * @param service Where the error was thrown
     * @returns Promise
     */
    appendError(err: any, service: any) {
        return new Promise<void>((resolve, reject) => {
            let now = new Date();
            let content = '<----------------------------| \n';
            content += service + '\n';
            content += now + '\n\n';
            content += err.toString() + '\n';
            content += JSON.stringify(err) + '\n';
            content += '|----------------------------> \n';
            fs.appendFile(this._pathLog, content, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Set the error log as empty.
     */
    async restartErrorLog() {
        fs.writeFile(this._pathLog, '', err => {
            if (err) {
                throw err;
            }
        });
    }

    /**
     *
     * @returns Promise that resolves with the content of the error log.
     */
    getErrorLog() {
        return new Promise<string>((resolve, reject) => {
            fs.readFile(this._pathLog, 'utf8', (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }
}

/**
 * Create a http error with a status code.
 */
export class ErrorHTTP extends Error {
    statusCode: number = 500;
    error: any;

    constructor(
        message: string,
        error?: {
            [index: string]: any;
            statusCode?: number;
        }
    ) {
        super(message);
        if (error?.statusCode) this.statusCode = error.statusCode;
        this.error = error;
    }

    toString() {
        return `Status code: ${this.statusCode}: ${this.message}`;
    }
}

export default ErrorHandler;
