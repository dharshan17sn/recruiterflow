import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar.tsx';
import { Expenses } from './pages/Expenses.tsx';
import { AddExpense } from './pages/AddExpense.tsx';
import { NotFound } from './pages/NotFound.tsx';

export function App() {
  return (
    <div className="app-layout">
      <Navbar />
      <main id="main-content" className="app-main">
        <Routes>
          <Route path="/" element={<Expenses />} />
          <Route path="/expenses/new" element={<AddExpense />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
