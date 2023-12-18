const { Pool } = require('pg');

class PostgresHelper {
    constructor() {
        this.pools = {};
    }

    createConnectionString(user, password, host, port, dbName, sslmode, options) {
        return `postgresql://${user}:${password}@${host}:${port}/${dbName}?sslmode=${sslmode}&options=${options}`;
    }

    createPool(key, connectionString) {
        const pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: true,
            },
        });
        this.pools[key] = pool;
        return pool;
    }

    async executeQuery(pool, query, params) {
        const client = await pool.connect();
        try {
            const res = await client.query(query, params);
            return res.rows;
        } catch (e) {
            console.log("QUERY ERROR:", e);
            throw e;
        } finally {
            client.release();
        }
    }

    async closePools() {
        for (const key in this.pools) {
            await this.pools[key].end();
        }
    }
}

const postgresHelper = new PostgresHelper();

const poolLedger = postgresHelper.createPool('ledger', postgresHelper.createConnectionString(
    process.env.DB_LEDGER_USER,
    process.env.DB_LEDGER_PASSWORD,
    process.env.DB_HOST,
    process.env.DB_PORT,
    process.env.DB_LEDGER_NAME,
    process.env.DB_SSLMODE,
    process.env.DB_OPTIONS
));

const poolJanus = postgresHelper.createPool('janus', postgresHelper.createConnectionString(
    process.env.DB_JANUS_USER,
    process.env.DB_JANUS_PASSWORD,
    process.env.DB_HOST,
    process.env.DB_PORT,
    process.env.DB_JANUS_NAME,
    process.env.DB_SSLMODE,
    process.env.DB_OPTIONS
));

module.exports = {
    executeQueryLedger: (query, params) => postgresHelper.executeQuery(poolLedger, query, params),
    executeQueryJanus: (query, params) => postgresHelper.executeQuery(poolJanus, query, params),
    closePools: () => postgresHelper.closePools()
};
