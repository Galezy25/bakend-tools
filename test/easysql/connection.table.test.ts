import Column from '../../src/easysql/column';
import Connection from '../../src/easysql/connection';
import {
    Constraint,
    ForeignKey,
    PrimaryKey,
} from '../../src/easysql/constraint';

const mockQuery = jest.fn(
    (
        query: string,
        callback: (err: any, results: any, fields: any) => void
    ) => {
        if (query.includes('count')) {
            callback(undefined, [{ count: 25 }], []);
        } else {
            callback(undefined, [], []);
        }
    }
);
const mockEnd = jest.fn();
jest.mock('mysql', () => {
    return {
        createPool: jest.fn(_config => ({
            query: mockQuery,
            end: mockEnd,
        })),
        escape: jest.fn((value: any) => {
            return typeof value === 'string' ? `'${value}'` : value + '';
        }),
    };
});

describe('Connection tests', () => {
    let connection = new Connection({
        user: 'tester',
        database: 'test',
    });

    const tableTestsName = 'table_tests';
    const table = connection.table(tableTestsName, {
        tablesRelated: [tableTestsName],
    });

    beforeEach(() => {
        mockQuery.mockClear();
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

    test('CURRENT_TIMESTAMP', () => {
        expect(table.CURRENT_TIMESTAMP).toMatch(
            /\d{4}-\d{2}-\d{2} \d{1,2}:\d{1,2}:\d{1,2}/
        );
    });

    test('getDateFormat get', () => {
        let date1 = new Date('2025/01/01 00:00:00');
        let date2 = new Date('2025/12/25 00:00:00');
        expect(table.getDateTimeFormat(date1)).toBe('2025-01-01 0:0:0');
        expect(table.getDateTimeFormat(date2)).toBe('2025-12-25 0:0:0');
        expect(table.getDateFormat(date1)).toBe('2025/01/01');
        expect(table.getDateFormat(date2)).toBe('2025/12/25');
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
        await table.find({
            _sort: 'id:DESC',
            _limit: 25,
            _start: 25,
            leader_gteq: 8,
            [tableTestsName + '_inner']:
                tableTestsName + '.id:this.leader,name:leader_name',
        });
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();

        await table.find({
            email_like: 'test_2%',
            leader_in: '2,5',
        });
        expect(mockQuery.mock.calls[1][0]).toMatchSnapshot();
    });

    test('Find with or/and', async () => {
        await table.find({
            email_like: [
                '%@test.net',
                '%@subdomain.test.net',
                '%@subdomain2.test.net',
            ],
            leader_in: '2,5',
        });
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Update row', async () => {
        await table.update({ id: 100 }, { name: 'test_100_2' });
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Delete row', async () => {
        await table.delete({ id: 100 });
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Count', async () => {
        await table.count();
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('changeColumn', async () => {
        await table.changeColumn(
            'name',
            new Column('fullname', {
                dataType: ['VARCHAR', 50],
            })
        );
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('renameColumn', async () => {
        await table.renameColumn('name', 'fullname');
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('addConstraint', async () => {
        await table.addConstraint(new PrimaryKey('id', 'pk_id'));
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('dropConstraint', async () => {
        await table.dropConstraint('pk_id');
        expect(mockQuery.mock.calls[0][0]).toMatchSnapshot();
    });

    test('Connection end', () => {
        connection.end();
        expect(mockEnd).toBeCalled();
    });
});
