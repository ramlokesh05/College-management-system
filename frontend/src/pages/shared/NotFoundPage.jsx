import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div className="flex min-h-screen items-center justify-center p-4">
    <div className="glass-card max-w-md p-8 text-center">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">404</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="btn-primary mt-5 inline-flex">
        Back to Home
      </Link>
    </div>
  </div>
);

export default NotFoundPage;

