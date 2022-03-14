import { escape } from 'mysql';
import { PureContext, Value } from './pure.context';

type PopulateType = 'inner' | 'left' | 'right' | 'full';

/* 
    populate relation pattern 
    <table_name>_<'inner' | 'left' | 'right' | 'full'>=<condition>,<field1 selected>,...,<fieldN selected>
*/
const RE_join = new RegExp(/^(\S+_inner)|(\S+_left)|(\S+_right)|(\S+_full)$/);

const FORMAT_FIELD = /\S+:{0,1}\S+/;
const FORMAT_RULE = /\S+(_\S+)*/;

export class QueryContext<
    Fieldname extends string = string,
    TablesRelated extends string = string
> {
    private _pureContext: PureContext = {};

    private _selectedfields: string[] = [];
    private _populateSentences: {
        [key: string]: string;
    } = {};
    private _filterSentences: {
        [key: string]: string;
    } = {};
    private _populateOnlyWith: string[] = [];
    private _fieldnames: string[] = [];

    /**
     *
     * @param populateOnlyWith
     * Array of tables name that can be related.
     *
     */
    constructor(
        populateOnlyWith: TablesRelated[] = [],
        fieldnames: Fieldname[] = []
    ) {
        this._populateOnlyWith = populateOnlyWith;
        this._fieldnames = fieldnames;
    }

    clearContext() {
        this._pureContext = {};
        this._selectedfields = [];
        this._populateSentences = {};
        this._filterSentences = {};

        return this;
    }

    /**
     * * @param context
     
     */
    setPureContext(context: PureContext) {
        for (let rule of Object.getOwnPropertyNames(context)) {
            if (!FORMAT_RULE.test(rule)) {
                throw new Error(`Invalid rule (${rule})`);
            }
            if (RE_join.test(rule)) {
                let tablename = rule.substring(0, rule.lastIndexOf('_'));
                let type = rule.replace(`${tablename}_`, '') as PopulateType;
                let [condition, ...fields] = context[rule]!.toString().split(
                    ','
                );
                this.populate(
                    type,
                    tablename as TablesRelated,
                    condition,
                    ...fields
                );
            } else {
                let ruleParts = rule.split('_');
                let typeRule = ruleParts.splice(ruleParts.length - 1, 1)[0];
                let fieldname = ruleParts.join('_');
                let contextValue = context[rule] as any;
                let values = contextValue.toString().split(',');
                switch (typeRule) {
                    case 'sort':
                        let [field, order] = values[0].split(':');
                        this.orderBy(field, order as 'ASC' | 'DESC');
                        break;
                    case 'limit':
                        this.limit(Number(values[0]));
                        break;
                    case 'start':
                        this.startAt(Number(values[0]));
                        break;
                    case 'fields':
                        this.fields(...values);
                        break;
                    case 'n':
                        this.notEqualTo(fieldname)(contextValue);
                        break;
                    case 'in':
                        this.oneOf(fieldname)(values);
                        break;
                    case 'nin':
                        this.notOneOf(fieldname)(values);
                        break;
                    case 'btw':
                        this.between(fieldname)(values[0], values[1]);
                        break;
                    case 'like':
                        this.like(fieldname)(contextValue);
                        break;
                    case 'ls':
                        this.lessThan(fieldname)(contextValue);
                        break;
                    case 'lseq':
                        this.lessOrEqualThan(fieldname)(contextValue);
                        break;
                    case 'gt':
                        this.greaterThan(fieldname)(contextValue);
                        break;
                    case 'gteq':
                        this.greaterOrEqualThan(fieldname)(contextValue);
                        break;
                    default:
                        this.equalTo(
                            fieldname + (fieldname ? '_' + typeRule : typeRule)
                        )(contextValue);
                }
            }
        }
        return this;
    }

    getPureContext() {
        return { ...this._pureContext };
    }

    field(fieldname: Fieldname) {
        if (this._fieldnames.length && !this._fieldnames.includes(fieldname)) {
            throw new Error(`Invalid field name (${fieldname})`);
        }
        return {
            equalTo: this.equalTo(fieldname),
            notEqualTo: this.notEqualTo(fieldname),
            oneOf: this.oneOf(fieldname),
            notOneOf: this.notOneOf(fieldname),
            between: this.between(fieldname),
            like: this.like(fieldname),
            lessThan: this.lessThan(fieldname),
            lessOrEqualThan: this.lessOrEqualThan(fieldname),
            greaterThan: this.greaterThan(fieldname),
            greaterOrEqualThan: this.greaterOrEqualThan(fieldname),
        };
    }

    private equalTo = (fieldname: string) => (
        value: Value | Value[]
    ): QueryContext<Fieldname, TablesRelated> => {
        this._pureContext[`${fieldname}`] = value;
        if (value instanceof Array) {
            this._filterSentences[`${fieldname}`] = `(${value
                .map(val => `${fieldname} = ${escape(val)}`)
                .join(' OR ')})`;
        } else {
            this._filterSentences[`${fieldname}`] = `${fieldname} = ${escape(
                value
            )}`;
        }
        return this;
    };

    private notEqualTo = (fieldname: string) => (
        value: Value | Value[]
    ): QueryContext<Fieldname, TablesRelated> => {
        this._pureContext[`${fieldname}_n`] = value;
        if (value instanceof Array) {
            this._filterSentences[`${fieldname}_n`] = `(${value
                .map(val => `${fieldname} <> ${escape(val)}`)
                .join(' OR ')})`;
        } else {
            this._filterSentences[`${fieldname}_n`] = `${fieldname} <> ${escape(
                value
            )}`;
        }
        return this;
    };

    private oneOf = (fieldname: string) => (
        values: Value[]
    ): QueryContext<Fieldname, TablesRelated> => {
        this._pureContext[`${fieldname}_in`] = values;
        this._filterSentences[
            `${fieldname}_in`
        ] = `${fieldname} IN (${values.map(value => escape(value)).join(',')})`;
        return this;
    };

    private notOneOf = (fieldname: string) => (
        values: Value[]
    ): QueryContext<Fieldname, TablesRelated> => {
        this._pureContext[`${fieldname}_nin`] = values;
        this._filterSentences[
            `${fieldname}_nin`
        ] = `${fieldname} NOT IN (${values
            .map(value => escape(value))
            .join(',')})`;
        return this;
    };

    private between = (fieldname: string) => (
        minor: Value,
        major: Value
    ): QueryContext<Fieldname, TablesRelated> => {
        this._pureContext[`${fieldname}_btw`] = `${minor},${major}`;
        this._filterSentences[
            `${fieldname}_btw`
        ] = `${fieldname} BETWEEN ${escape(minor)} AND ${escape(major)}`;
        return this;
    };

    private like = (fieldname: string) => (
        value: string | string[]
    ): QueryContext<Fieldname, TablesRelated> => {
        this._pureContext[`${fieldname}_like`] = value;
        if (value instanceof Array) {
            this._filterSentences[`${fieldname}_like`] = `(${value
                .map(val => `${fieldname} LIKE ${escape(val)}`)
                .join(' OR ')})`;
        } else {
            this._filterSentences[
                `${fieldname}_like`
            ] = `${fieldname} LIKE ${escape(value)}`;
        }
        return this;
    };

    private lessThan = (fieldname: string) => (
        value: Value
    ): QueryContext<Fieldname, TablesRelated> => {
        this._pureContext[`${fieldname}_ls`] = value;
        this._filterSentences[`${fieldname}_ls`] = `${fieldname} < ${escape(
            value
        )}`;
        return this;
    };

    private lessOrEqualThan = (fieldname: string) => (
        value: Value
    ): QueryContext<Fieldname, TablesRelated> => {
        this._pureContext[`${fieldname}_lseq`] = value;
        this._filterSentences[`${fieldname}_lseq`] = `${fieldname} <= ${escape(
            value
        )}`;
        return this;
    };

    private greaterThan = (fieldname: string) => (
        value: Value
    ): QueryContext<Fieldname, TablesRelated> => {
        this._pureContext[`${fieldname}_gt`] = value;
        this._filterSentences[`${fieldname}_gt`] = `${fieldname} > ${escape(
            value
        )}`;
        return this;
    };

    private greaterOrEqualThan = (fieldname: string) => (
        value: Value
    ): QueryContext<Fieldname, TablesRelated> => {
        this._pureContext[`${fieldname}_gteq`] = value;
        this._filterSentences[`${fieldname}_gteq`] = `${fieldname} >= ${escape(
            value
        )}`;
        return this;
    };

    populate(
        type: PopulateType,
        tablename: TablesRelated,
        condition: string,
        ...fields: string[]
    ) {
        if (!this._populateOnlyWith.includes(tablename)) {
            throw new Error(`Invalid table to populate (table = ${tablename})`);
        }

        let content = [condition, ...fields];
        this._pureContext[`${tablename}_${type}`] = content
            .map(con => {
                if (FORMAT_FIELD.test(con)) return con;
                else throw new Error('Wrong format');
            })
            .join(',');

        let fieldRelation = condition.split(':');

        this._populateSentences[
            `${tablename}_${type}`
        ] = `${type.toUpperCase()} JOIN ${tablename} ON ${fieldRelation[0]} = ${
            fieldRelation[1]
        }`;

        this._selectedfields = [
            ...this._selectedfields,
            ...fields.map(field => {
                let [original, alias] = field.split(':');
                return `${tablename}.${original}${alias ? ` AS ${alias}` : ''}`;
            }),
        ];
        return this;
    }

    orderBy(fieldname: string, order: 'ASC' | 'DESC') {
        if (order !== 'ASC' && order !== 'DESC') {
            throw new Error('Invalid order');
        }
        this._pureContext._sort = `${fieldname}:${order}`;
        return this;
    }

    startAt(index: number) {
        this._pureContext._start = index;
        return this;
    }

    limit(n: number) {
        this._pureContext._limit = n;
        return this;
    }

    fields(...fieldnames: string[]) {
        this._pureContext._fields = fieldnames
            .map(fieldname => {
                if (FORMAT_FIELD.test(fieldname)) return fieldname;
                else throw new Error('Wrong format');
            })
            .join(',');

        this._selectedfields = [
            ...fieldnames.map(field => {
                let [original, alias] = field.split(':');
                return `this.${original}${alias ? ` AS ${alias}` : ''}`;
            }),
            ...this._selectedfields,
        ];

        return this;
    }

    getSelectedFields() {
        return this._selectedfields.length
            ? (this._pureContext._fields ? '' : 'this.*, ') +
                  this._selectedfields.join(', ')
            : 'this.*';
    }

    getRelations() {
        return Object.entries(this._populateSentences)
            .map(([_key, value]) => value)
            .join(' ');
    }

    getFilterSentences() {
        return Object.entries(this._filterSentences)
            .map(([_key, value]) => value)
            .join(' AND ');
    }

    getOrderSentence() {
        if (this._pureContext._sort) {
            let [fieldname, order] = this._pureContext._sort.split(':');
            return `ORDER BY ${fieldname} ${order}`;
        }
        return '';
    }

    getLimitSentence() {
        if (
            this._pureContext._limit !== undefined ||
            this._pureContext._start !== undefined
        ) {
            return (
                'LIMIT ' +
                (this._pureContext._start
                    ? this._pureContext._start + ', '
                    : '') +
                (this._pureContext._limit
                    ? this._pureContext._limit
                    : '18446744073709551615')
            );
        }
        return '';
    }
}

export default QueryContext;
