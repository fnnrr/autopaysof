import React, { useState, useEffect, useCallback } from 'react';
import { Employee, AttendanceRecord, Payslip } from './types.ts';
import * as api from './services/apiService.ts';
import AdminPanel from './components/AdminPanel.tsx';
import EmployeeView from './components/EmployeeView.tsx';
import Header from './components/Header.tsx';
import Input from './components/common/Input.tsx';
import Button from './components/common/Button.tsx';
import Card from './components/common/Card.tsx';

const Notification: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-out">
    {message}
    <style>{`
      @keyframes fade-in-out {
        0% { opacity: 0; transform: translateY(-20px); }
        10% { opacity: 1; transform: translateY(0); }
        90% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
      }
      .animate-fade-in-out {
        animation: fade-in-out 4s ease-in-out;
      }
    `}</style>
  </div>
);

const FirstAdminSetup: React.FC<{
  onAdminCreated: (admin: Employee) => void;
}> = ({ onAdminCreated }) => {
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !salary || parseFloat(salary) <= 0) {
      setError('Please provide a valid name and a positive salary.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const newAdmin = await api.addFirstAdmin(name.trim(), parseFloat(salary));
      onAdminCreated(newAdmin);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">Create First Admin Account</h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">Welcome! To get started, please create the primary administrator account for the system.</p>
        <form onSubmit={handleRegister} className="space-y-4">
          <Input id="adminName" label="Full Name" type="text" value={name} onChange={e => setName(e.target.value)} required />
          <Input id="adminSalary" label="Monthly Salary ($)" type="number" value={salary} onChange={e => setSalary(e.target.value)} required min="1" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Creating Account...' : 'Create Admin Account'}</Button>
        </form>
      </Card>
    </div>
  );
};

const LoginView: React.FC<{
  employees: Employee[];
  setLoggedInEmployee: React.Dispatch<React.SetStateAction<Employee | null>>;
  onClockEvent: (employee: Employee) => Promise<void>;
  setNotification: React.Dispatch<React.SetStateAction<string>>;
}> = ({ employees, setLoggedInEmployee, onClockEvent, setNotification }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const employee = employees.find(emp => emp.id.toUpperCase() === employeeId.trim().toUpperCase());
    
    if (employee) {
      if (employee.role === 'Employee') {
        try {
          await onClockEvent(employee);
        } catch(e) {
            if (e instanceof Error) setNotification(e.message);
        }
      }
      setLoggedInEmployee(employee);
    } else {
      setError('Employee ID not found. Please try again.');
    }
    setIsLoading(false);
  };
  
  return (
     <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Welcome to AutoPay</h1>
            <p className="text-gray-600 dark:text-gray-300">Your automated attendance and payroll system.</p>
        </div>
        <Card className="max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">System Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              id="employeeId"
              label="Enter Your Employee ID"
              type="text"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              placeholder="e.g., EMP-00001"
              required
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login / Record Time'}</Button>
          </form>
        </Card>
      </div>
  );
};

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord[]>>({});
  const [payslips, setPayslips] = useState<Record<string, Payslip[]>>({});
  const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  
  const [notification, setNotification] = useState('');
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [empData, attData, payData] = await Promise.all([
            api.getEmployees(),
            api.getAttendance(),
            api.getPayslips()
        ]);
        setEmployees(empData);
        setAttendance(attData);
        setPayslips(payData);
        if (empData.length === 0) {
            setIsInitialSetup(true);
        }
    } catch (error) {
        console.error("Failed to load data:", error);
        setNotification("Error: Could not load application data.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdminCreated = (admin: Employee) => {
    setEmployees([admin]);
    setLoggedInEmployee(admin);
    setIsInitialSetup(false);
  };
  
  const handleClockEvent = async (employee: Employee) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const userAttendance = attendance[employee.id] || [];
      const todayRecord = userAttendance.find(r => r.date === todayStr);

      let updatedAttendance;
      if (!todayRecord) {
        // Clock In
        setNotification('You have been successfully clocked in for the day.');
        updatedAttendance = { ...attendance, [employee.id]: [...userAttendance, { date: todayStr, checkIn: new Date().toISOString() }] };
      } else if (todayRecord.checkIn && !todayRecord.checkOut) {
        // Clock Out
        setNotification('You have been successfully clocked out. Your hours are recorded.');
        const updatedRecords = userAttendance.map(r => r.date === todayStr ? { ...r, checkOut: new Date().toISOString() } : r);
        updatedAttendance = { ...attendance, [employee.id]: updatedRecords };
      } else {
         throw new Error('Your attendance for today has already been recorded.');
      }
      await api.saveAttendance(updatedAttendance);
      setAttendance(updatedAttendance);
  };
  
  const handleLogout = () => {
    setLoggedInEmployee(null);
  };

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-indigo-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Loading Application Data...</p>
            </div>
        </div>
    );
  }

  if (isInitialSetup) {
    return <FirstAdminSetup onAdminCreated={handleAdminCreated} />;
  }

  if (!loggedInEmployee) {
    return (
        <div className="bg-gray-100 dark:bg-gray-900">
            {notification && <Notification message={notification} />}
            <LoginView 
                employees={employees} 
                setLoggedInEmployee={setLoggedInEmployee}
                onClockEvent={handleClockEvent}
                setNotification={setNotification}
            />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      {notification && <Notification message={notification} />}
      <Header loggedInEmployee={loggedInEmployee} onLogout={handleLogout} />
      <main className="p-4 sm:p-6 lg:p-8">
        {(loggedInEmployee.role === 'Admin' || loggedInEmployee.role === 'Clerk') ? (
          <AdminPanel
            loggedInEmployee={loggedInEmployee}
            employees={employees}
            setEmployees={setEmployees}
            attendance={attendance}
            setAttendance={setAttendance}
            payslips={payslips}
            setPayslips={setPayslips}
          />
        ) : (
          <EmployeeView
            loggedInEmployee={loggedInEmployee}
            attendance={attendance[loggedInEmployee.id] || []}
            payslips={payslips}
            setPayslips={setPayslips}
          />
        )}
      </main>
      <footer className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} AutoPay Systems. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;