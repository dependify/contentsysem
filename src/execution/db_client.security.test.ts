
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Mock process.env
const originalEnv = process.env;

describe('Database Client Security', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        // We need to mock pg Pool to prevent actual connection attempts
        jest.mock('pg', () => {
            return {
                Pool: jest.fn().mockImplementation(() => ({
                    connect: jest.fn(),
                    on: jest.fn(),
                    end: jest.fn()
                }))
            };
        });
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('Should throw error if DATABASE_URL has placeholder in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'postgres://username:password@host:5432/db';

        // We need to re-import db_client to trigger the constructor logic
        // But db_client exports an instance `db`.
        // So we might need to catch the error when requiring the module.

        expect(() => {
            jest.isolateModules(() => {
                require('../execution/db_client');
            });
        }).toThrow(/FATAL: DATABASE_URL contains placeholder values/);
    });

    test('Should throw error if DATABASE_URL is missing in production', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.DATABASE_URL;

        expect(() => {
            jest.isolateModules(() => {
                require('../execution/db_client');
            });
        }).toThrow(/FATAL: DATABASE_URL is not defined/);
    });

    test('Should NOT throw in development with placeholders', () => {
        process.env.NODE_ENV = 'development';
        process.env.DATABASE_URL = 'postgres://username:password@host:5432/db';

        expect(() => {
             jest.isolateModules(() => {
                require('../execution/db_client');
            });
        }).not.toThrow();
    });
});
