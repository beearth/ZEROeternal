
import React from 'react';
import { createRoot } from 'react-dom/client';

const TestApp = () => <div>Build Test Succeeded</div>;

createRoot(document.getElementById('root')!).render(<TestApp />);
