import React from 'react';
import './SectionTitle.css';

export default function SectionTitle({ title, sub }) {
  return (
    <div className="sectionTitle">
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
      <span />
    </div>
  );
}
