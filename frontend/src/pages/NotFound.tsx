import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="page-container not-found-container">
      <h1>Page not found</h1>
      <p>The page you requested does not exist or has been moved.</p>
      <Link to="/" className="btn btn-primary">
        Go to Expenses
      </Link>
    </section>
  );
}
