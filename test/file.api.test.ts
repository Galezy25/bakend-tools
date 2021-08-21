import express = require('express');
import request = require('supertest');

import FileApi from '../src/file.api';
/*
jest.mock('fs', () => {
    return {
        writeFile: jest.fn(
            (__fullPathFile: string, __data: any, callback: () => void) => {
                callback();
            }
        ),
        existsSync: jest.fn((__path: string) => true),
    };
});
//*/
describe('File api tests', () => {
    const app = express();
    const fileApi = new FileApi(
        FileApi.path.resolve(__dirname, 'filestest'),
        'key string'
    );
    app.use('/', fileApi.expressApp);
    app.use((err: any, _req: any, res: express.Response, _next: any) => {
        if (err.code < 500) {
            res.sendStatus(err.code);
        } else {
            throw err;
        }
    });
    const fileName = 'test.txt';
    const nameOnDownload = 'name_to_download.txt';
    const content = 'Content of the file';
    let pathFile: string;

    beforeAll(async () => {
        pathFile = await fileApi.writeFile('', fileName, content);
    });

    afterAll(async () => {
        await fileApi.eraseFile('', fileName);
    });

    test('Encode / decode', async () => {
        const encoded = fileApi.encode(pathFile, nameOnDownload);
        const { file, name } = await fileApi.decode(encoded);
        expect(file).toBe(pathFile);
        expect(name).toBe(nameOnDownload);
    });

    test.skip('Download file', async () => {
        const downloadRoute = fileApi.getDownloadRoute(
            pathFile,
            nameOnDownload
        );
        const response = await request(app)
            .get(downloadRoute)
            .buffer()
            .parse((res, callback) => {
                res.setEncoding('binary');
                let data = '';
                res.on('data', chuck => {
                    data += chuck;
                });
                res.on('end', () => {
                    callback(null, Buffer.from(data, 'binary'));
                });
            });
        expect((response.body as Buffer).toString()).toBe(content);
    });
    //*/

    test.skip('Try to download expired file token', async done => {
        const downloadRoute = fileApi.getDownloadRoute(
            pathFile,
            nameOnDownload,
            2
        );
        console.log(downloadRoute);
        await new Promise(r => {
            setTimeout(r, 3500);
        });
        request(app)
            .get(downloadRoute)
            .expect(403)
            .end(err => {
                if (err) done(err);
                else done();
            });
    });
});
