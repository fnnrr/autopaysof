import { Handler } from '@netlify/functions';
import { Pool } from 'pg';

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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method Not Allowed' });
  }

  const client = await pool.connect();
  try {
    const { id, salary } = JSON.parse(event.body || '{}');

    if (!id || salary === undefined) {
      return respond(400, { error: 'Missing required fields: id, salary.' });
    }
    if (typeof salary !== 'number' || salary <= 0) {
      return respond(400, { error: 'Salary must be a positive number.' });
    }
    
    const updateQuery = 'UPDATE employees SET salary = $1 WHERE id = $2 RETURNING *';
    const result = await client.query(updateQuery, [salary, id]);
    
    if (result.rows.length === 0) {
        return respond(404, { error: 'Employee not found.' });
    }

    return respond(200, result.rows[0]);
  } catch (error) {
    console.error('Database Error in update-employee-salary:', error);
    return respond(500, { error: 'Failed to update employee salary.', details: error.message });
  } finally {
    client.release();
  }
};