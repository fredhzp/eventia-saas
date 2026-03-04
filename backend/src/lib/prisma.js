require('dotenv').config(); // Ensure our environment variables are loaded
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// 1. Setup the connection pool using the pg driver
const connectionString = process.env.DATABASE_URL || "postgresql://admin:password123@localhost:5432/eventia_db";
const pool = new Pool({ connectionString });

// 2. Create the Prisma Adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to PrismaClient (This fixes the Initialization Error!)
const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV === 'development') global.prisma = prisma;

module.exports = prisma;