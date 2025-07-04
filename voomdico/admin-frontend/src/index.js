import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'; // Import the new App component from App.js

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App /> {/* Render the App component from App.js */}
  </React.StrictMode>
);
