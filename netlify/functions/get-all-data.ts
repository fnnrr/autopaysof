import { Handler } from '@netlify/functions';
import { Pool } from 'pg';
import { Employee, AttendanceRecord, Payslip } from '../../types';

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
  if (event.httpMethod !== 'GET') {
    return respond(405, { error: 'Method Not Allowed' });
  }

  const client = await pool.connect();
  try {
    const employeesPromise = client.query('SELECT id, name, salary, role, "registrationDate" FROM employees ORDER BY name ASC;');
    const attendancePromise = client.query('SELECT id, "employeeId", date, "checkIn", "checkOut" FROM attendance;');
    const payslipsPromise = client.query('SELECT * FROM payslips;');

    const [employeesResult, attendanceResult, payslipsResult] = await Promise.all([
      employeesPromise,
      attendancePromise,
      payslipsPromise,
    ]);

    // Format employees (ensure salary is a number)
    const employees: Employee[] = employeesResult.rows.map(e => ({...e, salary: parseFloat(e.salary)}));

    // Group attendance by employeeId
    const attendance: Record<string, AttendanceRecord[]> = attendanceResult.rows.reduce((acc, row) => {
      const { employeeId } = row;
      if (!acc[employeeId]) {
        acc[employeeId] = [];
      }
      // Push the full record, ensuring the date is formatted correctly
      acc[employeeId].push({ ...row, date: new Date(row.date).toISOString().split('T')[0] });
      return acc;
    }, {});
    
    // Group payslips by employeeId
    const payslips: Record<string, Payslip[]> = payslipsResult.rows.reduce((acc, row) => {
      const { employeeId } = row;
      if (!acc[employeeId]) {
        acc[employeeId] = [];
      }
      // Push the full payslip record, converting numeric types
      const fullPayslip = {
        ...row,
        monthlySalary: parseFloat(row.monthlySalary),
        hourlyRate: parseFloat(row.hourlyRate),
        totalHours: parseFloat(row.totalHours),
        overtimeHours: parseFloat(row.overtimeHours),
        regularPay: parseFloat(row.regularPay),
        overtimePay: parseFloat(row.overtimePay),
        netPayable: parseFloat(row.netPayable),
      };
      acc[employeeId].push(fullPayslip);
      return acc;
    }, {});

    return respond(200, { employees, attendance, payslips });
  } catch (error) {
    console.error('Database Error in get-all-data:', error);
    return respond(500, { error: 'Failed to fetch data from the database.', details: error.message });
  } finally {
    client.release();
  }
};