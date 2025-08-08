import { Employee, AttendanceRecord, Payslip, Role } from '../types.ts';

// This file simulates a backend API service.
// Each function uses localStorage as a mock database.
// In a real application, you would replace the localStorage logic
// with `fetch` calls to your backend endpoints (e.g., Netlify Functions).

const MOCK_API_LATENCY = 500; // milliseconds

const EMPLOYEES_KEY = 'employees';
const ATTENDANCE_KEY = 'attendance';
const PAYSLIPS_KEY = 'payslips';

// --- Helper Functions ---
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
};

const saveToStorage = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// --- Employee API ---

export const getEmployees = async (): Promise<Employee[]> => {
  console.log('API: Fetching employees...');
  await new Promise(res => setTimeout(res, MOCK_API_LATENCY));
  // ** REAL API HOOK **
  // const response = await fetch('/.netlify/functions/get-employees');
  // if (!response.ok) throw new Error('Failed to fetch employees');
  // return response.json();
  
  return getFromStorage<Employee[]>(EMPLOYEES_KEY, []);
};

export const addEmployee = async (name: string, salary: number, role: Role): Promise<Employee> => {
    console.log(`API: Adding new employee: ${name}`);
    await new Promise(res => setTimeout(res, MOCK_API_LATENCY));
    
    const employees = await getEmployees();

    const generateUniqueId = (role: Role, allEmployees: Employee[]): string => {
        const prefixMap: Record<Role, string> = { Admin: 'ADM', Clerk: 'CLK', Employee: 'EMP' };
        const prefix = prefixMap[role];
        const relevantEmployees = allEmployees.filter(emp => emp.id.startsWith(prefix + '-'));
        let maxId = 0;
        if (relevantEmployees.length > 0) {
            maxId = Math.max(...relevantEmployees.map(emp => parseInt(emp.id.split('-')[1] || '0', 10)));
        }
        return `${prefix}-${String(maxId + 1).padStart(5, '0')}`;
    };

    const newEmployee: Employee = {
      id: generateUniqueId(role, employees),
      name,
      salary,
      role,
      registrationDate: new Date().toISOString(),
    };

    const updatedEmployees = [...employees, newEmployee].sort((a,b) => a.name.localeCompare(b.name));
    saveToStorage(EMPLOYEES_KEY, updatedEmployees);
    
    // ** REAL API HOOK **
    // const response = await fetch('/.netlify/functions/add-employee', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ name, salary, role }),
    // });
    // if (!response.ok) throw new Error('Failed to add employee');
    // return response.json();

    return newEmployee;
};

export const addFirstAdmin = async (name: string, salary: number): Promise<Employee> => {
    const newAdmin: Employee = {
      id: 'ADM-00001',
      name,
      salary,
      role: 'Admin',
      registrationDate: new Date().toISOString(),
    };
    saveToStorage(EMPLOYEES_KEY, [newAdmin]);
    return newAdmin;
};

export const updateEmployeeSalary = async (employeeId: string, newSalary: number): Promise<Employee> => {
    console.log(`API: Updating salary for ${employeeId}`);
    await new Promise(res => setTimeout(res, MOCK_API_LATENCY));

    const employees = await getEmployees();
    let updatedEmployee: Employee | undefined;
    const updatedEmployees = employees.map(emp => {
        if (emp.id === employeeId) {
            updatedEmployee = { ...emp, salary: newSalary };
            return updatedEmployee;
        }
        return emp;
    });
    
    if (!updatedEmployee) throw new Error("Employee not found");

    saveToStorage(EMPLOYEES_KEY, updatedEmployees);

    // ** REAL API HOOK **
    // const response = await fetch(`/.netlify/functions/update-employee/${employeeId}`, {
    //   method: 'PATCH',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ salary: newSalary }),
    // });
    // if (!response.ok) throw new Error('Failed to update salary');
    // return response.json();
    
    return updatedEmployee;
};

export const removeEmployee = async (employeeId: string): Promise<void> => {
    console.log(`API: Removing employee ${employeeId}`);
    await new Promise(res => setTimeout(res, MOCK_API_LATENCY));

    const employees = await getEmployees();
    const attendance = await getAttendance();
    const payslips = await getPayslips();
    
    const updatedEmployees = employees.filter(emp => emp.id !== employeeId);
    delete attendance[employeeId];
    delete payslips[employeeId];
    
    saveToStorage(EMPLOYEES_KEY, updatedEmployees);
    saveToStorage(ATTENDANCE_KEY, attendance);
    saveToStorage(PAYSLIPS_KEY, payslips);

    // ** REAL API HOOK **
    // const response = await fetch(`/.netlify/functions/delete-employee/${employeeId}`, {
    //   method: 'DELETE',
    // });
    // if (!response.ok) throw new Error('Failed to remove employee');
};


// --- Attendance API ---
export const getAttendance = async (): Promise<Record<string, AttendanceRecord[]>> => {
  await new Promise(res => setTimeout(res, MOCK_API_LATENCY / 2)); // Faster than employees
  return getFromStorage(ATTENDANCE_KEY, {});
};

export const saveAttendance = async (attendance: Record<string, AttendanceRecord[]>) => {
  saveToStorage(ATTENDANCE_KEY, attendance);
  // ** REAL API HOOK **
  // In a real app, this would likely be individual requests per employee update
  // or a more complex bulk update endpoint.
  return Promise.resolve();
};

// --- Payslips API ---
export const getPayslips = async (): Promise<Record<string, Payslip[]>> => {
  await new Promise(res => setTimeout(res, MOCK_API_LATENCY / 2));
  return getFromStorage(PAYSLIPS_KEY, {});
};

export const savePayslips = async (payslips: Record<string, Payslip[]>): Promise<void> => {
  saveToStorage(PAYSLIPS_KEY, payslips);
   // ** REAL API HOOK **
  // In a real app, you'd likely post a new payslip to an endpoint.
  // e.g. `POST /.netlify/functions/add-payslip`
  return Promise.resolve();
};