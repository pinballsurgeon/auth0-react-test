import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const BatchDisplay = ({ batches }) => {
  return (
    <div className="space-y-4 mt-4">
      {batches.map((batch, batchIndex) => (
        <Card key={batchIndex} className="bg-gray-800 border border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">
                Batch #{batchIndex + 1}
              </h3>
              <span className="text-xs text-gray-400">
                {batch.items.length} items
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {batch.items.map((item, itemIndex) => (
                <div 
                  key={itemIndex}
                  className="flex flex-col items-center bg-gray-900 rounded p-2"
                >
                  <div className="w-full aspect-square bg-gray-700 rounded overflow-hidden mb-2">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.text}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/api/placeholder/100/100';
                          e.target.classList.add('opacity-50');
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-gray-400">Loading...</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-300 text-center truncate w-full">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Processed in: {batch.processingTime}ms
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BatchDisplay;