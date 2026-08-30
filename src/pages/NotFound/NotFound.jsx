import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <main className="page notFoundPage">
      <div className="notFoundContent">
        <h2>Page not found</h2>
        <Link className="goldBtn" to="/">
          GO HOME
        </Link>
      </div>
    </main>
  );
}
