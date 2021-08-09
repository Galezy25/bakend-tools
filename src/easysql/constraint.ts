import {
    ReferenceDefinition,
    referenceDefToString,
    ReferenceOption,
} from './const.types';

export interface Constraint {
    readonly name?: string;
    toString: () => string;
}

class ConstraintBase implements Constraint {
    readonly name?: string;
    constructor(constraint_name?: string) {
        this.name = constraint_name;
    }
    public toString() {
        return `CONSTRAINT${this.name ? ' ' + this.name : ''}`;
    }
}

/**
 * Sets the column for referencing rows. Values must be unique and not null.
 */
export class PrimaryKey extends ConstraintBase {
    readonly col_name: string;
    constructor(col_name: string, constraint_name?: string) {
        super(constraint_name);
        this.col_name = col_name;
    }
    toString() {
        return super.toString() + ` PRIMARY KEY (${this.col_name})`;
    }
}

/**
 * Requires values in column or columns only occur once in the table.
 */
export class Unique extends ConstraintBase {
    readonly col_name: string;
    constructor(col_name: string, constraint_name?: string) {
        super(constraint_name);
        this.col_name = col_name;
    }
    toString() {
        return super.toString() + ` UNIQUE (${this.col_name})`;
    }
}

/**
 * Sets the column to reference the primary key on another table.
 */
export class ForeignKey extends ConstraintBase implements ReferenceDefinition {
    readonly colName: string;
    readonly tableRef: string;
    readonly columnRef: string;
    readonly referenceOption?: {
        onUpdate?: ReferenceOption;
        onDelete?: ReferenceOption;
    };

    constructor({
        constraint_name,
        colName,
        tableRef,
        columnRef,
        referenceOption,
    }: {
        constraint_name?: string;
        colName: string;
    } & ReferenceDefinition) {
        super(constraint_name);
        this.colName = colName;
        this.tableRef = tableRef;
        this.columnRef = columnRef;
        this.referenceOption = referenceOption;
    }
    toString() {
        return (
            super.toString() +
            ` FOREIGN KEY (${this.colName}) ${referenceDefToString(this)}`
        );
    }
}

export default {
    PrimaryKey,
    Unique,
    ForeignKey,
};
