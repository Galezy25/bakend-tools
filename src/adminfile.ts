import fs from 'fs';
import path from 'path';

export default class AdminFile {

	public static get path (){
		return path
	}

	protected _rootPath: string

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
	 * @param callback (optional)
	 * @returns Promise
	 */
	public writeFile(dir: string, namedWithExt: string, data: any, callback?: (error?: NodeJS.ErrnoException) => void) {
		return new Promise<void>((resolve, reject) => {
			let afPath = this._rootPath;

			let fullDir = path.resolve(afPath, dir);
			this.makeDir(fullDir);

			let new_path = path.resolve(fullDir, namedWithExt);
			fs.writeFile(new_path, data, function (err) {
				if (err) {
					if (callback) callback(err);
					else reject(err);
				} else {
					if (callback) callback(undefined);
					else resolve();
				}
			});
		})
	}

	/**
	 * 
	 * @param dir Directory where is the file to append data
	 * @param namedWithExt Name with extension of the file
	 * @param data Content to append in the file
	 * @param callback (optional)
	 * @returns Promise
	 */
	appendFile(dir: string, namedWithExt: string, data: any, callback?: (error?: NodeJS.ErrnoException) => void) {
        return new Promise<void>((resolve, reject)=>{
            let filePath = path.resolve(this._rootPath, dir, namedWithExt);
            fs.appendFile(filePath, data, (err) => {
                if (err) {
					if(callback) callback(err);
                    else reject(err);
                }else{
					if(callback) callback(undefined);
                    else resolve();
                }
            })

        })
    }


	/**
	 * 
	 * @param dir Directory where find the file to read.
	 * @param namedWithExt Name with extension of the file.
	 * @param callback (optional)
	 * @returns Promise that resolve with a string of the content of the file.
	 */
	public readFile(dir: string, namedWithExt: string, callback?: (error?: NodeJS.ErrnoException, data?: string) => void) {
		return new Promise<string>((resolve, reject) => {
			let afPath = this._rootPath;

			let pathFile = path.resolve(afPath, dir, namedWithExt);
			fs.readFile(pathFile, 'utf8', function (err, data) {
				if (err) {
					if (callback) callback(err);
					else reject(err);
				} else {
					if (callback) callback(undefined, data);
					else resolve(data);

				}
			});

		})
	}

	/**
	 * 
	 * @param dir Directory to search into
	 * @param named Segment or name of the file without extension.
	 * @param callback (optional)
	 * @returns Promise that resolves with the full path and the name with extension of the file.
	 */
	public searchFile(dir: string, named: string, callback?: (error?: NodeJS.ErrnoException, absolutePath?: string, namedWithExt?: string) => void) {
		return new Promise<{
			absolutePath: string,
			namedWithExt: string
		}>((resolve, reject) => {
			let afPath = this._rootPath;

			let old_path = path.resolve(afPath, dir);
			fs.readdir(old_path, function (err, files) {
				if (err) {
					if (callback) return callback(err);
					else return reject(err);
				}
				let namedWithExt = "";
				for (var i = 0; i < files.length && namedWithExt == ""; i++) {
					if (files[i].includes(named)) {
						namedWithExt = files[i];
					}
				}
				if (namedWithExt !== "") {
					let absolutePath = path.resolve(afPath, dir, namedWithExt);
					if (callback) callback(undefined, absolutePath, namedWithExt);
					else resolve({
						absolutePath,
						namedWithExt
					})
				} else {
					if (callback) callback({ name: "NOT_FOUND", message: "File not found or does not exist" }, undefined, undefined);
					else reject({ name: "NOT_FOUND", message: "File not found or does not exist" });
				}

			});

		})
	}

	/**
	 * 
	 * @param dir Directory of the file.
	 * @param namedWithExt Name with extension of the file.
	 * @param callback (optional)
	 * @returns Promise
	 */
	public eraseFile(dir: string, namedWithExt: string, callback?: (error?: NodeJS.ErrnoException) => void) {
		return new Promise<void>((resolve, reject) => {
			let afPath = this._rootPath;

			let old_path = path.join(afPath, dir, namedWithExt);
			fs.unlink(old_path, function (err) {
				if (err) {
					if (callback) callback(err);
					else reject(err);
				} else {
					if (callback) callback(undefined);
					else resolve()
				}
			});

		})
	}

	/**
	 * 
	 * @param dir Directory to search into.
	 * @param named Segment or name of the file without extension.
	 * @param callback (optional)
	 */
	public async searchEraseFile(dir: string, named: string, callback?: (error?: NodeJS.ErrnoException) => void) {
		try{
			const { namedWithExt } = await this.searchFile(dir, named);
			await this.eraseFile(dir, namedWithExt, callback);
		}catch(err){
			if(err.name !== "NOT_FOUND") throw err;
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
