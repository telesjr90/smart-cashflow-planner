import { useSelector } from 'react-redux';

export const useCashflowSummary = () => {
  // Select transactions directly from the store
  // Note: Adjust 'finance' to match the reducer name in your store.js
  const transactions = useSelector((state) => state.finance.items); 

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const balance = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    balance
  };
};

