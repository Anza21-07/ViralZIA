
import React from 'react';

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = "Procesando..." }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-gray-800 bg-opacity-50 rounded-lg">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-purple-500"></div>
      <p className="text-lg text-gray-200">{message}</p>
    </div>
  );
};

export default Loader;
