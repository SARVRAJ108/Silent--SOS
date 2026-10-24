require("dotenv").config();
const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, 
    ssl: isProduction ? { rejectUnauthorized: false} : false
});

pool.on("connect", () => {
    console.log("PostgreSQL connection eastabalished.");
});

pool.on("error", (err) => {
     console.log("Unexpected PostgreSQL connection error:", err.message);
});

module.exports = pool;