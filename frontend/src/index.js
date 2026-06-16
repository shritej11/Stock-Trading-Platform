import React        from 'react';
import ReactDOM     from 'react-dom/client';
import './index.css';
import App          from './App';
import { PriceProvider }       from './context/PriceContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId="584813239420-3mp7tp3fegbb0m7reoefstjn53trihb5.apps.googleusercontent.com">
    <PriceProvider>
      <App />
    </PriceProvider>
  </GoogleOAuthProvider>
);