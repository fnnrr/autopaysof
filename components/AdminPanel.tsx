import React, { useState } from 'react';
import { Employee, AttendanceRecord, Payslip, Role } from '../types.ts';
import * as api from '../services/apiService.ts';
import Card from './common/Card.tsx';
import Input from './common/Input.tsx';
import Button from './common/Button.tsx';
import Modal from './common/Modal.tsx';

interface AdminPanelProps {
  loggedInEmployee: Employee;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  attendance: Record<string, AttendanceRecord[]>;
  setAttendance: React.Dispatch<React.SetStateAction<Record<string, AttendanceRecord[]>>>;
  payslips: Record<string, Payslip[]>;
  setPayslips: React.Dispatch<React.SetStateAction<Record<string, Payslip[]>>>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ loggedInEmployee, employees, setEmployees, attendance, setAttendance, payslips, setPayslips }) => {
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');
  const [role, setRole] = useState<Role>('Employee');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newSalary, setNewSalary] = useState('');
  const [isUpdatingSalary, setIsUpdatingSalary] = useState(false);

  const availableRoles: Role[] = loggedInEmployee.role === 'Admin' 
    ? ['Admin', 'Clerk', 'Employee']
    : ['Clerk', 'Employee'];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !salary || parseFloat(salary) <= 0) {
      setError('Please provide a valid name and a positive salary.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
        const newEmployee = await api.addEmployee(name.trim(), parseFloat(salary), role);
        setEmployees(prev => [...prev, newEmployee].sort((a,b) => a.name.localeCompare(b.name)));
        setName('');
        setSalary('');
        setRole('Employee');
    } catch(err) {
        setError(err instanceof Error ? err.message : 'Failed to register user.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleRemove = async (employeeId: string) => {
    if (window.confirm('Are you sure you want to remove this employee and all their data? This action cannot be undone.')) {
        try {
            await api.removeEmployee(employeeId);
            setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
            
            // Optimistically update attendance and payslips on the UI
            setAttendance(prev => {
                const newAttendance = {...prev};
                delete newAttendance[employeeId];
                return newAttendance;
            });
            setPayslips(prev => {
                const newPayslips = {...prev};
                delete newPayslips[employeeId];
                return newPayslips;
            });
        } catch(err) {
            alert(err instanceof Error ? err.message : 'Failed to remove user.');
        }
    }
  };

  const openSalaryModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewSalary(employee.salary.toString());
    setIsSalaryModalOpen(true);
  };
  
  const openDetailsModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailsModalOpen(true);
  }

  const handleSalaryUpdate = async () => {
    if (selectedEmployee && newSalary && parseFloat(newSalary) > 0) {
        setIsUpdatingSalary(true);
        try {
            const updatedEmployee = await api.updateEmployeeSalary(selectedEmployee.id, parseFloat(newSalary));
            setEmployees(prev => prev.map(emp => 
                emp.id === selectedEmployee.id ? updatedEmployee : emp
            ));
            setIsSalaryModalOpen(false);
            setSelectedEmployee(null);
            setNewSalary('');
        } catch(err) {
             alert(err instanceof Error ? err.message : 'Failed to update salary.');
        } finally {
            setIsUpdatingSalary(false);
        }
    }
  };
  
  const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Register New User</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input id="employeeName" label="Full Name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Jane Doe" required className="md:col-span-2" />
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                <select id="role" value={role} onChange={e => setRole(e.target.value as Role)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white">
                  {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
          </div>
          <Input id="employeeSalary" label="Monthly Salary ($)" type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g., 5000" min="0.01" step="0.01" required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Registering...' : 'Register User'}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">User Management</h2>
        {employees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Salary</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedEmployees.map(emp => (
                  <tr key={emp.id}>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</div><div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{emp.id}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{emp.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${emp.salary.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button onClick={() => openDetailsModal(emp)} variant="secondary" size="sm">View</Button>
                      {loggedInEmployee.role === 'Admin' && (
                        <>
                          <Button onClick={() => openSalaryModal(emp)} variant="secondary" size="sm">Edit Salary</Button>
                          <Button onClick={() => handleRemove(emp.id)} variant="danger" size="sm">Remove</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">No users registered yet.</p>
        )}
      </Card>
      
      {selectedEmployee && loggedInEmployee.role === 'Admin' && (
        <Modal isOpen={isSalaryModalOpen} onClose={() => setIsSalaryModalOpen(false)} title={`Update Salary for ${selectedEmployee.name}`}>
            <div className="space-y-4">
                <Input id="newSalary" label="New Monthly Salary ($)" type="number" value={newSalary} onChange={(e) => setNewSalary(e.target.value)} min="0.01" step="0.01" required />
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setIsSalaryModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSalaryUpdate} disabled={isUpdatingSalary}>{isUpdatingSalary ? 'Updating...' : 'Update Salary'}</Button>
                </div>
            </div>
        </Modal>
      )}

      {selectedEmployee && (
        <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Details for ${selectedEmployee.name}`}>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-lg mb-2">Recent Attendance</h4>
              <ul className="max-h-48 overflow-y-auto space-y-1 text-sm border p-2 rounded-md bg-gray-50 dark:bg-gray-700">
                {(attendance[selectedEmployee.id] || []).slice(-10).reverse().map(rec => (
                  <li key={rec.date} className="flex justify-between">
                    <span>{rec.date}:</span>
                    <span>{rec.checkIn && !rec.checkOut ? `Clocked In @ ${new Date(rec.checkIn).toLocaleTimeString()}`: "Completed"}</span>
                  </li>
                ))}
                {(attendance[selectedEmployee.id] || []).length === 0 && <li className="text-gray-400">No attendance records found.</li>}
              </ul>
            </div>
             <div>
              <h4 className="font-semibold text-lg mb-2">Generated Payslips</h4>
               <ul className="max-h-48 overflow-y-auto space-y-1 text-sm border p-2 rounded-md bg-gray-50 dark:bg-gray-700">
                {(payslips[selectedEmployee.id] || []).slice(-10).reverse().map(p => (
                   <li key={p.id} className="flex justify-between">
                    <span>{p.month}:</span>
                    <span className="font-mono">${p.netPayable.toFixed(2)}</span>
                  </li>
                ))}
                {(payslips[selectedEmployee.id] || []).length === 0 && <li className="text-gray-400">No payslips found.</li>}
              </ul>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default AdminPanel;