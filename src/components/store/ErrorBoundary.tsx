/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('operationType')) {
        setHasError(true);
        setErrorInfo(event.error.message);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="glass p-8 rounded-3xl max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Erro de Permissão</h2>
          <p className="text-zinc-400 mb-6">Você não tem permissão para realizar esta ação ou acessar estes dados.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  return children;
};
