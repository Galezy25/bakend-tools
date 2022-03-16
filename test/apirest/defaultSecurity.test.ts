import { Request, Response } from 'express';

import { defaultSecurity } from '../../src/apirest';

describe('apirest/defaultSecurity', () => {
    const ErrorMessage = 'TEST ERROR';
    const token = 'TEST_AUTH_TOKEN';
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    const payloadTest = {
        test: true,
    };

    const mockVerifyToken = jest.fn(async () => payloadTest);
    const mockVerifyTokenThrow = jest.fn(async () => {
        throw new Error(ErrorMessage);
    });
    const mockNext = jest.fn();
    const getSecurityMiddleware = defaultSecurity(mockVerifyToken);
    const getSecurityErrorMiddleware = defaultSecurity(mockVerifyTokenThrow);

    beforeEach(() => {
        mockNext.mockClear();
        mockVerifyToken.mockClear();
        mockVerifyTokenThrow.mockClear();
    });

    test('Auth needed test', async () => {
        const authNeeded = getSecurityMiddleware();

        mockRequest = {
            headers: {
                authorization: token,
            },
        };

        await authNeeded(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockVerifyToken.mock.calls[0]).toMatchObject([token]);
        expect(mockNext.mock.calls[0][0]).toBeUndefined();
    });

    test('Valid payload test', async () => {
        const mockVerifyPayload = jest.fn(() => true);
        mockVerifyPayload.mockClear();
        const validPayload = getSecurityMiddleware(mockVerifyPayload);
        const cookiesTest = { test: 'cookieTest' };
        const headersTest = {
            authorization: token,
        };
        const paramsTest = {
            test: 'paramTest',
        };
        const queryTest = {
            test: 'queryTest',
        };

        mockRequest = {
            headers: headersTest,
            cookies: cookiesTest,
            params: paramsTest,
            query: queryTest,
        };

        await validPayload(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockVerifyToken.mock.calls[0]).toMatchObject([token]);
        expect(mockVerifyPayload.mock.calls[0]).toMatchObject([
            {
                _params: paramsTest,
                _query: queryTest,
                _headers: headersTest,
                _cookies: cookiesTest,
                ...payloadTest,
            },
        ]);
        expect(mockNext.mock.calls[0][0]).toBeUndefined();
    });

    test('Error test', async () => {
        const authNeeded = getSecurityMiddleware();
        const authNeededErrorToken = getSecurityErrorMiddleware();
        const payloadInvalid = getSecurityMiddleware(() => false);
        mockRequest = {
            headers: {},
        };
        await authNeeded(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockVerifyToken).not.toBeCalled();
        expect(mockNext.mock.calls[0][0]).toMatchObject({
            statusCode: 401,
        });

        mockRequest = {
            headers: {
                authorization: token,
            },
        };

        await authNeededErrorToken(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockVerifyTokenThrow.mock.calls[0]).toMatchObject([token]);
        expect(mockNext.mock.calls[1][0]).toMatchObject({
            message: ErrorMessage,
        });

        await payloadInvalid(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockVerifyToken.mock.calls[0]).toMatchObject([token]);
        expect(mockNext.mock.calls[2][0]).toMatchObject({
            statusCode: 403,
        });
    });
});
