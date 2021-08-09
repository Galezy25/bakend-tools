import AdminFile from '../src/adminfile';

describe("Adminfile test", () => {
    const adminFile = new AdminFile(AdminFile.path.resolve(__dirname, 'filestest'))
    const contentFile = 'This is the content of the file test.txt';
    const namedWithExt = 'test.txt';
    const namedWithoutExt = namedWithExt.split('.')[0];
    const dir = 'sub';
    const absolutePath = AdminFile.path.resolve(__dirname, 'filestest', dir, namedWithExt)


    test('Make subdirectory', () => {
        adminFile.makeDir(dir);
    })

    test("Write " + namedWithExt, async () => {
        await expect(adminFile.writeFile(dir, namedWithExt, contentFile)).resolves;
    })

    test("Read " + namedWithExt, async () => {
        const contentReaded = await adminFile.readFile(dir, namedWithExt);
        expect(contentReaded).toBe(contentFile);
    })

    test("Search " + namedWithExt, async () => {
        const {
            namedWithExt: nameGetted,
            absolutePath: pathGetted
        } = await adminFile.searchFile(dir, namedWithoutExt);
        expect(pathGetted).toBe(absolutePath);
        expect(nameGetted).toBe(namedWithExt);
    })

    test("Search no found", async () => {
        const randomName = Date.now().toString(36);
        await expect(adminFile.searchFile(dir,randomName)).rejects.toMatchObject({
            name : "NOT_FOUND"
        })
    })

    test("Erase and search " + namedWithoutExt, async () => {
        await expect(adminFile.searchEraseFile(dir, namedWithoutExt)).resolves;
    })
})