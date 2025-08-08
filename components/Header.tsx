import React from 'react';
import { Employee } from '../types.ts';
import Button from './common/Button.tsx';

interface HeaderProps {
  loggedInEmployee: Employee | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ loggedInEmployee, onLogout }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white ml-3">AutoPay</h1>
          </div>
          {loggedInEmployee && (
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                 <p className="text-sm font-medium text-gray-900 dark:text-white">{loggedInEmployee.name}</p>
                 <p className="text-xs text-gray-500 dark:text-gray-400">{loggedInEmployee.role}</p>
              </div>
              <Button onClick={onLogout} variant="secondary" size="sm">Logout</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;