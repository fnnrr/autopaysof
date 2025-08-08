import React, { useState, useMemo } from 'react';
import { Employee, AttendanceRecord, Payslip } from '../types.ts';
import { generatePayslipSummary } from '../services/geminiService.ts';
import * as api from '../services/apiService.ts';
import Card from './common/Card.tsx';
import Button from './common/Button.tsx';
import Modal from './common/Modal.tsx';

interface EmployeeViewProps {
  loggedInEmployee: Employee;
  attendance: AttendanceRecord[];
  payslips: Record<string, Payslip[]>;
  setPayslips: React.Dispatch<React.SetStateAction<Record<string, Payslip[]>>>;
}

const EmployeeView: React.FC<EmployeeViewProps> = ({ loggedInEmployee, attendance, payslips, setPayslips }) => {
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceToday = useMemo(() => {
    return attendance.find(rec => rec.date === todayStr);
  }, [attendance, todayStr]);

  const handleGeneratePayslip = async () => {
    if (!loggedInEmployee) return;
    
    setIsGenerating(true);
    try {
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const year = now.getFullYear();
      const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
      
      const workingDaysInMonth = Array.from({length: daysInMonth}, (_, i) => i + 1)
          .map(day => new Date(year, now.getMonth(), day))
          .filter(date => date.getDay() !== 0 && date.getDay() !== 6).length;

      const employeeAttendanceForMonth = attendance.filter(rec => rec.date.startsWith(monthStr));
      
      let totalMinutes = 0;
      employeeAttendanceForMonth.forEach(rec => {
          if(rec.checkIn && rec.checkOut) {
              const checkInTime = new Date(rec.checkIn).getTime();
              const checkOutTime = new Date(rec.checkOut).getTime();
              totalMinutes += (checkOutTime - checkInTime) / (1000 * 60);
          }
      });

      const totalHours = totalMinutes / 60;
      const standardMonthlyHours = workingDaysInMonth * 8;
      const hourlyRate = loggedInEmployee.salary / standardMonthlyHours;
      
      const overtimeHours = Math.max(0, totalHours - standardMonthlyHours);
      const regularHours = totalHours - overtimeHours;

      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5; // 1.5x Overtime Rate
      const netPayable = regularPay + overtimePay;

      const summary = await generatePayslipSummary(loggedInEmployee, netPayable, totalHours, overtimeHours);
      
      const newPayslip: Payslip = {
        id: `PS-${loggedInEmployee.id}-${Date.now()}`,
        employeeId: loggedInEmployee.id,
        month: monthStr,
        year,
        monthlySalary: loggedInEmployee.salary,
        hourlyRate,
        totalHours,
        overtimeHours,
        regularPay,
        overtimePay,
        netPayable,
        generatedDate: new Date().toISOString(),
        summary
      };
      
      const updatedPayslips = { ...payslips };
      const userPayslips = updatedPayslips[loggedInEmployee.id] || [];
      const otherPayslips = userPayslips.filter(p => p.month !== monthStr);
      updatedPayslips[loggedInEmployee.id] = [...otherPayslips, newPayslip];
      
      await api.savePayslips(updatedPayslips); // Save to our mock API
      setPayslips(updatedPayslips);

      setSelectedPayslip(newPayslip);
      setIsPayslipModalOpen(true);
    } catch (error) {
        console.error("Failed to generate payslip:", error);
        alert("There was an error generating the payslip. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const currentMonthStr = `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;
  const employeePayslips = payslips[loggedInEmployee.id] || [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Welcome, {loggedInEmployee.name}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <h3 className="text-xl font-bold mb-4">Your Details</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Employee ID:</span> <span className="font-mono">{loggedInEmployee.id}</span></p>
            <p><span className="font-semibold">Base Monthly Salary:</span> ${loggedInEmployee.salary.toFixed(2)}</p>
            <p><span className="font-semibold">Registered On:</span> {new Date(loggedInEmployee.registrationDate).toLocaleDateString()}</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-bold mb-4">Today's Status ({todayStr})</h3>
            <div className="flex items-center space-x-3 bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <div>
                {(!attendanceToday || !attendanceToday.checkIn) && <p className="font-semibold text-gray-800 dark:text-gray-300">You are not clocked in today.</p>}
                {(attendanceToday?.checkIn && !attendanceToday.checkOut) && <p className="font-semibold text-indigo-800 dark:text-indigo-300">Clocked in at {new Date(attendanceToday.checkIn).toLocaleTimeString()}. Login again to clock-out.</p>}
                {(attendanceToday?.checkIn && attendanceToday.checkOut) && <p className="font-semibold text-green-800 dark:text-green-300">Attendance complete for today.</p>}
               </div>
            </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-xl font-bold mb-4">Payslips</h3>
        <Button onClick={handleGeneratePayslip} disabled={isGenerating} className="mb-4">
          {isGenerating ? 'Generating...' : `Generate/Update Payslip for ${currentMonthStr}`}
        </Button>
         {employeePayslips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gross Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Generated On</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {employeePayslips.sort((a,b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime()).map(p => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{p.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">${p.netPayable.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(p.generatedDate).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button variant="secondary" size="sm" onClick={() => { setSelectedPayslip(p); setIsPayslipModalOpen(true); }}>View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">You have no generated payslips.</p>
        )}
      </Card>
      
       {selectedPayslip && (
        <Modal isOpen={isPayslipModalOpen} onClose={() => setIsPayslipModalOpen(false)} title={`Payslip for ${selectedPayslip.month}`}>
            <div className="space-y-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm italic text-gray-800 dark:text-gray-200">{selectedPayslip.summary}</p>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <h4 className="font-semibold text-lg mb-2">Pay Breakdown</h4>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Base Monthly Salary:</span> <strong>${selectedPayslip.monthlySalary.toFixed(2)}</strong></div>
                        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Calculated Hourly Rate:</span> <strong>${selectedPayslip.hourlyRate.toFixed(2)}/hr</strong></div>
                        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Total Hours Worked:</span> <strong>{selectedPayslip.totalHours.toFixed(2)} hrs</strong></div>
                         <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Overtime Hours:</span> <strong>{selectedPayslip.overtimeHours.toFixed(2)} hrs</strong></div>
                        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Regular Pay:</span> <strong>${selectedPayslip.regularPay.toFixed(2)}</strong></div>
                        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Overtime Pay (1.5x):</span> <strong>${selectedPayslip.overtimePay.toFixed(2)}</strong></div>
                    </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                        <span>Gross Payable Amount:</span>
                        <span className="text-green-600 dark:text-green-400">${selectedPayslip.netPayable.toFixed(2)}</span>
                    </div>
                </div>
                 <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 text-right">
                    Generated on {new Date(selectedPayslip.generatedDate).toLocaleString()}
                </div>
            </div>
        </Modal>
      )}

    </div>
  );
};

export default EmployeeView;