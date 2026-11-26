import { createContext } from 'react';

// Consumers and the provider must keep the same context during Vite updates.
// Keeping it outside the provider module also gives React Refresh a component-only boundary.
export const AuthContext = import.meta.hot?.data.authContext || createContext(null);
if (import.meta.hot) import.meta.hot.data.authContext = AuthContext;
