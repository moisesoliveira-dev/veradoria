import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Erro inesperado no pool do PostgreSQL:', err);
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result.rows as T[];
    } finally {
        client.release();
    }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows[0] || null;
}

export async function execute(text: string, params?: any[]): Promise<number> {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result.rowCount || 0;
    } finally {
        client.release();
    }
}
