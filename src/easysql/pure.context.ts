/**
 * Set the order of the array will get it
 *  - Sorted ascending by the field_name
 *  ```ts
 *      _sort: `${field_name}:ASC`
 *  ```
 *  - Sorted descending by the field_name
 *  ```ts
 *      _sort: `${field_name}:DESC`
 *  ```
 *
 * Set how many rows to get
 * ```ts
 *   _limit: number_of_rows
 * ```
 *
 * Set the index who start to get it
 * ```ts
 *   // The index of the first element is 0, and the last is length - 1
 *   _start: index
 * ```
 *
 * Set wich fields of this table will get it
 * ```ts
 *   _fields: `${field_1},${field_2},${field_3}:${alias_field_3},${field_n}`
 * ```
 *
 * Set filter values
 *
 *  - Rows with field_name equal to value
 *  ```ts
 *      [field_name]: value
 *  ```
 *
 *  - Rows with field_name not equal to value
 *  ```ts
 *      [field_name + '_n']: value
 *  ```
 *
 *  - Rows with field_name must be equal to val_1, val_2 or val_3
 *  ```ts
 *      [field_name + '_in']: `${val_1},${val_2},${val_3}`
 *  ```
 *
 *  - Rows with field_name must not be equal to val_1, val_2 or val_3
 *  ```ts
 *      [field_name + '_nin']: `${val_1},${val_2},${val_3}`
 *  ```
 *
 *  - Rows with field_name greater than value
 *  ```ts
 *      [field_name + '_gt']: value
 *  ```
 *
 *  - Rows with field_name greater than or equal to value
 *  ```ts
 *      [field_name + '_gteq']: value
 *  ```
 *
 *  - Rows with field_name less than value
 *  ```ts
 *      [field_name + '_ls']: value
 *  ```
 *
 *  - Rows with field_name less than or equal to value
 *  ```ts
 *      [field_name + '_lseq']: value
 *  ```
 *
 *  - Rows with field_name math with the pattern
 *  ```ts
 *      [field_name + '_like']: pattern
 *  ```
 *
 *  - Rows with field_name is between value_1 and value_2
 *  ```ts
 *      [field_name + '_btw']:  `${value_1}:${value_2}`
 *  ```
 *
 * Populate relation examples
 *
 * - Inner join table_name on field_1 = field_2
 * ```ts
 *      [table_name + '_inner']:  `${field_1}:${field_2}`
 * ```
 *
 * - Left join table_name on field_1 = field_2
 * ```ts
 *      [table_name + '_left']:  `${field_1}:${field_2}`
 * ```
 *
 * - Right join table_name on field_1 = field_2
 * ```ts
 *      [table_name + '_right']:  `${field_1}:${field_2}`
 * ```
 *
 * - Full join table_name on field_1 = field_2 and select
 *      field_3 and field_4 as `alias` of table_name
 * ```ts
 *      [table_name + '_full']:  `${field_1}:${field_2},${field_3},${field_4}:alias`
 * ```
 *
 * You may use 'this' to do a reference to this table example.
 * ```ts
 *      {
 *          teams_left: 'this.team:teams.id'
 *      }
 * ```eference to this table example.
 * ```ts
 *      {
 *          teams_left: 'this.team:teams.id'
 *      }
 * ```
 */
export interface PureContext {
    [filterOrJoin: string]: Value | Value[] | string | undefined;
    _sort?: string;
    _limit?: number;
    _start?: number;
    _fields?: string;
}

export type Value = string | number | null | boolean;
