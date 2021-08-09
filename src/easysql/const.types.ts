
export const functionsRegexp = new RegExp(/^DEFAULT\S*$|^NULL\S*$|^AES_DECRYPT\S*$|^AES_ENCRYPT\S*$|^BIN\S*$|^CHAR\S*$|^COMPRESS\S*$|^CURRENT_USER\S*$|^DATABASE\S*$|^DAYNAME\S*$|^DES_DECRYPT\S*$|^DES_ENCRYPT\S*$|^ENCRYPT\S*$|^HEX\S*$|^INET6_NTOA\S*$|^INET_NTOA\S*$|^LOAD_FILE\S*$|^LOWER\S*$|^LTRIM\S*$|^MD5\S*$|^MONTHNAME\S*$|^OLD_PASSWORD\S*$|^PASSWORD\S*$|^QUOTE\S*$|^REVERSE\S*$|^RTRIM\S*$|^SHA1\S*$|^SOUNDEX\S*$|^SPACE\S*$|^TRIM\S*$|^UNCOMPRESS\S*$|^UNHEX\S*$|^UPPER\S*$|^USER\S*$|^UUID\S*$|^VERSION\S*$|^ABS\S*$|^ACOS\S*$|^ASCII\S*$|^ASIN\S*$|^ATAN\S*$|^BIT_COUNT\S*$|^BIT_LENGTH\S*$|^CEILING\S*$|^CHAR_LENGTH\S*$|^CONNECTION_ID\S*$|^COS\S*$|^COT\S*$|^CRC32\S*$|^CURRENT_DATE\S*$|^CURRENT_TIME\S*$|^DATE\S*$|^DAYOFMONTH\S*$|^DAYOFWEEK\S*$|^DAYOFYEAR\S*$|^DEGREES\S*$|^EXP\S*$|^FLOOR\S*$|^FROM_DAYS\S*$|^FROM_UNIXTIME\S*$|^HOUR\S*$|^INET6_ATON\S*$|^INET_ATON\S*$|^LAST_DAY\S*$|^LENGTH\S*$|^LN\S*$|^LOG\S*$|^LOG10\S*$|^LOG2\S*$|^MICROSECOND\S*$|^MINUTE\S*$|^MONTH\S*$|^NOW\S*$|^OCT\S*$|^ORD\S*$|^PI\S*$|^QUARTER\S*$|^RADIANS\S*$|^RAND\S*$|^ROUND\S*$|^SECOND\S*$|^SEC_TO_TIME\S*$|^SIGN\S*$|^SIN\S*$|^SQRT\S*$|^SYSDATE\S*$|^TAN\S*$|^TIME\S*$|^TIMESTAMP\S*$|^TIME_TO_SEC\S*$|^TO_DAYS\S*$|^TO_SECONDS\S*$|^UNCOMPRESSED_LENGTH\S*$|^UNIX_TIMESTAMP\S*$|^UTC_DATE\S*$|^UTC_TIME\S*$|^UTC_TIMESTAMP\S*$|^UUID_SHORT\S*$|^WEEK\S*$|^WEEKDAY\S*$|^WEEKOFYEAR\S*$|^YEAR\S*$|^YEARWEEK\S*$/, 'g');

export type DataTypesString = "CHAR" | "VARCHAR" | "BINARY" | "VARBINARY" | "TINYBLOB" |
    "TINYTEXT" | "TEXT" | "BLOB" | "MEDIUMTEXT" | "MEDIUMBLOB" | "LONGTEXT" |
    "LONGBLOB" | "ENUM" | "SET";
export type DataTypesNumber = "BIT" | "TINYINT" | "BOOL" | "BOOLEAN" | "SMALLINT" |
    "MEDIUMINT" | "INT" | "INTEGER" | "BIGINT" | "FLOAT" | "DOUBLE" |
    "DOUBLE PRECISION" | "DECIMAL" | "DEC";
export type DataTypesDate = "DATE" | "DATETIME" | "TIMESTAMP" | "TIME" | "YEAR";

export type DataTypes = DataTypesString | DataTypesNumber | DataTypesDate;

