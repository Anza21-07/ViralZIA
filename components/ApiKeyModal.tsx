import React from 'react';

interface ApiKeyModalProps {
  onKeySelected: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySelected }) => {
  const handleSelectKey = async () => {
    try {
      // FIX: Check if window.aistudio exists before calling it, as its type is now optional.
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        // Assume success and optimistically update UI
        onKeySelected();
      } else {
        console.error("aistudio is not available on the window object.");
      }
    } catch (error) {
      console.error("Error opening API key selection:", error);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-center border border-purple-500">
      <h3 className="text-xl font-bold mb-4">Se requiere una Clave API para la generación de video</h3>
      <p className="text-gray-400 mb-6">
        La generación de video con VEO requiere una clave API de Google AI Studio con la facturación habilitada.
      </p>
      <button
        onClick={handleSelectKey}
        className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-md hover:bg-purple-700 transition-colors"
      >
        Seleccionar Clave API
      </button>
      <a
        href="https://ai.google.dev/gemini-api/docs/billing"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-purple-400 hover:underline mt-4 inline-block"
      >
        Más información sobre la facturación
      </a>
    </div>
  );
};

export default ApiKeyModal;
