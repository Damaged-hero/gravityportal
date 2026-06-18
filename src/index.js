import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './auth/msalConfig';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const msalInstance = new PublicClientApplication(msalConfig);

console.log('[App] Starting MSAL initialize...');
msalInstance.initialize().then(() => {
  console.log('[App] MSAL initialized OK');
  msalInstance.handleRedirectPromise()
    .then(result => {
      if (result) console.log('[App] Redirect result:', result.account?.username);
      else console.log('[App] No redirect result (normal on first load)');
    })
    .catch(e => console.error('[App] handleRedirectPromise error:', e));

  const root = ReactDOM.createRoot(document.getElementById('root'));
  console.log('[App] Rendering React app...');
  root.render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
  console.log('[App] Render called');
}).catch(e => console.error('[App] MSAL initialize failed:', e));

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
