import { createContext } from 'react';

// React context also reaches admin dialogs rendered through portals.
export const AdminNumberInputContext = createContext(false);
