import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Controls from './Controls';

const CollapsibleSidebar = ({ parameters, onParameterChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <motion.div
      className="fixed top-0 right-0 h-full bg-white shadow-lg"
      initial={{ width: '60px' }}
      animate={{ width: isOpen ? '300px' : '60px' }}
      transition={{ duration: 0.3 }}
    >
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -left-4 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md"
      >
        {isOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
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