export type Role = 'Admin' | 'Clerk' | 'Employee';

export interface Employee {
  id: string;
  name: string;
  salary: number; // Monthly salary
  registrationDate: string;
  role: Role;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  checkIn: string; // ISO String
  checkOut?: string; // ISO String
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  year: number;
  monthlySalary: number;
  hourlyRate: number;
  totalHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  netPayable: number; // This is gross pay as deductions are 0
  generatedDate: string;
  summary: string;
}
