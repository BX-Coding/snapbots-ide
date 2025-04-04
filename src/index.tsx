import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'
import { SnapbotModeProvider } from './contexts/SnapbotModeContext'

const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        // <React.StrictMode>
            <SnapbotModeProvider>
                <App />
            </SnapbotModeProvider>
        // </React.StrictMode>,
    );
}
