import { ColumnDefinition, columnDefToString, DataType } from './const.types';

export default class Column {
    protected _name: string;
    protected _definition: ColumnDefinition;
    private _order?: 'FIRST' | string;

    /**
     * How is named this column.
     */
    public get name() {
        return this._name;
    }

    /**
     * Configuration of this column.
     */
    public get definition() {
        return this._definition;
    }

    /**
     *
     * @returns This column into a string
     */
    public toString() {
        return (
            this.name +
            ' ' +
            columnDefToString(this._definition) +
            this.orderString()
        );
    }

    constructor(name: string, definition: ColumnDefinition) {
        this._name = name;
        this._definition = definition || {};

        this.toString = this.toString.bind(this);
        this.modify = this.modify.bind(this);
        this.change = this.change.bind(this);
        this.rename = this.rename.bind(this);
        this.setAfter = this.setAfter.bind(this);
        this.setFirst = this.setFirst.bind(this);
    }

    /**
     *
     * @param changes Column definition with the values to update.
     * @returns This object.
     */
    public modify(changes: ColumnDefinition & { dataType?: DataType }) {
        this._definition = { ...this._definition, ...changes };
        return this;
    }

    /**
     *
     * @param newName How will be named this column.
     * @param definitionChanges Column definition with the values to update.
     * @returns This object.
     */
    public change(
        newName: string,
        definitionChanges: ColumnDefinition & { dataType?: DataType }
    ) {
        this.rename(newName);
        this.modify(definitionChanges);
        return this;
    }

    /**
     *
     * @param newName How will be named this column.
     * @returns This object.
     */
    public rename(newName: string) {
        this._name = newName;
        return this;
    }

    /**
     * Set the order of the column after columnName.
     * @param columnName Name of the column that will be before this column.
     * @returns This object.
     */
    public setAfter(columnName: string) {
        this._order = columnName;
        return this;
    }

    /**
     * Set this column at the first place of the table.
     * @returns
     */
    public setFirst() {
        this._order = 'FIRST';
        return this;
    }

    private orderString() {
        return this._order
            ? this._order === 'FIRST'
                ? ' FIRST'
                : ' AFTER ' + this._order
            : '';
    }
}
