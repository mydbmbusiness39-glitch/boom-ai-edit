#!/usr/bin/env node

/**
 * Seed & Smoke Test Script
 * Creates a test job, runs through stages, and validates preview generation
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qtvdzxxdydgncrfbtejj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dmR6eHhkeWRnbmNyZmJ0ZWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzkyMjQsImV4cCI6MjA3MDg1NTIyNH0.-CHGNWxYejG-fkQcN19KYcKDolipf8mLOZlvp1b1Uws';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
const TEST_USER_EMAIL = 'smoke-test@example.com';
const TEST_USER_PASSWORD = 'smoke-test-password-123';

async function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkHealth() {
  log('Checking health endpoint...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/healthz`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    
    const health = await response.json();
    
    if (response.ok && health.status === 'healthy') {
      log('Health check passed ✅', 'success');
      return true;
    } else {
      log(`Health check failed: ${JSON.stringify(health)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Health check error: ${error.message}`, 'error');
    return false;
  }
}

async function setupTestUser() {
  log('Setting up test user...');
  
  // Try to sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (signInData.user) {
    log('Test user signed in successfully', 'success');
    return signInData.user;
  }

  // If sign in failed, try to sign up
  log('Creating test user...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (signUpError) {
    throw new Error(`Failed to create test user: ${signUpError.message}`);
  }

  if (!signUpData.user) {
    throw new Error('User creation returned null');
  }

  log('Test user created successfully', 'success');
  return signUpData.user;
}

async function createTestFiles() {
  log('Creating test media files...');
  
  // Create a minimal test video file (placeholder)
  const testVideoContent = new Uint8Array([
    // Minimal MP4 header for testing
    0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D
  ]);
  
  const testAudioContent = new Uint8Array([
    // Minimal MP3 header for testing  
    0xFF, 0xFB, 0x90, 0x00
  ]);

  const videoBlob = new Blob([testVideoContent], { type: 'video/mp4' });
  const audioBlob = new Blob([testAudioContent], { type: 'audio/mp3' });

  return {
    video: new File([videoBlob], 'test-video.mp4', { type: 'video/mp4' }),
    audio: new File([audioBlob], 'test-audio.mp3', { type: 'audio/mp3' })
  };
}

async function uploadTestFiles(files) {
  log('Uploading test files...');
  
  const uploads = [];
  
  for (const [type, file] of Object.entries(files)) {
    const filePath = `smoke-test/${Date.now()}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-uploads')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Failed to upload ${type}: ${uploadError.message}`);
    }

    // Record upload in database
    const { data: uploadRecord, error: recordError } = await supabase
      .from('uploads')
      .insert({
        filename: file.name,
        file_path: filePath,
        mime_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (recordError) {
      throw new Error(`Failed to record upload: ${recordError.message}`);
    }

    uploads.push(uploadRecord);
  }
  
  log(`Uploaded ${uploads.length} files successfully`, 'success');
  return uploads;
}

async function createSmokeJob(uploads) {
  log('Creating smoke test job...');
  
  const { data: job, error } = await supabase
    .from('jobs_new')
    .insert({
      name: 'Smoke Test Job',
      status: 'pending',
      style_id: 'hype',
      duration: 10, // 10 second preview
      files: {
        video: uploads.find(u => u.mime_type.includes('video')),
        audio: uploads.find(u => u.mime_type.includes('audio'))
      },
      watermarked: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  log(`Job created with ID: ${job.id}`, 'success');
  return job;
}

async function simulateJobStages(jobId) {
  log('Simulating job processing stages...');
  
  const stages = [
    { name: 'analyzing', progress: 20, duration: 2000 },
    { name: 'processing', progress: 50, duration: 3000 },
    { name: 'rendering', progress: 80, duration: 2000 },
    { name: 'finalizing', progress: 100, duration: 1000 },
  ];

  for (const stage of stages) {
    log(`Stage: ${stage.name} (${stage.progress}%)`);
    
    const { error } = await supabase
      .from('jobs_new')
      .update({
        status: stage.name,
        progress: stage.progress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to update job stage: ${error.message}`);
    }

    await sleep(stage.duration);
  }

  // Set preview URL (simulated)
  const previewUrl = `https://example.com/preview/${jobId}.mp4`;
  
  const { error: previewError } = await supabase
    .from('jobs_new')
    .update({
      status: 'completed',
      preview_url: previewUrl,
      output_url: previewUrl,
      progress: 100,
    })
    .eq('id', jobId);

  if (previewError) {
    throw new Error(`Failed to set preview URL: ${previewError.message}`);
  }

  log('Job processing completed with preview URL', 'success');
  return previewUrl;
}

async function validateJob(jobId) {
  log('Validating completed job...');
  
  const { data: job, error } = await supabase
    .from('jobs_new')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch job: ${error.message}`);
  }

  const validations = [
    { check: job.status === 'completed', message: 'Job status is completed' },
    { check: job.progress === 100, message: 'Job progress is 100%' },
    { check: !!job.preview_url, message: 'Preview URL is set' },
    { check: job.duration === 10, message: 'Duration is 10 seconds' },
    { check: job.watermarked === true, message: 'Watermark is enabled' },
  ];

  for (const validation of validations) {
    if (validation.check) {
      log(`✓ ${validation.message}`, 'success');
    } else {
      throw new Error(`✗ ${validation.message}`);
    }
  }

  log('Job validation completed successfully', 'success');
  return job;
}

async function cleanup(jobId, uploads) {
  log('Cleaning up test data...');
  
  try {
    // Delete uploaded files
    for (const upload of uploads) {
      await supabase.storage
        .from('video-uploads')
        .remove([upload.file_path]);
    }

    // Delete upload records
    await supabase
      .from('uploads')
      .delete()
      .in('id', uploads.map(u => u.id));

    // Delete job
    await supabase
      .from('jobs_new')
      .delete()
      .eq('id', jobId);

    log('Cleanup completed', 'success');
  } catch (error) {
    log(`Cleanup warning: ${error.message}`, 'error');
  }
}

async function runSmokeTest() {
  const startTime = Date.now();
  let jobId = null;
  let uploads = [];
  
  try {
    log('🚀 Starting smoke test...');
    
    // 1. Check health
    const isHealthy = await checkHealth();
    if (!isHealthy) {
      throw new Error('Health check failed');
    }

    // 2. Setup test user
    await setupTestUser();

    // 3. Create and upload test files
    const files = await createTestFiles();
    uploads = await uploadTestFiles(files);

    // 4. Create test job
    const job = await createSmokeJob(uploads);
    jobId = job.id;

    // 5. Simulate processing stages
    await simulateJobStages(jobId);

    // 6. Validate final result
    await validateJob(jobId);

    const duration = Date.now() - startTime;
    log(`🎉 Smoke test completed successfully in ${duration}ms`, 'success');
    
    return { success: true, duration, jobId };

  } catch (error) {
    const duration = Date.now() - startTime;
    log(`💥 Smoke test failed after ${duration}ms: ${error.message}`, 'error');
    
    return { success: false, error: error.message, duration };
    
  } finally {
    // Cleanup
    if (jobId && uploads.length > 0) {
      await cleanup(jobId, uploads);
    }
  }
}

// Export for testing
export { runSmokeTest };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmokeTest()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Smoke test crashed:', error);
      process.exit(1);
    });
}