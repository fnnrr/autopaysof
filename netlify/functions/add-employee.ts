import { Handler } from '@netlify/functions';
import { Pool } from 'pg';
import { Employee, Role } from '../../types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const respond = (statusCode: number, body: any) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

const generateUniqueId = async (client: any, role: Role): Promise<string> => {
    const prefixMap: Record<Role, string> = { Admin: 'ADM', Clerk: 'CLK', Employee: 'EMP' };
    const prefix = prefixMap[role];
    
    const query = `SELECT id FROM employees WHERE id LIKE $1 ORDER BY id DESC LIMIT 1`;
    const result = await client.query(query, [`${prefix}-%`]);

    let nextId = 1;
    if (result.rows.length > 0) {
        const lastId = parseInt(result.rows[0].id.split('-')[1], 10);
        nextId = lastId + 1;
    }
    
    return `${prefix}-${String(nextId).padStart(5, '0')}`;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method Not Allowed' });
  }

  const client = await pool.connect();
  try {
    const { name, salary, role } = JSON.parse(event.body || '{}');

    if (!name || !salary || !role) {
      return respond(400, { error: 'Missing required fields: name, salary, role.' });
    }

    const newId = await generateUniqueId(client, role);
    const registrationDate = new Date().toISOString();

    const newEmployee: Employee = { id: newId, name, salary, role, registrationDate };

    const insertQuery = 'INSERT INTO employees(id, name, salary, role, "registrationDate") VALUES($1, $2, $3, $4, $5) RETURNING *';
    const result = await client.query(insertQuery, [newId, name, salary, role, registrationDate]);

    return respond(201, result.rows[0]);
  } catch (error) {
    console.error('Database Error in add-employee:', error);
    return respond(500, { error: 'Failed to add employee.', details: error.message });
  } finally {
    client.release();
  }
};