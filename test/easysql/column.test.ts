import Column from '../../src/easysql/column';

describe('EasySql Column test', () => {
    test('Simple column declaration', () => {
        const columnInt = new Column('test_int', {
            dataType: 'INT',
        });

        const columnVarchar = new Column('test_varchar', {
            dataType: ['VARCHAR', 50],
        });

        const columnDatetime = new Column('test_datetime', {
            dataType: 'DATETIME',
        });

        const columnEnum = new Column('test_enum', {
            dataType: ['ENUM', 'val_1', 'val_2', 'val_3'],
        });

        expect(columnInt.toString()).toBe('test_int INT');
        expect(columnInt.definition).toMatchObject({
            dataType: 'INT',
        });
        expect(columnVarchar.toString()).toBe('test_varchar VARCHAR(50)');
        expect(columnDatetime.toString()).toBe('test_datetime DATETIME');
        expect(columnEnum.toString()).toBe(
            "test_enum ENUM('val_1','val_2','val_3')"
        );
    });

    test('Id column number auto increment', () => {
        const idColumn = new Column('id', {
            dataType: 'INT',
            primaryKey: true,
            autoIncremet: true,
            null: false,
        });
        expect(idColumn.toString()).toBe(
            'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY'
        );
    });

    test('Date column by default today', () => {
        const dateColumn = new Column('begin', {
            dataType: 'DATE',
            default: 'CURRENT_TIMESTAMP',
        });

        expect(dateColumn.toString()).toBe(
            'begin DATE DEFAULT CURRENT_TIMESTAMP'
        );
    });

    test('State column with a comment', () => {
        const stateColumn = new Column('state', {
            dataType: ['ENUM', 'To do', 'Doing', 'Done'],
            default: 'To do',
            comment: 'This is the state of the task',
        });
        expect(stateColumn.toString()).toBe(
            "state ENUM('To do','Doing','Done') DEFAULT 'To do' COMMENT 'This is the state of the task'"
        );
    });

    test('Unique email column', () => {
        const emailColumn = new Column('email', {
            dataType: ['VARCHAR', 30],
            unique: true,
            null: false,
        });

        expect(emailColumn.toString()).toBe(
            'email VARCHAR(30) NOT NULL UNIQUE'
        );
    });

    test('Boolean column', () => {
        const activeColumn = new Column('active', {
            dataType: 'BOOLEAN',
            default: true,
        });

        expect(activeColumn.toString()).toBe('active BOOLEAN DEFAULT true');
    });
    test('Invisible description column', () => {
        const descriptionColumn = new Column('description', {
            dataType: ['VARCHAR', 255],
            null: false,
            default: '',
            visible: false,
        });

        expect(descriptionColumn.toString()).toBe(
            "description VARCHAR(255) NOT NULL DEFAULT '' INVISIBLE"
        );
    });

    test('Order on column', () => {
        const dateColumn = new Column('begin', {
            dataType: 'DATE',
            default: 'CURRENT_TIMESTAMP',
        }).setFirst();

        expect(dateColumn.toString()).toBe(
            'begin DATE DEFAULT CURRENT_TIMESTAMP FIRST'
        );

        dateColumn.setAfter('fullname');

        expect(dateColumn.toString()).toBe(
            'begin DATE DEFAULT CURRENT_TIMESTAMP AFTER fullname'
        );
    });

    test('Change column', () => {
        const dateColumn = new Column('begin', {
            dataType: 'DATE',
            default: 'CURRENT_TIMESTAMP',
        });

        dateColumn.change('end', {
            dataType: 'DATETIME',
        });

        expect(dateColumn.toString()).toBe(
            'end DATETIME DEFAULT CURRENT_TIMESTAMP'
        );
    });
});
