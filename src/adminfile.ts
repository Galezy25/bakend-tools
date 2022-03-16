import fs from 'fs';
import path from 'path';

export class AdminFile {
    public static get path() {
        return path;
    }

    protected _rootPath: string;

    public get rootPath() {
        return this._rootPath;
    }

    /**
     *
     * @param rootPath Absolute path of the root of this file manager.
     */
    constructor(rootPath: string) {
        this._rootPath = rootPath;
        if (!fs.existsSync(this._rootPath)) {
            fs.mkdirSync(this._rootPath);
        }
    }

    /**
     *
     * @param dir Directory where will be write the file
     * @param namedWithExt Name with extension of the file
     * @param data Content of the file
     * @returns Promise that returns relativePath
     */
    public async writeFile(dir: string, namedWithExt: string, data: any) {
        let fullDir = path.resolve(this._rootPath, dir);
        this.makeDir(fullDir);
        let fullPath = path.resolve(fullDir, namedWithExt);
        let relativePath = path.relative(this._rootPath, fullPath);
        fs.writeFileSync(fullPath, data);
        return relativePath;
    }

    /**
     *
     * @param dir Directory where is the file to append data
     * @param namedWithExt Name with extension of the file
     * @param data Content to append in the file
     * @returns Promise that returns relativePath
     */
    async appendFile(dir: string, namedWithExt: string, data: any) {
        let fullDir = path.resolve(this._rootPath, dir);
        this.makeDir(fullDir);
        let fullPath = path.resolve(fullDir, namedWithExt);
        let relativePath = path.relative(this._rootPath, fullPath);
        fs.appendFileSync(fullPath, data);
        return relativePath;
    }

    /**
     *
     * @param dir Directory where find the file to read.
     * @param namedWithExt Name with extension of the file.
     * @returns Promise that resolve with a string of the content of the file.
     */
    public async readFile(dir: string, namedWithExt: string) {
        let afPath = this._rootPath;
        let pathFile = path.resolve(afPath, dir, namedWithExt);
        let data = fs.readFileSync(pathFile, 'utf8');
        return data;
    }

    /**
     *
     * @param dir Directory to search into
     * @param named Segment or name of the file without extension.
     * @returns Promise that resolves with the full path and the name with extension of the file.
     */
    public async searchFile(dir: string, named: string) {
        let afPath = this._rootPath;
        let old_path = path.resolve(afPath, dir);
        let files = fs.readdirSync(old_path);
        let namedWithExt = files
            .filter(filename => filename.includes(named))
            .sort((a, b) => a.length - b.length)[0];
        if (!namedWithExt) {
            const error = new Error('File not found or does not exist');
            error.name = 'NOT_FOUND';
            throw error;
        }
        let absolutePath = path.resolve(afPath, dir, namedWithExt);
        return {
            absolutePath,
            namedWithExt,
        };
    }

    /**
     *
     * @param dir Directory of the file.
     * @param namedWithExt Name with extension of the file.
     * @returns Promise
     */
    public async eraseFile(dir: string, namedWithExt: string) {
        let afPath = this._rootPath;

        let old_path = path.join(afPath, dir, namedWithExt);
        fs.unlinkSync(old_path);
        return;
    }

    /**
     *
     * @param dir Directory to search into.
     * @param named Segment or name of the file without extension.
     */
    public async searchEraseFile(dir: string, named: string) {
        try {
            const { namedWithExt } = await this.searchFile(dir, named);
            await this.eraseFile(dir, namedWithExt);
            return;
        } catch (err) {
            if ((err as any)?.name !== 'NOT_FOUND') throw err;
        }
    }

    /**
     *
     * @param dir Create directory if not exist.
     */
    public makeDir(dir: string) {
        if (!fs.existsSync(path.resolve(this._rootPath, dir))) {
            fs.mkdirSync(path.resolve(this._rootPath, dir));
        }
    }
}

export default AdminFile;
