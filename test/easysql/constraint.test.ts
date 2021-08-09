import { PrimaryKey, Unique, ForeignKey } from '../../src/easysql/constraint';

describe('EasySql Contstraint test', () => {
    test('Primary Key', () => {
        const constraintPK = new PrimaryKey('id');
        const constraintPK_multiple = new PrimaryKey(
            'username,email',
            'pk_multiple'
        );

        expect(constraintPK.toString()).toBe('CONSTRAINT PRIMARY KEY (id)');
        expect(constraintPK_multiple.toString()).toBe(
            'CONSTRAINT pk_multiple PRIMARY KEY (username,email)'
        );
    });

    test('Unique', () => {
        const constraintU = new Unique('id');
        const constraintU_multiple = new Unique('username,email', 'u_multiple');

        expect(constraintU.toString()).toBe('CONSTRAINT UNIQUE (id)');
        expect(constraintU_multiple.toString()).toBe(
            'CONSTRAINT u_multiple UNIQUE (username,email)'
        );
    });

    test('Foreign Key', () => {
        const constraintFK = new ForeignKey({
            colName: 'leader',
            tableRef: 'employes',
            columnRef: 'id',
        });
        const constraintFK_options = new ForeignKey({
            colName: 'leader',
            tableRef: 'employes',
            columnRef: 'id',
            referenceOption: {
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
        });
        expect(constraintFK.toString()).toBe(
            `CONSTRAINT FOREIGN KEY (leader) REFERENCES employes(id)`
        );
        expect(constraintFK_options.toString()).toBe(
            `CONSTRAINT FOREIGN KEY (leader) REFERENCES employes(id) ON UPDATE CASCADE ON DELETE RESTRICT`
        );
    });
});
