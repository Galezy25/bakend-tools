import Column from '../../src/easysql/column';
import Connection from '../../src/easysql/connection';
import {
    Constraint,
    ForeignKey,
    PrimaryKey,
} from '../../src/easysql/constraint';

const mockQuery = jest.fn(
    (__query, callback: (err: any, results: any, fields: any) => void) => {
        callback(undefined, [], []);
    }
);
jest.mock('mysql', () => {
    return {
        createConnection: jest.fn(_config => ({
            query: mockQuery,
            end: jest.fn(),
        })),
        escape: jest.fn((value: any) => {
            return typeof value === 'string' ? `'${value}'` : value + '';
        }),
    };
});

describe('Connection tests', () => {
    let connection = new Connection({
        user: 'root',
    });

    const tableTestsName = 'table_tests';
    const table = connection.table(tableTestsName);

    beforeEach(() => {
        mockQuery.mockClear();
    });

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
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Find, Find One of a empty table', async () => {
        await table.find({});
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
        await expect(table.findOne({ id: 1 })).rejects.toMatchObject({
            code: 404,
        });
        expect(mockQuery.mock.calls[1][0]).toMatchSnapshot();
    });

    test('Add, modify and drop column', async () => {
        await table.addColumn(
            new Column('phone', {
                dataType: 'BIGINT',
            })
        );
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
        await table.modifyColumn(
            new Column('phone', {
                dataType: ['VARCHAR', 17],
            })
        );
        expect(mockQuery.mock.calls[1][0]).toMatchSnapshot();
        await table.dropColumn('phone');
        expect(mockQuery.mock.calls[2][0]).toMatchSnapshot();
    });

    test('Create rows', async () => {
        await table.create({
            name: 'test_1',
            email: 'test_1@test.test',
        });
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();

        let toRegister: any[] = [];
        for (let index = 2; index <= 200; index++) {
            toRegister.push({
                name: 'test_' + index,
                email: 'test_' + index + '@test.test',
                leader: index > 10 ? index % 10 || 1 : null,
                otherValue: index,
            });
        }
        await table.create(toRegister, ['name', 'email', 'leader']);
        expect(mockQuery.mock.calls[1][0]).toMatchSnapshot();
    });

    test('Find rows', async () => {
        await table.find(
            {
                _sort: 'id:DESC',
                _limit: 25,
                _start: 25,
                leader_gteq: 8,
                [tableTestsName + '_inner']: tableTestsName + '.id:this.leader',
            },
            ['this.*', tableTestsName + '.name AS leader_name']
        );
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();

        await table.find({
            email_like: 'test_2%',
            leader_in: '2,5',
        });
        expect(mockQuery.mock.calls[1][0]).toMatchSnapshot();
    });

    test('Update row', async () => {
        await table.update({ name: 'test_100_2' }, { id: 100 });
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Delete row', async () => {
        await table.delete({ id: 100 });
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });
});
