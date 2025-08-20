describe('Integration Test - All Stages Simulation', () => {
  let testJobId;

  before(() => {
    cy.cleanupTestData();
    cy.checkHealth();
  });

  after(() => {
    cy.cleanupTestData();
  });

  it('should simulate complete video processing pipeline', () => {
    // Authentication flow
    cy.signUpTestUser();
    
    // Job Creation Stage
    cy.visit('/create');
    cy.uploadTestMedia();
    
    cy.get('[data-cy="job-name"]').type('Integration Test Job');
    cy.get('[data-cy="style-hype"]').click();
    cy.get('[data-cy="duration-slider"]').invoke('val', 15).trigger('input');
    
    cy.get('[data-cy="create-job-button"]').click();
    
    cy.trackEvent('job_created', {
      name: 'Integration Test Job',
      duration: 15,
      style: 'hype'
    });
    
    // Capture job ID for monitoring
    cy.url().then(url => {
      testJobId = url.split('/').pop();
      cy.wrap(testJobId).as('jobId');
    });
    
    // Stage 1: Upload and Analysis
    cy.get('@jobId').then(jobId => {
      cy.visit(`/status/${jobId}`);
      
      // Verify initial state
      cy.get('[data-cy="job-title"]').should('contain', 'Integration Test Job');
      cy.get('[data-cy="job-duration"]').should('contain', '15');
      cy.get('[data-cy="job-style"]').should('contain', 'hype');
      
      // Wait for analysis stage
      cy.waitForJobStage('analyzing');
      cy.get('[data-cy="progress-bar"]').should('be.visible');
      
      // Stage 2: Processing
      cy.waitForJobStage('processing');
      cy.get('[data-cy="progress-percentage"]').should('contain', '%');
      
      // Stage 3: Rendering
      cy.waitForJobStage('rendering');
      cy.get('[data-cy="render-status"]').should('be.visible');
      
      // Stage 4: Preview Generation
      cy.waitForJobStage('completed');
      cy.waitForPreview();
      
      cy.trackEvent('preview_done', {
        job_id: jobId,
        stage: 'preview_complete'
      });
      
      // Verify preview quality
      cy.get('[data-cy="preview-video"]')
        .should('have.attr', 'src')
        .and('not.be.empty');
      
      // Stage 5: Final Output
      cy.get('[data-cy="output-video"]').should('exist');
      cy.get('[data-cy="video-duration"]').should('be.visible');
      cy.get('[data-cy="video-size"]').should('be.visible');
      
      cy.trackEvent('final_done', {
        job_id: jobId,
        output_ready: true
      });
      
      // Stage 6: User Interactions
      // Download functionality
      cy.get('[data-cy="download-button"]').should('be.enabled');
      
      // Share functionality
      cy.get('[data-cy="share-button"]').click();
      cy.get('[data-cy="share-modal"]').should('be.visible');
      
      // Social sharing options
      cy.get('[data-cy="share-twitter"]').should('be.visible');
      cy.get('[data-cy="share-facebook"]').should('be.visible');
      cy.get('[data-cy="copy-link-button"]').click();
      
      cy.trackEvent('share_clicked', {
        job_id: jobId,
        share_type: 'copy_link'
      });
      
      // Close share modal
      cy.get('[data-cy="close-share-modal"]').click();
      
      // Verify watermark notice (free tier)
      cy.get('[data-cy="watermark-notice"]')
        .should('be.visible')
        .and('contain.text', 'watermark');
      
      // Edit functionality
      cy.get('[data-cy="edit-job-button"]').click();
      cy.url().should('include', '/editor');
      
      // Timeline editing
      cy.get('[data-cy="timeline-editor"]').should('be.visible');
      cy.get('[data-cy="timeline-tracks"]').should('exist');
      
      // Navigate back to status
      cy.visit(`/status/${jobId}`);
      
      // Verify job persistence
      cy.reload();
      cy.get('[data-cy="job-title"]').should('contain', 'Integration Test Job');
    });
  });

  it('should handle edge cases and error scenarios', () => {
    cy.signUpTestUser();
    
    // Test 1: Invalid file upload
    cy.visit('/create');
    
    const invalidFile = new File(['invalid content'], 'invalid.txt', { type: 'text/plain' });
    cy.get('[data-cy="video-upload"]').selectFile(invalidFile, { force: true });
    
    cy.get('[data-cy="file-error"]').should('be.visible');
    
    // Test 2: Exceeding duration limits
    cy.get('[data-cy="duration-slider"]').invoke('val', 120).trigger('input');
    cy.get('[data-cy="duration-warning"]').should('be.visible');
    
    // Test 3: Network error handling
    cy.intercept('POST', '**/jobs_new', { forceNetworkError: true }).as('createJobError');
    
    cy.uploadTestMedia();
    cy.get('[data-cy="create-job-button"]').click();
    
    cy.wait('@createJobError');
    cy.get('[data-cy="network-error"]').should('be.visible');
    
    cy.trackEvent('render_failed', {
      error_type: 'network_error',
      stage: 'job_creation'
    });
  });

  it('should track user analytics correctly', () => {
    cy.signUpTestUser();
    
    // Verify all events are being tracked
    cy.task('readEventLog').then(log => {
      expect(log).to.include('job_created');
    });
    
    cy.createTestJob().then(jobId => {
      cy.visit(`/status/${jobId}`);
      cy.waitForPreview();
      
      // Check event log contains all required events
      cy.task('readEventLog').then(log => {
        expect(log).to.include('job_created');
        expect(log).to.include('preview_done');
      });
      
      // Trigger share event
      cy.get('[data-cy="share-button"]').click();
      cy.get('[data-cy="copy-link-button"]').click();
      
      cy.task('readEventLog').then(log => {
        expect(log).to.include('share_clicked');
      });
    });
  });
});