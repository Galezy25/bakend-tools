import QueryContext from '../../src/easysql/query.context';

describe('QueryContext', () => {
    test('Field filters', () => {
        let queryContext = new QueryContext()
            .field('id')
            .notEqualTo('1234567890')
            .field('date')
            .between('2025/01/01 00:00:00', '2025/07/01 00:00:00')
            .field('price')
            .lessOrEqualThan(200)
            .field('price')
            .greaterThan(10);
        expect(queryContext.getPureContext()).toMatchObject({
            id_n: '1234567890',
            date_btw: '2025/01/01 00:00:00,2025/07/01 00:00:00',
            price_lseq: 200,
            price_gt: 10,
        });
        expect(queryContext.getFilterSentences()).toMatchSnapshot();
        queryContext.clearContext();

        queryContext
            .field('id')
            .notEqualTo(['789123456', '456789123'])
            .field('id')
            .like(['7%', '4%'])
            .field('price')
            .greaterOrEqualThan(10)
            .field('price')
            .lessThan(200);
        expect(queryContext.getPureContext()).toMatchObject({
            id_n: ['789123456', '456789123'],
            id_like: ['7%', '4%'],
            price_ls: 200,
            price_gteq: 10,
        });
        expect(queryContext.getFilterSentences()).toMatchSnapshot();
    });

    test('Table related', () => {
        let ctxWithRelations = new QueryContext(['users']);
        let ctxWithNoRelations = new QueryContext(undefined,undefined);

        expect(
            ctxWithRelations.populate(
                'left',
                'users',
                'this.leader:users.id',
                'name:leader_name'
            )
        ).toBeDefined();
        expect(ctxWithRelations.getPureContext()).toMatchObject({
            users_left: 'this.leader:users.id,name:leader_name',
        });
        expect(ctxWithRelations.getRelations()).toMatchSnapshot();
        expect(ctxWithRelations.getSelectedFields()).toMatchSnapshot();
        ctxWithRelations.fields('id', 'name', 'email');
        expect(ctxWithRelations.getSelectedFields()).toMatchSnapshot();
        expect(() =>
            ctxWithNoRelations.populate(
                'left',
                'users',
                'this.leader:users.id',
                'users.name:leader_name'
            )
        ).toThrowError();
        expect(ctxWithNoRelations.getPureContext()).not.toMatchObject({
            users_left: 'this.leader:users.id,users.name:leader_name',
        });
        expect(ctxWithNoRelations.getRelations()).toBe('');
        expect(ctxWithNoRelations.getSelectedFields()).toBe('this.*');
    });

    test('setPureContext', () => {
        let ctxSaleProducts = new QueryContext(['products']).setPureContext({
            products_inner:
                'this.product:products.id,description:product_description',
            _fields: 'id,amount,unit_cost,product:product_id',
            client: ['123789', '456127'],
            date_btw: '2025/01/01 00:00:00,2025/07/01 00:00:00',
            sale_nin: '1834,7890',
            _sort: 'sale:ASC',
            _limit: 250,
        });
        expect(ctxSaleProducts.getSelectedFields()).toMatchSnapshot();
        expect(ctxSaleProducts.getRelations()).toMatchSnapshot();
        expect(ctxSaleProducts.getFilterSentences()).toMatchSnapshot();
        expect(ctxSaleProducts.getOrderSentence()).toMatchSnapshot();
        expect(ctxSaleProducts.getLimitSentence()).toMatchSnapshot();

        let ctxToClone = new QueryContext()
            .field('id')
            .notEqualTo('1234567890')
            .field('date')
            .between('2025/01/01 00:00:00', '2025/07/01 00:00:00')
            .field('price')
            .lessOrEqualThan(200)
            .field('price')
            .greaterThan(10);
        let ctxCloned = new QueryContext().setPureContext(
            ctxToClone.getPureContext()
        );
        expect(ctxToClone.getPureContext()).toMatchObject(
            ctxCloned.getPureContext()
        );
    });
});
