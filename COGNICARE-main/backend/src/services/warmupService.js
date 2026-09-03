/**
 * Warm-up Service for DementiaCare+
 * 
 * Runs scheduled jobs to pre-compute and cache expensive operations
 * Improves response times during peak hours
 * Uses node-schedule for cron-like scheduling
 */

const schedule = require('node-schedule');
const User = require('../models/User');
const Patient = require('../models/Patient');
const aiEngine = require('./aiEngine');
const cacheService = require('./cacheService');

let jobs = [];
let isStarted = false;

/**
 * Pre-generate recommendations for all active patients
 * Runs daily at 6:00 AM
 */
const scheduleRecommendationWarmup = () => {
  const job = schedule.scheduleJob('0 6 * * *', async () => {
    console.log('📋 [Warm-up Job] Starting AI recommendations pre-computation...');
    
    try {
      // Get all active patients
      const patients = await Patient.find({ isActive: true })
        .populate('user', 'name email');
      
      console.log(`[Warm-up Job] Found ${patients.length} active patients`);
      
      let cached = 0;
      let failed = 0;
      const startTime = Date.now();
      
      for (const patient of patients) {
        try {
          // Generate and cache recommendations (1-hour TTL)
          const recommendations = await aiEngine.generateRecommendations(patient.user._id);
          await cacheService.set(
            'ai:recommendations',
            patient.user._id,
            recommendations,
            3600 // 1 hour TTL
          );
          cached++;
        } catch (err) {
          console.warn(`[Warm-up Job] Failed for patient ${patient.user._id}:`, err.message);
          failed++;
        }
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `✓ [Warm-up Job] Completed in ${duration}s. ` +
        `Cached: ${cached}, Failed: ${failed}`
      );
    } catch (err) {
      console.error('[Warm-up Job] Fatal error:', err.message);
    }
  });
  
  jobs.push(job);
  console.log('✓ Scheduled: Daily recommendation warm-up at 6:00 AM');
};

/**
 * Pre-generate performance summaries
 * Runs daily at 6:15 AM (after recommendations)
 */
const schedulePerformanceSummaryWarmup = () => {
  const job = schedule.scheduleJob('15 6 * * *', async () => {
    console.log('📊 [Warm-up Job] Starting performance summary pre-computation...');
    
    try {
      const patients = await Patient.find({ isActive: true })
        .populate('user', 'name email');
      
      let cached = 0;
      let failed = 0;
      const startTime = Date.now();
      
      for (const patient of patients) {
        try {
          const summary = await aiEngine.generatePerformanceSummary(patient.user._id);
          if (summary) {
            await cacheService.set(
              'ai:performance-summary',
              patient.user._id,
              summary,
              3600 // 1 hour TTL
            );
            cached++;
          }
        } catch (err) {
          console.warn(`[Warm-up Job] Failed for patient ${patient.user._id}:`, err.message);
          failed++;
        }
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `✓ [Warm-up Job] Completed in ${duration}s. ` +
        `Cached: ${cached}, Failed: ${failed}`
      );
    } catch (err) {
      console.error('[Warm-up Job] Fatal error:', err.message);
    }
  });
  
  jobs.push(job);
  console.log('✓ Scheduled: Daily performance summary warm-up at 6:15 AM');
};

/**
 * Clean up expired in-memory cache entries every hour
 * Only needed for in-memory cache (Redis handles this natively)
 */
const scheduleInMemoryCacheCleanup = () => {
  const job = schedule.scheduleJob('0 * * * *', async () => {
    if (cacheService.isRedisAvailable()) {
      // Redis handles expiration automatically
      return;
    }
    
    console.log('[Warm-up Job] Cleaning up expired cache entries...');
    // The cache service automatically removes expired entries on access
  });
  
  jobs.push(job);
  console.log('✓ Scheduled: Hourly in-memory cache cleanup');
};

/**
 * Start all warm-up jobs
 */
const start = () => {
  if (isStarted) {
    console.warn('[Warm-up Service] Already started');
    return;
  }
  
  isStarted = true;
  console.log('\n🌟 Starting Warm-up Service...');
  
  try {
    scheduleRecommendationWarmup();
    schedulePerformanceSummaryWarmup();
    scheduleInMemoryCacheCleanup();
    
    console.log(`[Warm-up Service] ${jobs.length} jobs scheduled\n`);
  } catch (err) {
    console.error('[Warm-up Service] Failed to start:', err.message);
    isStarted = false;
  }
};

/**
 * Stop all warm-up jobs
 */
const stop = () => {
  console.log('[Warm-up Service] Stopping all jobs...');
  jobs.forEach(job => {
    job.cancel();
  });
  jobs = [];
  isStarted = false;
  console.log('[Warm-up Service] All jobs stopped');
};

/**
 * Manual warm-up trigger (for testing)
 */
const manualWarmup = async (type = 'all') => {
  console.log(`[Manual Warm-up] Starting ${type} warm-up...`);
  
  try {
    const patients = await Patient.find({ isActive: true })
      .populate('user', 'name email');
    
    let cached = 0;
    
    if (type === 'recommendations' || type === 'all') {
      for (const patient of patients) {
        const recommendations = await aiEngine.generateRecommendations(patient.user._id);
        await cacheService.set(
          'ai:recommendations',
          patient.user._id,
          recommendations,
          3600
        );
        cached++;
      }
      console.log(`[Manual Warm-up] Cached ${cached} recommendation sets`);
      cached = 0;
    }
    
    if (type === 'summaries' || type === 'all') {
      for (const patient of patients) {
        const summary = await aiEngine.generatePerformanceSummary(patient.user._id);
        if (summary) {
          await cacheService.set(
            'ai:performance-summary',
            patient.user._id,
            summary,
            3600
          );
          cached++;
        }
      }
      console.log(`[Manual Warm-up] Cached ${cached} performance summaries`);
    }
    
    return { success: true, message: `Warm-up completed for ${type}` };
  } catch (err) {
    console.error('[Manual Warm-up] Error:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Get warm-up service status
 */
const getStatus = () => {
  return {
    isRunning: isStarted,
    jobCount: jobs.length,
    jobs: jobs.map(job => ({
      nextInvocation: job.nextInvocation(),
      lastInvocation: job.lastExecution
    }))
  };
};

module.exports = {
  start,
  stop,
  manualWarmup,
  getStatus,
  scheduleRecommendationWarmup,
  schedulePerformanceSummaryWarmup,
  scheduleInMemoryCacheCleanup
};
