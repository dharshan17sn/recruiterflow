import { NavLink } from 'react-router-dom';

export function Navbar() {
  return (
    <header className="navbar-container">
      <nav aria-label="Main Navigation" className="navbar">
        <div className="navbar-brand">
          <div className="brand-badge" aria-hidden="true">RF</div>
          <span className="brand-title">Recruiterflow Expense Splitter</span>
        </div>
        <div className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Expenses
          </NavLink>
          <NavLink
            to="/expenses/new"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Add expense
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
