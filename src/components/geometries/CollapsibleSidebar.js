import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Controls from './Controls';

const ChevronIcon = ({ direction }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {direction === 'left' ? (
      <polyline points="15 18 9 12 15 6" />
    ) : (
      <polyline points="9 18 15 12 9 6" />
    )}
  </svg>
);

const CollapsibleSidebar = ({ parameters, onParameterChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <motion.div
      className="fixed top-0 right-0 h-full bg-white shadow-lg z-10"
      initial={{ width: '60px' }}
      animate={{ width: isOpen ? '300px' : '60px' }}
      transition={{ duration: 0.3 }}
    >
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -left-4 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md"
      >
        <ChevronIcon direction={isOpen ? 'right' : 'left'} />
      </button>
      <div className="h-full overflow-y-auto p-4">
        {isOpen && (
          <Controls
            parameters={parameters}
            onParameterChange={onParameterChange}
          />
        )}
      </div>
    </motion.div>
  );
};

export default CollapsibleSidebar;