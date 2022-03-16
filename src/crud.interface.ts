export interface CRUD {
    id_name: string;
    find: <T = any[]>(context: { [key: string]: any }) => Promise<T>;
    findOne: <T = any>(context: { [key: string]: any }) => Promise<T>;
    count: (context: { [key: string]: any }) => Promise<number>;
    create: (
        valuesToCreate: any
    ) => Promise<{
        [key: string]: any;
        insertId: any;
    }>;
    update: (
        context: { [key: string]: any },
        valuesToUpdate: any
    ) => Promise<any>;
    replace: (valuesToReplace: any) => Promise<any>;
    delete: (context: { [key: string]: any }) => Promise<any>;
}

export default CRUD;
