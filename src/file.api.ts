import express from 'express';
import path from 'path';

import AdminFile from './adminfile';
import SimpleToken from './simpletoken';

export default class FileApi extends AdminFile {
    public readonly expressApp = express();
    private _simpleToken: SimpleToken<Payload>;

    /**
     * 
     * @param rootPath Absolute path of the root of this file manager.
     * @param key Secret string to sign the token.
     */
    constructor(rootPath: string, key: string) {
        super(rootPath);
        this._simpleToken = new SimpleToken(key)
        this.downloadHandler = this.downloadHandler.bind(this);
        this.expressApp.get("/:token", this.downloadHandler);
    }
    private downloadHandler(req: express.Request, res: express.Response, next: express.NextFunction) {
        this.decode(req.params.token)
            .then(decoded => {
                res.download(path.resolve(this._rootPath, decoded.file), decoded.name);
            })
            .catch(err => next(err));
    }

    /**
     * 
     * @param token Token to decode.
     * @returns Promise that resolve with the payload decoded. 
     */
    public decode(token: string) {
        return this._simpleToken.verify(token);
    }

    /**
     * 
     * @param pathFile Path of the file inside of this file manager.
     * @param nameOnDownload How will be named the file on download.
     * @param expiresIn (Optional) Seconds of lifetime before expires.
     * @returns The string token.
     */
    public encode(pathFile: string, nameOnDownload: string, expiresIn?: number) {
        return this._simpleToken.sign({
            file: pathFile,
            name: nameOnDownload
        }, expiresIn)
    }

    /**
     * 
     * @param pathFile Path of the file inside of this file manager.
     * @param nameOnDownload How will be named the file on download.
     * @param expiresIn (Optional) Seconds of lifetime before expires.
     * @returns Route to download the file.
     */
    public getDownloadRoute(pathFile: string, nameOnDownload: string, expiresIn?: number) {
        return path.resolve(this.expressApp.path(), "/" + this.encode(pathFile, nameOnDownload, expiresIn))
    }
}


interface Payload {
    file: string,
    name: string
}
