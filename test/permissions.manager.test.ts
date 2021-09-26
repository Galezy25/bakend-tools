import { PermissionsManager } from '../src';

describe('PermissionsManager tests', () => {
    const permissionsManager = new PermissionsManager([
        'products_create',
        'products_update',
        'products_delete',
        'clients_create',
        'clients_update',
        'clients_delete',
        'providers_create',
        'providers_update',
        'providers_delete',
        'admin_users',
    ]);

    const adminUsersVerify = permissionsManager.getVerifier('admin_users');

    test('Encode and decode permissions', () => {
        const permissions = {
            clients_create: true,
            clients_update: true,
            providers_create: true,
            providers_update: true,
        };
        const encoded = permissionsManager.encode(permissions);
        expect(encoded).toBe('6o');
        const decoded = permissionsManager.decode(encoded);
        expect(decoded).toMatchObject(permissions);
    });

    test('Build and verify payload with permissions', () => {
        const permissions = {
            products_delete: true,
            clients_delete: true,
            providers_delete: true,
            admin_users: true,
        };
        const payload = permissionsManager.buildPayload(
            {
                user: 'admin',
            },
            permissions
        );
        expect(payload).toMatchObject({
            user: 'admin',
            _pp: 'p4',
        });

        expect(
            permissionsManager.verifyPayload(payload, 'clients_delete')
        ).toMatchObject(permissions);

        expect(
            permissionsManager.verifyPayload(
                payload,
                'clients_create',
                'clients_update',
                'clients_delete'
            )
        ).toBeFalsy();

        expect(adminUsersVerify(payload)).toBeDefined();
    });
});
