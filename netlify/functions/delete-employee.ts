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
    const { id } = JSON.parse(event.body || '{}');
    if (!id) {
      return respond(400, { error: 'Employee ID is required.' });
    }
    
    // The ON DELETE CASCADE in the table schema will handle deleting related attendance and payslips.
    const deleteQuery = 'DELETE FROM employees WHERE id = $1';
    await client.query(deleteQuery, [id]);

    return respond(200, { message: `Employee ${id} deleted successfully.` });
  } catch (error) {
    console.error('Database Error in delete-employee:', error);
    return respond(500, { error: 'Failed to delete employee.', details: error.message });
  } finally {
    client.release();
  }
};