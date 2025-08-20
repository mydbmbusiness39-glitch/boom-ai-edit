import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    
    env: {
      SUPABASE_URL: 'https://qtvdzxxdydgncrfbtejj.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dmR6eHhkeWRnbmNyZmJ0ZWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzkyMjQsImV4cCI6MjA3MDg1NTIyNH0.-CHGNWxYejG-fkQcN19KYcKDolipf8mLOZlvp1b1Uws',
      TEST_USER_EMAIL: 'cypress-test@example.com',
      TEST_USER_PASSWORD: 'cypress-test-password-123'
    },

    setupNodeEvents(on, config) {
      // Track events for analytics
      on('task', {
        trackEvent({ event, properties }) {
          console.log(`📊 Event tracked: ${event}`, properties);
          
          // In a real implementation, you would send this to your analytics service
          // For now, we'll just log and store in a file for verification
          const fs = require('fs');
          const path = require('path');
          
          const logFile = path.join(__dirname, 'cypress/results/events.log');
          const timestamp = new Date().toISOString();
          const logEntry = `${timestamp} - ${event}: ${JSON.stringify(properties)}\n`;
          
          // Ensure directory exists
          const dir = path.dirname(logFile);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.appendFileSync(logFile, logEntry);
          return null;
        },

        clearEventLog() {
          const fs = require('fs');
          const path = require('path');
          const logFile = path.join(__dirname, 'cypress/results/events.log');
          
          if (fs.existsSync(logFile)) {
            fs.writeFileSync(logFile, '');
          }
          return null;
        },

        readEventLog() {
          const fs = require('fs');
          const path = require('path');
          const logFile = path.join(__dirname, 'cypress/results/events.log');
          
          if (fs.existsSync(logFile)) {
            return fs.readFileSync(logFile, 'utf8');
          }
          return '';
        }
      });

      return config;
    },
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
})