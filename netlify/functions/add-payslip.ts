import { Handler } from '@netlify/functions';
import { Pool } from 'pg';
import { Payslip } from '../../types';

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
    const p = JSON.parse(event.body || '{}') as Payslip;
    
    if (!p.id || !p.employeeId || !p.month) {
        return respond(400, { error: 'Payslip object is missing required fields.' });
    }
    
    const upsertQuery = `
        INSERT INTO payslips (id, "employeeId", month, year, "monthlySalary", "hourlyRate", "totalHours", "overtimeHours", "regularPay", "overtimePay", "netPayable", "generatedDate", summary)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT ("employeeId", month) 
        DO UPDATE SET
            id = EXCLUDED.id,
            year = EXCLUDED.year,
            "monthlySalary" = EXCLUDED."monthlySalary",
            "hourlyRate" = EXCLUDED."hourlyRate",
            "totalHours" = EXCLUDED."totalHours",
            "overtimeHours" = EXCLUDED."overtimeHours",
            "regularPay" = EXCLUDED."regularPay",
            "overtimePay" = EXCLUDED."overtimePay",
            "netPayable" = EXCLUDED."netPayable",
            "generatedDate" = EXCLUDED."generatedDate",
            summary = EXCLUDED.summary
        RETURNING *;
    `;

    const values = [p.id, p.employeeId, p.month, p.year, p.monthlySalary, p.hourlyRate, p.totalHours, p.overtimeHours, p.regularPay, p.overtimePay, p.netPayable, p.generatedDate, p.summary];
    const result = await client.query(upsertQuery, values);

    return respond(201, result.rows[0]);
  } catch (error) {
    console.error('Database Error in add-payslip:', error);
    return respond(500, { error: 'Failed to save payslip.', details: error.message });
  } finally {
    client.release();
  }
};