
describe('Environment Security', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('Should throw error if JWT_SECRET missing in production', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.JWT_SECRET;

        expect(() => {
            require('../routes/authRoutes');
        }).toThrow('FATAL: JWT_SECRET is not defined in production environment');
    });

    test('Should not throw in development even if JWT_SECRET missing', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.JWT_SECRET;

        expect(() => {
            require('../routes/authRoutes');
        }).not.toThrow();
    });
});
