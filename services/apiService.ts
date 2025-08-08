import { Employee, AttendanceRecord, Payslip, Role, AllData } from '../types.ts';

// Base path for all API functions
const API_BASE_PATH = '/.netlify/functions';

// --- Helper for API requests ---
const apiFetch = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${API_BASE_PATH}/${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        } catch {
            errorBody = { error: `Request failed with status ${response.status} and non-JSON response.` };
        }
        console.error(`API Error on ${endpoint}:`, JSON.stringify(errorBody, null, 2));
        throw new Error(errorBody.error || 'An unknown error occurred');
    }

    // Handle responses that might not have a body (e.g., DELETE)
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
};

// --- Combined Data Fetching ---
export const getAllData = (): Promise<AllData> => {
    console.log('API: Fetching all application data from live endpoint...');
    return apiFetch<AllData>('get-all-data');
};


// --- Employee API ---
export const addEmployee = (name: string, salary: number, role: Role): Promise<Employee> => {
    console.log(`API: Adding new employee: ${name}`);
    return apiFetch<Employee>('add-employee', {
        method: 'POST',
        body: JSON.stringify({ name, salary, role }),
    });
};

export const updateEmployeeSalary = (employeeId: string, newSalary: number): Promise<Employee> => {
    console.log(`API: Updating salary for ${employeeId}`);
    return apiFetch<Employee>('update-employee-salary', {
        method: 'POST', // Using POST for simplicity with Netlify Functions
        body: JSON.stringify({ id: employeeId, salary: newSalary }),
    });
};

export const removeEmployee = (employeeId: string): Promise<void> => {
    console.log(`API: Removing employee ${employeeId}`);
    return apiFetch<void>('delete-employee', {
        method: 'POST',
        body: JSON.stringify({ id: employeeId }),
    });
};


// --- Attendance API ---
export const upsertAttendanceRecord = (record: Partial<AttendanceRecord> & { employeeId: string }): Promise<AttendanceRecord> => {
    console.log(`API: Upserting attendance for ${record.employeeId} on ${record.date}`);
    return apiFetch<AttendanceRecord>('upsert-attendance', {
        method: 'POST',
        body: JSON.stringify(record),
    });
};


// --- Payslips API ---
export const addOrUpdatePayslip = (payslip: Payslip): Promise<Payslip> => {
    console.log(`API: Adding/updating payslip for ${payslip.employeeId} for month ${payslip.month}`);
    return apiFetch<Payslip>('add-payslip', {
        method: 'POST',
        body: JSON.stringify(payslip),
    });
};