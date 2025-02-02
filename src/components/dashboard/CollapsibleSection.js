// /src/components/dashboard/CollapsibleSection.js
import React, { useState } from 'react';

const CollapsibleSection = ({ title, defaultExpanded = true, children }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-gray-800 rounded-lg mb-4">
      <div 
        className="cursor-pointer flex justify-between items-center p-4 border-b border-gray-700"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-xl">{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && <div className="p-4">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
