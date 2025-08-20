// Custom Cypress Commands

// Authentication commands
Cypress.Commands.add('loginTestUser', () => {
  const email = Cypress.env('TEST_USER_EMAIL');
  const password = Cypress.env('TEST_USER_PASSWORD');
  
  cy.visit('/auth');
  cy.get('[data-cy="email-input"]').type(email);
  cy.get('[data-cy="password-input"]').type(password);
  cy.get('[data-cy="sign-in-button"]').click();
  
  // Wait for successful login
  cy.url().should('not.include', '/auth');
  cy.get('[data-cy="user-profile"]').should('exist');
});

Cypress.Commands.add('signUpTestUser', () => {
  const email = Cypress.env('TEST_USER_EMAIL');
  const password = Cypress.env('TEST_USER_PASSWORD');
  
  cy.visit('/auth');
  cy.get('[data-cy="signup-tab"]').click();
  cy.get('[data-cy="email-input"]').type(email);
  cy.get('[data-cy="password-input"]').type(password);
  cy.get('[data-cy="sign-up-button"]').click();
  
  // Handle email confirmation if needed
  cy.url().should('not.include', '/auth');
});

// Job creation commands
Cypress.Commands.add('createTestJob', (options = {}) => {
  const defaults = {
    name: 'Cypress Test Job',
    duration: 10,
    style: 'hype'
  };
  
  const config = { ...defaults, ...options };
  
  cy.visit('/create');
  
  // Upload test files
  cy.fixture('test-video.mp4', 'binary').then(fileContent => {
    const file = new File([fileContent], 'test-video.mp4', { type: 'video/mp4' });
    cy.get('[data-cy="video-upload"]').selectFile(file, { force: true });
  });
  
  cy.fixture('test-audio.mp3', 'binary').then(fileContent => {
    const file = new File([fileContent], 'test-audio.mp3', { type: 'audio/mp3' });
    cy.get('[data-cy="audio-upload"]').selectFile(file, { force: true });
  });
  
  // Configure job settings
  cy.get('[data-cy="job-name"]').clear().type(config.name);
  cy.get('[data-cy="duration-slider"]').invoke('val', config.duration).trigger('input');
  cy.get(`[data-cy="style-${config.style}"]`).click();
  
  // Create job
  cy.get('[data-cy="create-job-button"]').click();
  
  // Track job creation event
  cy.trackEvent('job_created', {
    name: config.name,
    duration: config.duration,
    style: config.style
  });
  
  // Return job URL for further operations
  cy.url().then(url => {
    const jobId = url.split('/').pop();
    return cy.wrap(jobId);
  });
});

// Event tracking command
Cypress.Commands.add('trackEvent', (eventName, properties = {}) => {
  cy.task('trackEvent', {
    event: eventName,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      test: Cypress.currentTest.title,
      spec: Cypress.spec.name
    }
  });
});

// Wait for job stages
Cypress.Commands.add('waitForJobStage', (stage, timeout = 30000) => {
  cy.get('[data-cy="job-status"]', { timeout })
    .should('contain.text', stage);
});

Cypress.Commands.add('waitForPreview', (timeout = 60000) => {
  cy.get('[data-cy="preview-video"]', { timeout }).should('exist');
  cy.trackEvent('preview_done', {
    timeout_used: timeout
  });
});

// File upload utilities
Cypress.Commands.add('uploadTestMedia', () => {
  // Create test video file
  cy.fixture('test-video.mp4', 'binary').then(videoContent => {
    const videoFile = new File([videoContent], 'test-video.mp4', { type: 'video/mp4' });
    cy.get('[data-cy="video-upload"]').selectFile(videoFile, { force: true });
  });
  
  // Create test audio file
  cy.fixture('test-audio.mp3', 'binary').then(audioContent => {
    const audioFile = new File([audioContent], 'test-audio.mp3', { type: 'audio/mp3' });
    cy.get('[data-cy="audio-upload"]').selectFile(audioFile, { force: true });
  });
});

// Health check command
Cypress.Commands.add('checkHealth', () => {
  const supabaseUrl = Cypress.env('SUPABASE_URL');
  const supabaseKey = Cypress.env('SUPABASE_ANON_KEY');
  
  cy.request({
    method: 'GET',
    url: `${supabaseUrl}/functions/v1/healthz`,
    headers: {
      'apikey': supabaseKey,
      'authorization': `Bearer ${supabaseKey}`
    }
  }).then(response => {
    expect(response.status).to.eq(200);
    expect(response.body.status).to.eq('healthy');
  });
});

// Cleanup command
Cypress.Commands.add('cleanupTestData', () => {
  // This would typically call an API endpoint to clean up test data
  // For now, we'll just clear any local storage
  cy.clearLocalStorage();
  cy.clearCookies();
});