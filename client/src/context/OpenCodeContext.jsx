import { createContext, useContext } from 'react';
import { useApi } from '../hooks/useApi.js';

const OpenCodeContext = createContext({ repos: [], loading: true });
export function OpenCodeProvider({ children }) {
  const { data, loading } = useApi('/open-code');
  const repos = data?.enabled && Array.isArray(data.repos) ? data.repos : [];
  return <OpenCodeContext.Provider value={{ repos, loading }}>{children}</OpenCodeContext.Provider>;
}
export const useOpenCode = () => useContext(OpenCodeContext);