export type ReferenceOption = "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION" | "SET DEFAULT";

export interface ReferenceDefinition {
    /**
     * Name of the table to reference
     */
    tableRef: string,
    /**
     * Name of the column or columns (separate with comma) to reference
     */
    columnRef: string,
    /**
     * Set actions when an UPDATE or DELETE operation affects a key value referenced
     */
    referenceOption?: {
        /**
         * Action when an UPDATE operation affects a key value referenced 
         */
        onUpdate?: ReferenceOption,
        /**
         * Action when an DELETE operation affects a key value referenced
         */
        onDelete?: ReferenceOption
    }
}

export type DataType = [DataTypes, ...(string | number)[]] | DataTypes;

export interface ColumnDefinition {
    /**
     * Type of the column.
     * @example
     * ```ts
     *      dataType: "INT"
     * ```
     * @example
     * ```ts
     *      dataType: ["VARCHAR", 50]
     * ```
     * @example
     * ```ts
     *      dataType: ["ENUM", 'val_1', 'val_2', 'val_3']
     * ```
     */
    readonly dataType: DataType,
    /**
     * If is true, the column can accept NULL, if it's false not.
     */
    readonly null?: boolean,
    /**
     * Default value of the column, it can be a SQL functions.
     */
    readonly default?: any,
    /**
     * If it's false the column will then not be listed in the results of a SELECT * statement.
     */
    readonly visible?: boolean,
    /**
     * If it's true, when you insert a new record to the table the value will automatically be incremented.
     */
    readonly autoIncremet?: boolean,
    /**
     * Set if it requires values in column that only occur once.
     */
    readonly unique?: boolean,
    /**
     * Sets the column for referencing rows. Values must be unique and not null.
     */
    readonly primaryKey?: boolean,
    /**
     * Add a coment to the column
     */
    readonly comment?: string,
    /**
     * 
     */
    readonly collate?: string,
    /**
     * 
     */
    readonly columnFormat?: "FIXED" | "DYNAMIC" | "DEFAULT",
    /**
     * Sets the column to reference the primary key on another table.
     */
    readonly referenceDefinition?: ReferenceDefinition
}

export function columnDefToString(definition: ColumnDefinition) {
    let result: string[] = [dataTypeToString(definition.dataType)];
    if (definition.null !== undefined) {
        result.push((definition.null) ? 'NULL' : 'NOT NULL')
    }
    if (definition.default !== undefined) {
        const defaultString = typeof definition.default === "string" ?
            (functionsRegexp.test(definition.default) ? definition.default : `'${definition.default}'`)
            : definition.default + '';
        result.push('DEFAULT ' + defaultString);
    }
    if (definition.visible !== undefined) {
        result.push((definition.visible) ? 'VISIBLE' : 'INVISIBLE')
    }
    if (definition.autoIncremet) result.push('AUTO_INCREMENT');
    if (definition.unique) result.push('UNIQUE');
    if (definition.primaryKey) result.push('PRIMARY KEY');
    if (definition.comment) result.push(`COMMENT '${definition.comment}'`);
    if (definition.collate) result.push(`COLLATE ${definition.collate}`);
    if (definition.columnFormat) result.push(`COLUMN_FORMAT ${definition.columnFormat}`);
    if (definition.referenceDefinition) result.push(referenceDefToString(definition.referenceDefinition));

    return result.join(' ');
}

function dataTypeToString(dataType: DataType) {
    if (typeof dataType === 'string') {
        return dataType;
    } else {
        const [type, ...params] = dataType;
        const paramsString = (params.length > 0) ?
            "(" + params.map(param => typeof param === "string" ? `'${param}'` : param) + ")" : ''
        return type + paramsString;

    }
}

export function referenceDefToString({
    tableRef,
    columnRef,
    referenceOption
}: ReferenceDefinition) {
    let options = '';
    if (referenceOption?.onUpdate) {
        options += ' ON UPDATE ' + referenceOption.onUpdate
    }
    if (referenceOption?.onDelete) {
        options += ' ON DELETE ' + referenceOption.onDelete
    }
    return 'REFERENCES ' + tableRef + '(' + columnRef + ')' + options
}
