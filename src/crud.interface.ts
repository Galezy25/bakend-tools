export default interface CRUD {
    id_name: string;
    find: <T = any[]>(context: { [key: string]: any }) => Promise<T>;
    findOne: <T = any>(context: { [key: string]: any }) => Promise<T>;
    create: (valuesToCreate: any) => Promise<any>;
    update: (
        context: { [key: string]: any },
        valuesToUpdate: any
    ) => Promise<any>;
    delete: (context: { [key: string]: any }) => Promise<any>;
}
