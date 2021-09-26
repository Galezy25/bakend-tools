export class PermissionsManager {
    private _propertyName: string;
    private _permissionsNames: string[][];

    /**
     * Manage each permission declared like a bit.
     * @param permissionsNames Array with the names of the permissions admitted.
     * @param options (Optional) Object with options to configure this tool.
     * @example
     * ```ts
     *  const pPermissions = new PayloadPermissions([
     *      'products_create',
     *      'products_update',
     *      'products_delete'
     *  ])
     * ```
     * If you use the permissions object:
     * ```ts
     *  {
     *      products_create: true,
     *      products_update: true,
     *      clients_create: true
     *  }
     * ```
     * *pPermissions* object will ignore *clients_create* permission, but manage the others.
     */
    constructor(
        permissionsNames: string[],
        options?: {
            propertyName?: string;
        }
    ) {
        this._permissionsNames = [];
        for (let start = 0; start < permissionsNames.length; start += 50) {
            this._permissionsNames.push(
                permissionsNames.slice(start, start + 50)
            );
        }
        this._propertyName = options?.propertyName || '_pp';

        this.encode = this.encode.bind(this);
        this.decode = this.decode.bind(this);
        this.verifyPayload = this.verifyPayload.bind(this);
        this.getVerifier = this.getVerifier.bind(this);
        this.buildPayload = this.buildPayload.bind(this);
    }

    /**
     * Encode the permissions object into a string.
     * @param permissions Permissions object to encode.
     * @returns A string with a base 32 number (each digit can be between *0* and *v*).
     */
    public encode(permissions: { [permission: string]: boolean }) {
        let encoded = '';
        this._permissionsNames.forEach((segmentNames, index, segments) => {
            let binary: string = '';
            segmentNames.forEach(propName => {
                binary = (Boolean(permissions[propName]) ? '1' : '0') + binary;
            });
            let segmentEncoded = Number.parseInt(binary, 2).toString(32);
            if (index + 1 < segments.length) {
                for (let i = segmentEncoded.length; i <= 10; i++) {
                    segmentEncoded = '0' + segmentEncoded;
                }
            }
            encoded = segmentEncoded + encoded;
        });
        return encoded;
    }

    /**
     * Restore a Permissions object previously encoded.
     * @param encodedPermissions Encoded string with a base 32 number (each digit can be between *0* and *v*)
     * @returns Permissions object.
     */
    public decode(encodedPermissions: string) {
        let encodedArray = encodedPermissions.split('');
        let decodedPermissions: { [permission: string]: boolean } = {};
        for (
            let end = encodedArray.length, segment = 0;
            end > 0 && segment < this._permissionsNames.length;
            end -= 10, segment++
        ) {
            let start = end - 10;
            if (start < 0) start = 0;
            let segmentEncoded = encodedArray.slice(start, end).join('');
            let arrayBinary = Number.parseInt(segmentEncoded, 32)
                .toString(2)
                .split('')
                .reverse();
            arrayBinary.forEach((bin, i) => {
                decodedPermissions[this._permissionsNames[segment][i]] =
                    bin === '1';
            });
        }
        return decodedPermissions;
    }

    /**
     *
     * @param payload Rest of the payload to build.
     * @param permissions Permissions object to encode and set into *propertyName* option (default: *_pp*)
     * @returns Payload object with permissions.
     */
    public buildPayload(
        payload: { [prop: string]: any },
        permissions: { [permission: string]: boolean }
    ) {
        return {
            ...payload,
            [this._propertyName]: this.encode(permissions),
        };
    }

    /**
     *
     * @param payload Object with permissions encoded.
     * @param permissionsNeeded Strings with the name of permissions to verify.
     * @returns Permissions Object decoded.
     */
    public verifyPayload(
        payload: { [prop: string]: any },
        ...permissionsNeeded: string[]
    ) {
        let payloadPermissions = this.decode(payload[this._propertyName]);
        let isPermitted = true;
        for (let i = 0; i < permissionsNeeded.length && isPermitted; i++) {
            isPermitted =
                isPermitted &&
                Boolean(payloadPermissions[permissionsNeeded[i]]);
        }
        return isPermitted && payloadPermissions;
    }

    /**
     * Define a reusable function to verify payloads with a predefined list of permissions needed.
     * @param permissionsNeeded Strings with the name of permissions to verify.
     * @returns Verifier function.
     */
    public getVerifier(...permissionsNeeded: string[]) {
        return (payload: { [prop: string]: any }) =>
            this.verifyPayload(payload, ...permissionsNeeded);
    }
}

export default PermissionsManager;
