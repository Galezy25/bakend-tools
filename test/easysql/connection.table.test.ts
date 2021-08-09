import Column from '../../src/easysql/column';
import Connection from '../../src/easysql/connection';
import {
    Constraint,
    ForeignKey,
    PrimaryKey,
} from '../../src/easysql/constraint';

describe('Connection tests', () => {
    let connection = new Connection({
        user: 'root',
    });

    const tableTestsName = 'table_tests_' + Date.now().toString(36);

    afterAll(() => {
        connection.query('DROP TABLE ' + tableTestsName);
        connection.end();
    });

    test('Secure query', async () => {
        const queryTemplate = 'this is a test named {{ name }} {{ num }}';
        expect(
            connection.secureQuery(queryTemplate, { name: 'Simple', num: 25 })
        ).toBe("this is a test named 'Simple' 25");
        expect(
            connection.secureQuery(queryTemplate, {
                name: 'CURRENT_TIMESTAMP',
                num: null,
            })
        ).toBe('this is a test named CURRENT_TIMESTAMP NULL');
        expect(
            connection.secureQuery(queryTemplate, { name: true, num: NaN })
        ).toBe('this is a test named true NaN');
        expect(
            connection.secureQuery(queryTemplate, {
                name: 'SELECT * FROM users',
                num: undefined,
            })
        ).toBe("this is a test named 'SELECT * FROM users' DEFAULT");
    });

    test('Create Test database', async () => {
        await expect(connection.query('CREATE DATABASE IF NOT EXISTS test'))
            .resolves;
        await connection.query('USE test');
    });

    test('Create table', async () => {
        const columns: Column[] = [
            new Column('id', {
                dataType: 'INT',
                autoIncremet: true,
            }),
            new Column('name', {
                dataType: ['VARCHAR', 150],
            }),
            new Column('email', {
                dataType: ['VARCHAR', 30],
                null: false,
                unique: true,
            }),
            new Column('leader', {
                dataType: 'INT',
                null: true,
                default: 'NULL',
            }),
            new Column('active', {
                dataType: 'BOOLEAN',
                default: true,
            }),
        ];
        const constraints: Constraint[] = [
            new PrimaryKey('id'),
            new ForeignKey({
                colName: 'leader',
                tableRef: tableTestsName,
                columnRef: 'id',
            }),
        ];
        let table = await connection.createTable(
            tableTestsName,
            ...columns,
            ...constraints
        );

        expect(table.name).toBe(tableTestsName);
    });

    test('Find, Find One of a empty table', async () => {
        const table = connection.table(tableTestsName);
        const allRow = await table.find({});
        expect(allRow.length).toBe(0);
        await expect(table.findOne({ id: 1 })).rejects.toMatchObject({
            code: 404,
        });
    });

    test('Add, modify and drop column', async () => {
        const table = connection.table(tableTestsName);
        let columns: {
            Field: string;
            Type: string;
            Null: string;
            Key: string;
            Default: string;
            Extra: string;
        }[];

        await expect(
            table.addColumn(
                new Column('phone', {
                    dataType: 'BIGINT',
                })
            )
        ).resolves;
        columns = await connection.query('SHOW COLUMNS FROM ' + tableTestsName);
        expect(columns.find(column => column.Field === 'phone')).toBeDefined();

        await expect(
            table.modifyColumn(
                new Column('phone', {
                    dataType: ['VARCHAR', 17],
                })
            )
        );
        columns = await connection.query('SHOW COLUMNS FROM ' + tableTestsName);
        expect(columns.find(column => column.Field === 'phone')?.Type).toBe(
            'varchar(17)'
        );

        await expect(table.dropColumn('phone'));
        columns = await connection.query('SHOW COLUMNS FROM ' + tableTestsName);
        expect(
            columns.find(column => column.Field === 'phone')
        ).not.toBeDefined();
    });

    test('Create rows', async () => {
        const table = connection.table(tableTestsName);
        const insertedId = await table.create({
            name: 'test_1',
            email: 'test_1@test.test',
        });
        expect(insertedId.insertId).toBe(1);

        let toRegister: any[] = [];
        for (let index = 2; index <= 200; index++) {
            toRegister.push({
                name: 'test_' + index,
                email: 'test_' + index + '@test.test',
                leader: index > 10 ? index % 10 || 1 : null,
                otherValue: index,
            });
        }
        await expect(table.create(toRegister, ['name', 'email', 'leader']))
            .resolves;
    });

    test('Find rows', async () => {
        const table = connection.table(tableTestsName);
        let results: {
            id: number;
            name: string;
            email: string;
            leader: number;
        }[];

        results = await table.find({
            _sort: 'id:DESC',
            _limit: 25,
            _start: 25,
        });

        expect(results.length).toBe(25);
        expect(results[0].id).toBe(175);

        results = await table.find({
            leader_in: '2,5',
        });
        expect(results.length).toBe(38);

        results = await table.find({
            email_like: 'test_2%',
        });
        expect(results.length).toBe(12);

        results = await table.find({
            leader_gteq: 8,
        });
        expect(results.length).toBe(38);

        results = await table.find({
            leader: 5,
        });
        expect(results.length).toBe(19);
    });

    test('Find one with join', async () => {
        const table = connection.table(tableTestsName);
        let result: {
            id: number;
            name: string;
            email: string;
            leader: number;
            active: boolean;
            leader_name: string;
        } = await table.findOne(
            {
                'this.id': 100,
                [tableTestsName + '_inner']: tableTestsName + '.id:this.leader',
            },
            ['this.*', tableTestsName + '.name AS leader_name']
        );
        expect(result.leader_name).toBe('test_1');
    });

    test('Update row', async () => {
        const table = connection.table(tableTestsName);
        let result: {
            id: number;
            name: string;
            email: string;
            leader: number;
        } = await table.findOne({ id: 100 });
        let prevResult = result;
        expect(result.name).toBe('test_100');
        await table.update({ name: 'test_100_2' }, { id: 100 });
        result = await table.findOne({ id: 100 });
        expect(result).toMatchObject({ ...prevResult, name: 'test_100_2' });
    });

    test('Delete row', async () => {
        const table = connection.table(tableTestsName);
        await expect(table.findOne({ id: 100 })).resolves;
        await table.delete({ id: 100 });
        await expect(table.findOne({ id: 100 })).rejects.toMatchObject({
            code: 404,
        });
    });
});
