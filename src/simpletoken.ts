import bcrypt from 'bcrypt';

import { ErrorHTTP } from './error.handler';

export class SimpleToken<Payload = any> {
    private _key: string;
    private _saltRounds: number;

    /**
     *
     * @param key Secret string to sign the token.
     * @param saltRounds Cost factor to hash
     */
    constructor(
        key: string = Date.now().toString(36),
        saltRounds: number = 10
    ) {
        this._key = key;
        this._saltRounds = saltRounds;
        this.verify = this.verify.bind(this);
        this.sign = this.sign.bind(this);
    }

    /**
     *
     * @param token Token string to verify
     * @returns Promise that resolve with the payload if the token is valid
     */
    public async verify(token: string) {
        const [expEncoded, payloadEncoded, signature] = token.split('.');
        const isSigned = await bcrypt.compare(
            this.getStringToSign(expEncoded, payloadEncoded),
            this.decode(signature)
        );
        if (isSigned) {
            const payload: Payload = JSON.parse(this.decode(payloadEncoded));
            const exp = Number.parseInt(this.decode(expEncoded));
            const isOnDate = !exp || exp >= new Date().getTime();
            if (isOnDate) {
                return payload;
            } else {
                throw new ErrorHTTP('Expired', {
                    statusCode: 403,
                    message: `Expired`,
                });
            }
        } else {
            throw new ErrorHTTP('Signature incorrect', {
                statusCode: 401,
                message: `Signature incorrect`,
            });
        }
    }

    /**
     *
     * @param payload Payload to encode into the token
     * @param expiresIn (Optional) Seconds of lifetime before expires.
     * @returns Token string.
     */
    public sign(payload: Payload, expiresIn?: number) {
        const payloadEncoded = this.encode(JSON.stringify(payload));
        let expDate = new Date();
        expDate.setSeconds(expDate.getSeconds() + (expiresIn || 0));
        const expEncoded = this.encode(
            expiresIn ? expDate.getTime() + '' : NaN + ''
        );
        return (
            expEncoded +
            '.' +
            payloadEncoded +
            '.' +
            this.signature(expEncoded, payloadEncoded)
        );
    }

    private decode(encoded: string): string {
        return Buffer.from(encoded, 'base64').toString();
    }

    private encode(decoded: string): string {
        return Buffer.from(decoded).toString('base64');
    }

    private signature(expEncoded: string, payloadEncoded: string) {
        let hash = bcrypt.hashSync(
            this.getStringToSign(expEncoded, payloadEncoded),
            this._saltRounds
        );
        return this.encode(hash);
    }

    private getStringToSign(expEncoded: string, payloadEncoded: string) {
        return expEncoded + payloadEncoded + this._key;
    }
}
export default SimpleToken;
