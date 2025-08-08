import { Handler } from '@netlify/functions';
import { Pool } from 'pg';
import { AttendanceRecord } from '../../types';

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
    const { employeeId, date, checkIn, checkOut } = JSON.parse(event.body || '{}') as AttendanceRecord;
    
    if (!employeeId || !date || !checkIn) {
      return respond(400, { error: 'Missing required fields: employeeId, date, checkIn' });
    }
    
    // SQL for "INSERT on conflict UPDATE" (UPSERT)
    const upsertQuery = `
      INSERT INTO attendance ("employeeId", date, "checkIn", "checkOut")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("employeeId", date)
      DO UPDATE SET "checkOut" = EXCLUDED."checkOut"
      RETURNING *;
    `;
    
    const result = await client.query(upsertQuery, [employeeId, date, checkIn, checkOut]);

    return respond(200, result.rows[0]);
  } catch (error) {
    console.error('Database Error in upsert-attendance:', error);
    return respond(500, { error: 'Failed to save attendance record.', details: error.message });
  } finally {
    client.release();
  }
};