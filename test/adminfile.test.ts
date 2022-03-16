import AdminFile from '../src/adminfile';

const mockExistsSync = jest.fn((__path: any) => false);
const mockMkdirSync = jest.fn((__path: any) => {});
const mockWriteFileSync = jest.fn((__path: any, __data: any) => {});
const mockAppendFileSync = jest.fn((__path: any, __data: any) => {});
const mockReadFileSync = jest.fn((__path: any, __options: any) => {});
const mockReaddirSync = jest.fn((__path: any) => {});
const mockUnlinkSync = jest.fn(__path => {});

jest.mock('fs', () => ({
    existsSync: jest.fn((path: string) => mockExistsSync(path)),
    mkdirSync: jest.fn((path: string) => mockMkdirSync(path)),
    writeFileSync: jest.fn((path, data) => {
        mockWriteFileSync(path, data);
    }),
    appendFileSync: jest.fn((path, data) => {
        mockAppendFileSync(path, data);
    }),
    readFileSync: jest.fn((path, options) => {
        mockReadFileSync(path, options);
    }),
    readdirSync: jest.fn(path => {
        mockReaddirSync(path);
        return ['test_other.txt', 'other.txt', 'test.txt', 'some_test.txt'];
    }),
    unlinkSync: jest.fn(path => {
        mockUnlinkSync(path);
    }),
}));

describe('Adminfile test', () => {
    const adminFile = new AdminFile(
        AdminFile.path.resolve(__dirname, 'filestest')
    );
    const contentFile = 'This is the content of the file test.txt';
    const namedWithExt = 'test.txt';
    const namedWithoutExt = namedWithExt.split('.')[0];
    const dir = 'sub';
    const absolutePath = AdminFile.path.resolve(
        __dirname,
        'filestest',
        dir,
        namedWithExt
    );

    beforeEach(() => {
        mockExistsSync.mockReset();
        mockMkdirSync.mockReset();
        mockWriteFileSync.mockReset();
        mockAppendFileSync.mockReset();
        mockReadFileSync.mockReset();
        mockReaddirSync.mockReset();
        mockUnlinkSync.mockReset();
    });

    test('Make subdirectory', () => {
        adminFile.makeDir(dir);
        expect(adminFile.rootPath).toBe(
            AdminFile.path.resolve(__dirname, 'filestest')
        );
        expect(mockExistsSync).toBeCalledTimes(1);
        expect(mockMkdirSync).toBeCalledTimes(1);
    });

    test('Write ' + namedWithExt, async () => {
        await adminFile.writeFile(dir, namedWithExt, contentFile);
        expect(mockWriteFileSync).toBeCalledTimes(1);
        expect(mockWriteFileSync.mock.calls[0][0]).toBe(absolutePath);
        expect(mockWriteFileSync.mock.calls[0][1]).toBe(contentFile);
    });

    test('Append ' + namedWithExt, async () => {
        await adminFile.appendFile(dir, namedWithExt, contentFile);
        expect(mockAppendFileSync).toBeCalledTimes(1);
        expect(mockAppendFileSync.mock.calls[0][0]).toBe(absolutePath);
        expect(mockAppendFileSync.mock.calls[0][1]).toBe(contentFile);
    });

    test('Read ' + namedWithExt, async () => {
        await adminFile.readFile(dir, namedWithExt);
        expect(mockReadFileSync).toBeCalledTimes(1);
        expect(mockReadFileSync.mock.calls[0][0]).toBe(absolutePath);
    });

    test('Search ' + namedWithExt, async () => {
        const {
            namedWithExt: nameGetted,
            absolutePath: pathGetted,
        } = await adminFile.searchFile(dir, namedWithoutExt);
        expect(mockReaddirSync).toBeCalledTimes(1);
        expect(pathGetted).toBe(absolutePath);
        expect(nameGetted).toBe(namedWithExt);
    });

    test('Search no found', async () => {
        const randomName = Date.now().toString(36);
        await expect(
            adminFile.searchFile(dir, randomName)
        ).rejects.toMatchObject({
            name: 'NOT_FOUND',
        });
        expect(mockReaddirSync).toBeCalledTimes(1);
    });

    test('Erase and search ' + namedWithoutExt, async () => {
        const randomName = Date.now().toString(36);
        await expect(
            adminFile.searchEraseFile(dir, namedWithoutExt)
        ).resolves.toBeUndefined();
        expect(mockReaddirSync).toBeCalledTimes(1);
        expect(mockUnlinkSync).toBeCalledTimes(1);
        await expect(
            adminFile.searchEraseFile(dir, randomName)
        ).resolves.toBeUndefined();
    });
});
