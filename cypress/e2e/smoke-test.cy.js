describe('Smoke Test - End-to-End Job Flow', () => {
  beforeEach(() => {
    cy.cleanupTestData();
  });

  after(() => {
    cy.cleanupTestData();
  });

  it('should complete full job lifecycle with preview generation', () => {
    // 1. Health Check
    cy.checkHealth();
    
    // 2. Authentication
    cy.visit('/');
    cy.signUpTestUser();
    
    // 3. Create Job
    cy.createTestJob({
      name: 'Smoke Test Job',
      duration: 10,
      style: 'hype'
    }).then(jobId => {
      
      // 4. Monitor Job Progress
      cy.visit(`/status/${jobId}`);
      
      // Wait for processing stages
      cy.waitForJobStage('analyzing');
      cy.waitForJobStage('processing'); 
      cy.waitForJobStage('rendering');
      cy.waitForJobStage('completed');
      
      // 5. Verify Preview Generation
      cy.waitForPreview();
      
      // 6. Check final output
      cy.get('[data-cy="output-video"]').should('exist');
      cy.get('[data-cy="download-button"]').should('be.visible');
      
      // Track completion
      cy.trackEvent('final_done', {
        job_id: jobId,
        duration: 10
      });
      
      // 7. Test sharing functionality
      cy.get('[data-cy="share-button"]').click();
      cy.get('[data-cy="share-modal"]').should('be.visible');
      cy.get('[data-cy="copy-link-button"]').click();
      
      cy.trackEvent('share_clicked', {
        job_id: jobId,
        share_type: 'link'
      });
      
      // Verify watermark for free tier
      cy.get('[data-cy="watermark-notice"]').should('be.visible');
    });
  });

  it('should handle render failures gracefully', () => {
    cy.signUpTestUser();
    
    // Create job with invalid data to trigger failure
    cy.visit('/create');
    
    // Upload corrupted files (simulated by empty files)
    const emptyFile = new File([''], 'empty.mp4', { type: 'video/mp4' });
    cy.get('[data-cy="video-upload"]').selectFile(emptyFile, { force: true });
    
    cy.get('[data-cy="create-job-button"]').click();
    
    // Should show error state
    cy.get('[data-cy="error-message"]', { timeout: 30000 })
      .should('be.visible')
      .and('contain.text', 'failed');
    
    cy.trackEvent('render_failed', {
      error_type: 'invalid_file',
      file_size: 0
    });
  });
});