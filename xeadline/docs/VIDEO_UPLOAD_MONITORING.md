# Video Upload Monitoring and Analytics

## Overview

Effective monitoring and analytics are essential for maintaining and improving the video upload experience in Xeadline. This document outlines a comprehensive approach to tracking key metrics, identifying issues, and making data-driven decisions to optimize the upload process.

## Key Performance Indicators (KPIs)

### Upload Performance Metrics

1. **Upload Success Rate**
   - Definition: Percentage of upload attempts that complete successfully
   - Target: >98%
   - Calculation: `(Successful Uploads / Total Upload Attempts) * 100`
   - Segmentation: By file size, device type, browser, network type

2. **Upload Time**
   - Definition: Time from upload initiation to completion
   - Target: <30 seconds for videos under 30MB
   - Calculation: `Upload End Time - Upload Start Time`
   - Segmentation: By file size, resolution, network speed

3. **Time to First Byte (TTFB)**
   - Definition: Time from upload initiation to first byte received by server
   - Target: <1 second
   - Calculation: `First Byte Received Time - Upload Start Time`
   - Importance: Early indicator of network issues

4. **Effective Throughput**
   - Definition: Actual upload speed achieved
   - Target: >80% of available bandwidth
   - Calculation: `File Size / Upload Time`
   - Segmentation: By network type, geographic location

5. **Chunk Success Rate**
   - Definition: Percentage of chunks successfully uploaded on first attempt
   - Target: >95%
   - Calculation: `(Successful Chunks / Total Chunks) * 100`
   - Importance: Indicator of chunked upload efficiency

### User Experience Metrics

1. **Upload Abandonment Rate**
   - Definition: Percentage of uploads abandoned before completion
   - Target: <5%
   - Calculation: `(Abandoned Uploads / Total Upload Attempts) * 100`
   - Segmentation: By upload duration, file size, device type

2. **Time to Preview**
   - Definition: Time from upload completion to video preview display
   - Target: <2 seconds
   - Calculation: `Preview Display Time - Upload End Time`
   - Importance: Critical for user perception of performance

3. **Error Recovery Success Rate**
   - Definition: Percentage of error recoveries that result in successful uploads
   - Target: >80%
   - Calculation: `(Successful Recoveries / Total Recovery Attempts) * 100`
   - Importance: Measures effectiveness of error handling

4. **User Satisfaction Score**
   - Definition: User rating of upload experience (1-5 scale)
   - Target: >4.5
   - Collection: Post-upload feedback prompt
   - Importance: Direct measure of perceived quality

### System Performance Metrics

1. **CPU Utilization**
   - Definition: CPU usage during upload process
   - Target: <30% increase over baseline
   - Measurement: Client-side performance API
   - Importance: Indicator of client-side efficiency

2. **Memory Usage**
   - Definition: Memory consumption during upload process
   - Target: <100MB additional usage
   - Measurement: Client-side performance API
   - Importance: Indicator of resource efficiency

3. **API Error Rate**
   - Definition: Percentage of API calls that result in errors
   - Target: <1%
   - Calculation: `(API Errors / Total API Calls) * 100`
   - Segmentation: By endpoint, error type

4. **Storage Efficiency**
   - Definition: Ratio of original file size to stored file size
   - Target: >1.2 (20% reduction)
   - Calculation: `Original Size / Stored Size`
   - Importance: Measures compression effectiveness

## Monitoring Implementation

### Client-Side Monitoring

1. **Performance Tracking**
   ```typescript
   // Performance tracking for uploads
   class UploadPerformanceTracker {
     private startTime: number;
     private ttfbTime: number | null = null;
     private endTime: number | null = null;
     private fileSize: number;
     private chunkMetrics: Map<number, { 
       startTime: number, 
       endTime?: number, 
       attempts: number 
     }> = new Map();
     private marks: Record<string, number> = {};
     
     constructor(fileSize: number) {
       this.startTime = performance.now();
       this.fileSize = fileSize;
     }
     
     recordTTFB() {
       this.ttfbTime = performance.now();
       this.mark('ttfb');
     }
     
     startChunkUpload(chunkIndex: number) {
       this.chunkMetrics.set(chunkIndex, {
         startTime: performance.now(),
         attempts: 1
       });
       this.mark(`chunk_${chunkIndex}_start`);
     }
     
     endChunkUpload(chunkIndex: number, success: boolean) {
       const chunk = this.chunkMetrics.get(chunkIndex);
       if (chunk) {
         chunk.endTime = performance.now();
         if (!success) {
           chunk.attempts += 1;
         }
         this.mark(`chunk_${chunkIndex}_end`);
       }
     }
     
     retryChunkUpload(chunkIndex: number) {
       const chunk = this.chunkMetrics.get(chunkIndex);
       if (chunk) {
         chunk.attempts += 1;
         this.mark(`chunk_${chunkIndex}_retry`);
       }
     }
     
     mark(name: string) {
       const time = performance.now();
       this.marks[name] = time;
       performance.mark(`upload_${name}`);
     }
     
     measure(name: string, startMark: string, endMark: string) {
       try {
         performance.measure(
           `upload_${name}`,
           `upload_${startMark}`,
           `upload_${endMark}`
         );
       } catch (e) {
         console.error(`Failed to measure ${name}:`, e);
       }
     }
     
     complete(success: boolean) {
       this.endTime = performance.now();
       this.mark('complete');
       
       // Create measurements
       this.measure('total_time', 'start', 'complete');
       if (this.ttfbTime) {
         this.measure('ttfb', 'start', 'ttfb');
       }
       
       // Collect metrics
       const metrics = this.getMetrics();
       
       // Send metrics to analytics
       this.sendMetricsToAnalytics(metrics, success);
       
       return metrics;
     }
     
     getMetrics() {
       const totalTime = this.endTime ? (this.endTime - this.startTime) : null;
       const ttfb = this.ttfbTime ? (this.ttfbTime - this.startTime) : null;
       
       // Calculate chunk metrics
       let successfulChunks = 0;
       let totalChunks = this.chunkMetrics.size;
       let totalChunkAttempts = 0;
       let slowestChunkTime = 0;
       let fastestChunkTime = Number.MAX_VALUE;
       let averageChunkTime = 0;
       let totalChunkTime = 0;
       
       this.chunkMetrics.forEach((chunk, index) => {
         if (chunk.endTime) {
           const chunkTime = chunk.endTime - chunk.startTime;
           totalChunkTime += chunkTime;
           slowestChunkTime = Math.max(slowestChunkTime, chunkTime);
           fastestChunkTime = Math.min(fastestChunkTime, chunkTime);
           totalChunkAttempts += chunk.attempts;
           if (chunk.attempts === 1) {
             successfulChunks++;
           }
         }
       });
       
       if (totalChunks > 0) {
         averageChunkTime = totalChunkTime / totalChunks;
       }
       
       // Calculate throughput
       const throughput = totalTime ? (this.fileSize / (totalTime / 1000)) : null; // bytes per second
       
       return {
         totalTime,
         ttfb,
         fileSize: this.fileSize,
         throughput,
         chunkMetrics: {
           totalChunks,
           successfulFirstAttemptChunks: successfulChunks,
           chunkSuccessRate: totalChunks > 0 ? (successfulChunks / totalChunks) : null,
           averageAttemptsPerChunk: totalChunks > 0 ? (totalChunkAttempts / totalChunks) : null,
           slowestChunkTime,
           fastestChunkTime,
           averageChunkTime
         },
         marks: this.marks,
         networkInfo: this.getNetworkInfo(),
         systemInfo: this.getSystemInfo()
       };
     }
     
     private getNetworkInfo() {
       const connection = navigator.connection as any;
       if (!connection) return null;
       
       return {
         effectiveType: connection.effectiveType,
         downlink: connection.downlink,
         rtt: connection.rtt,
         saveData: connection.saveData
       };
     }
     
     private getSystemInfo() {
       return {
         userAgent: navigator.userAgent,
         deviceMemory: (navigator as any).deviceMemory,
         hardwareConcurrency: navigator.hardwareConcurrency,
         platform: navigator.platform
       };
     }
     
     private sendMetricsToAnalytics(metrics: any, success: boolean) {
       // Send to analytics service
       try {
         fetch('/api/analytics/upload-performance', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({
             ...metrics,
             success,
             timestamp: new Date().toISOString()
           }),
           // Use keepalive to ensure the request completes even if the page is closed
           keepalive: true
         });
       } catch (e) {
         console.error('Failed to send metrics:', e);
       }
     }
   }
   ```

2. **User Experience Monitoring**
   ```typescript
   // Track user interactions and experience
   class UploadExperienceTracker {
     private uploadId: string;
     private startTime: number;
     private interactions: Array<{
       type: string;
       time: number;
       data?: any;
     }> = [];
     private abandonmentTimeout: number | null = null;
     
     constructor(uploadId: string) {
       this.uploadId = uploadId;
       this.startTime = Date.now();
       this.trackEvent('start');
       
       // Set up abandonment detection
       this.setupAbandonmentDetection();
     }
     
     trackEvent(type: string, data?: any) {
       this.interactions.push({
         type,
         time: Date.now() - this.startTime,
         data
       });
       
       // Reset abandonment timeout on user interaction
       this.resetAbandonmentTimeout();
     }
     
     trackError(error: Error, context?: any) {
       this.trackEvent('error', {
         message: error.message,
         stack: error.stack,
         context
       });
     }
     
     trackProgress(progress: number) {
       this.trackEvent('progress', { progress });
       this.resetAbandonmentTimeout();
     }
     
     trackCompletion(success: boolean, result?: any) {
       this.trackEvent('complete', { success, result });
       this.clearAbandonmentTimeout();
       this.sendReport();
     }
     
     trackFeedback(rating: number, comments?: string) {
       this.trackEvent('feedback', { rating, comments });
     }
     
     private setupAbandonmentDetection() {
       // Set up listeners for page visibility and unload
       document.addEventListener('visibilitychange', () => {
         if (document.visibilityState === 'hidden') {
           this.trackEvent('visibility_change', { hidden: true });
         } else {
           this.trackEvent('visibility_change', { hidden: false });
         }
       });
       
       window.addEventListener('beforeunload', () => {
         this.trackEvent('page_unload');
         this.sendReport(true);
       });
       
       // Set initial abandonment timeout
       this.resetAbandonmentTimeout();
     }
     
     private resetAbandonmentTimeout() {
       if (this.abandonmentTimeout) {
         clearTimeout(this.abandonmentTimeout);
       }
       
       // Consider upload abandoned if no activity for 2 minutes
       this.abandonmentTimeout = window.setTimeout(() => {
         this.trackEvent('abandonment_detected');
         this.sendReport(true);
       }, 2 * 60 * 1000);
     }
     
     private clearAbandonmentTimeout() {
       if (this.abandonmentTimeout) {
         clearTimeout(this.abandonmentTimeout);
         this.abandonmentTimeout = null;
       }
     }
     
     private sendReport(isAbandonment = false) {
       const report = {
         uploadId: this.uploadId,
         duration: Date.now() - this.startTime,
         interactions: this.interactions,
         isAbandonment,
         timestamp: new Date().toISOString(),
         userAgent: navigator.userAgent
       };
       
       // Send report to analytics
       try {
         navigator.sendBeacon(
           '/api/analytics/upload-experience',
           JSON.stringify(report)
         );
       } catch (e) {
         // Fallback to fetch with keepalive
         try {
           fetch('/api/analytics/upload-experience', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json'
             },
             body: JSON.stringify(report),
             keepalive: true
           });
         } catch (e2) {
           console.error('Failed to send experience report:', e2);
         }
       }
     }
   }
   ```

3. **Resource Usage Monitoring**
   ```typescript
   // Monitor client-side resource usage
   class ResourceMonitor {
     private readings: Array<{
       timestamp: number;
       memory?: number;
       cpu?: number;
       batteryLevel?: number;
       isCharging?: boolean;
     }> = [];
     private intervalId: number | null = null;
     private startTime: number;
     
     constructor() {
       this.startTime = performance.now();
     }
     
     start(intervalMs = 1000) {
       this.takeReading(); // Initial reading
       
       this.intervalId = window.setInterval(() => {
         this.takeReading();
       }, intervalMs);
     }
     
     stop() {
       if (this.intervalId !== null) {
         clearInterval(this.intervalId);
         this.intervalId = null;
       }
       
       this.takeReading(); // Final reading
       return this.getReport();
     }
     
     private async takeReading() {
       const reading: any = {
         timestamp: performance.now() - this.startTime
       };
       
       // Memory usage
       if (performance.memory) {
         reading.memory = {
           usedJSHeapSize: performance.memory.usedJSHeapSize,
           totalJSHeapSize: performance.memory.totalJSHeapSize
         };
       }
       
       // CPU usage (approximation via frame timing)
       if (window.requestIdleCallback) {
         const startTime = performance.now();
         await new Promise<void>(resolve => {
           requestIdleCallback(() => {
             const endTime = performance.now();
             const idleTime = endTime - startTime;
             const frameTime = 16.67; // ~60fps
             
             // Rough approximation of CPU usage
             reading.cpu = {
               estimated: Math.min(100, Math.max(0, 100 - (idleTime / frameTime) * 100))
             };
             resolve();
           });
         });
       }
       
       // Battery information
       if (navigator.getBattery) {
         try {
           const battery = await navigator.getBattery();
           reading.batteryLevel = battery.level * 100;
           reading.isCharging = battery.charging;
         } catch (e) {
           console.error('Failed to get battery info:', e);
         }
       }
       
       this.readings.push(reading);
     }
     
     getReport() {
       // Calculate averages and peaks
       let totalMemory = 0;
       let peakMemory = 0;
       let totalCpu = 0;
       let peakCpu = 0;
       let readingsWithMemory = 0;
       let readingsWithCpu = 0;
       
       this.readings.forEach(reading => {
         if (reading.memory) {
           totalMemory += reading.memory.usedJSHeapSize;
           peakMemory = Math.max(peakMemory, reading.memory.usedJSHeapSize);
           readingsWithMemory++;
         }
         
         if (reading.cpu) {
           totalCpu += reading.cpu.estimated;
           peakCpu = Math.max(peakCpu, reading.cpu.estimated);
           readingsWithCpu++;
         }
       });
       
       return {
         duration: this.readings[this.readings.length - 1].timestamp,
         readings: this.readings,
         summary: {
           memory: readingsWithMemory > 0 ? {
             average: totalMemory / readingsWithMemory,
             peak: peakMemory
           } : undefined,
           cpu: readingsWithCpu > 0 ? {
             average: totalCpu / readingsWithCpu,
             peak: peakCpu
           } : undefined
         }
       };
     }
   }
   ```

### Server-Side Monitoring

1. **API Performance Tracking**
   ```typescript
   // Middleware for tracking API performance
   import { NextApiRequest, NextApiResponse } from 'next';
   import { v4 as uuidv4 } from 'uuid';

   export default function apiMetricsMiddleware(
     handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
   ) {
     return async (req: NextApiRequest, res: NextApiResponse) => {
       const startTime = process.hrtime();
       const requestId = uuidv4();
       
       // Add request ID to response headers for correlation
       res.setHeader('X-Request-ID', requestId);
       
       // Create a response proxy to capture status code
       const originalEnd = res.end;
       let responseBody: any;
       let statusCode = 200;
       
       // Override res.end to capture response data
       res.end = function(chunk?: any, ...args: any[]) {
         if (chunk) {
           responseBody = chunk;
         }
         statusCode = res.statusCode;
         
         // Record metrics
         const hrTime = process.hrtime(startTime);
         const durationMs = hrTime[0] * 1000 + hrTime[1] / 1000000;
         
         // Log metrics
         console.log(JSON.stringify({
           type: 'api_metrics',
           timestamp: new Date().toISOString(),
           requestId,
           method: req.method,
           url: req.url,
           statusCode,
           durationMs,
           contentLength: responseBody ? responseBody.length : 0,
           userAgent: req.headers['user-agent']
         }));
         
         // Call original end method
         return originalEnd.call(this, chunk, ...args);
       };
       
       try {
         // Execute the API handler
         await handler(req, res);
       } catch (error) {
         // Log error
         console.error(JSON.stringify({
           type: 'api_error',
           timestamp: new Date().toISOString(),
           requestId,
           method: req.method,
           url: req.url,
           error: error.message,
           stack: error.stack
         }));
         
         // If response hasn't been sent yet, send error response
         if (!res.writableEnded) {
           res.status(500).json({ error: 'Internal Server Error' });
         }
       }
     };
   }
   ```

2. **Upload Session Tracking**
   ```typescript
   // Track upload sessions on the server
   class UploadSessionTracker {
     private db: any; // Database connection
     
     constructor(db: any) {
       this.db = db;
     }
     
     async trackSessionStart(
       uploadId: string,
       metadata: {
         userId?: string;
         fileName: string;
         fileSize: number;
         contentType: string;
         chunkCount: number;
       }
     ) {
       await this.db.uploadSessions.create({
         data: {
           id: uploadId,
           userId: metadata.userId,
           fileName: metadata.fileName,
           fileSize: metadata.fileSize,
           contentType: metadata.contentType,
           chunkCount: metadata.chunkCount,
           status: 'started',
           startedAt: new Date(),
           lastActivityAt: new Date()
         }
       });
     }
     
     async trackChunkReceived(
       uploadId: string,
       chunkIndex: number,
       success: boolean
     ) {
       // Update last activity time
       await this.db.uploadSessions.update({
         where: { id: uploadId },
         data: { lastActivityAt: new Date() }
       });
       
       // Track chunk status
       await this.db.uploadChunks.upsert({
         where: {
           uploadId_chunkIndex: {
             uploadId,
             chunkIndex
           }
         },
         create: {
           uploadId,
           chunkIndex,
           status: success ? 'success' : 'failed',
           attempts: 1,
           receivedAt: new Date()
         },
         update: {
           status: success ? 'success' : 'failed',
           attempts: { increment: 1 },
           receivedAt: success ? new Date() : undefined
         }
       });
     }
     
     async trackSessionComplete(
       uploadId: string,
       success: boolean,
       result?: {
         url?: string;
         error?: string;
       }
     ) {
       await this.db.uploadSessions.update({
         where: { id: uploadId },
         data: {
           status: success ? 'completed' : 'failed',
           completedAt: new Date(),
           resultUrl: result?.url,
           error: result?.error,
           lastActivityAt: new Date()
         }
       });
       
       // Calculate session metrics
       const session = await this.db.uploadSessions.findUnique({
         where: { id: uploadId },
         include: {
           chunks: true
         }
       });
       
       if (session) {
         const duration = session.completedAt 
           ? (session.completedAt.getTime() - session.startedAt.getTime()) 
           : null;
         
         const successfulChunks = session.chunks.filter(c => c.status === 'success').length;
         const chunkSuccessRate = session.chunkCount > 0 
           ? (successfulChunks / session.chunkCount) 
           : null;
         
         const totalAttempts = session.chunks.reduce((sum, chunk) => sum + chunk.attempts, 0);
         const avgAttemptsPerChunk = session.chunkCount > 0 
           ? (totalAttempts / session.chunkCount) 
           : null;
         
         // Store metrics
         await this.db.uploadMetrics.create({
           data: {
             uploadId,
             duration,
             chunkSuccessRate,
             avgAttemptsPerChunk,
             totalAttempts,
             success
           }
         });
       }
     }
     
     async getSessionStats(timeRange: { start: Date; end: Date }) {
       const sessions = await this.db.uploadSessions.findMany({
         where: {
           startedAt: {
             gte: timeRange.start,
             lte: timeRange.end
           }
         },
         include: {
           metrics: true
         }
       });
       
       // Calculate aggregate stats
       const totalSessions = sessions.length;
       const completedSessions = sessions.filter(s => s.status === 'completed').length;
       const failedSessions = sessions.filter(s => s.status === 'failed').length;
       const abandonedSessions = sessions.filter(s => 
         s.status === 'started' && 
         new Date().getTime() - s.lastActivityAt.getTime() > 30 * 60 * 1000 // 30 minutes
       ).length;
       
       const successRate = totalSessions > 0 
         ? (completedSessions / totalSessions) * 100 
         : null;
       
       const durations = sessions
         .filter(s => s.metrics && s.metrics.duration)
         .map(s => s.metrics.duration);
       
       const avgDuration = durations.length > 0 
         ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
         : null;
       
       const p95Duration = durations.length > 0 
         ? this.percentile(durations, 95) 
         : null;
       
       return {
         timeRange,
         totalSessions,
         completedSessions,
         failedSessions,
         abandonedSessions,
         successRate,
         avgDuration,
         p95Duration
       };
     }
     
     private percentile(values: number[], p: number) {
       if (values.length === 0) return null;
       
       const sorted = [...values].sort((a, b) => a - b);
       const pos = (sorted.length - 1) * (p / 100);
       const base = Math.floor(pos);
       const rest = pos - base;
       
       if (sorted[base + 1] !== undefined) {
         return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
       } else {
         return sorted[base];
       }
     }
   }
   ```

3. **Storage Service Monitoring**
   ```typescript
   // Monitor storage service operations
   class StorageServiceMonitor {
     private metrics: {
       operations: Map<string, {
         count: number;
         errors: number;
         totalDuration: number;
         totalBytes: number;
       }>;
       lastResetTime: number;
     };
     
     constructor() {
       this.metrics = {
         operations: new Map(),
         lastResetTime: Date.now()
       };
       
       // Report metrics periodically
       setInterval(() => {
         this.reportMetrics();
       }, 5 * 60 * 1000); // Every 5 minutes
     }
     
     trackOperation(
       operation: string,
       durationMs: number,
       bytes: number,
       success: boolean
     ) {
       let opMetrics = this.metrics.operations.get(operation);
       
       if (!opMetrics) {
         opMetrics = {
           count: 0,
           errors: 0,
           totalDuration: 0,
           totalBytes: 0
         };
         this.metrics.operations.set(operation, opMetrics);
       }
       
       opMetrics.count++;
       if (!success) {
         opMetrics.errors++;
       }
       opMetrics.totalDuration += durationMs;
       opMetrics.totalBytes += bytes;
     }
     
     async reportMetrics() {
       const now = Date.now();
       const intervalMs = now - this.metrics.lastResetTime;
       
       const report = {
         timestamp: new Date().toISOString(),
         intervalMs,
         operations: {} as Record<string, any>
       };
       
       this.metrics.operations.forEach((metrics, operation) => {
         report.operations[operation] = {
           count: metrics.count,
           errorsCount: metrics.errors,
           errorRate: metrics.count > 0 ? (metrics.errors / metrics.count) * 100 : 0,
           avgDurationMs: metrics.count > 0 ? metrics.totalDuration / metrics.count : 0,
           totalBytes: metrics.totalBytes,
           throughputBytesPerSec: intervalMs > 0 ? (metrics.totalBytes / (intervalMs / 1000)) : 0
         };
       });
       
       // Log or send to monitoring service
       console.log('Storage Service Metrics:', JSON.stringify(report));
       
       // Reset metrics
       this.metrics.operations.clear();
       this.metrics.lastResetTime = now;
     }
   }
   ```

## Analytics Dashboard

### Dashboard Requirements

1. **Real-time Monitoring Panel**
   - Active uploads count
   - Success/failure rates (last 24 hours)
   - Average upload time (last 24 hours)
   - Error rate by type (last 24 hours)

2. **Performance Trends**
   - Upload time by file size (chart)
   - Success rate over time (chart)
   - Error types distribution (pie chart)
   - Geographic performance heatmap

3. **User Experience Metrics**
   - Abandonment rate trend
   - User satisfaction scores
   - Time to preview trend
   - Device/browser performance comparison

4. **System Health**
   - API response times
   - Storage service performance
   - Error rates by endpoint
   - Resource usage trends

### Dashboard Implementation

1. **Data Collection API**
   ```typescript
   // API endpoint for collecting analytics data
   import { NextApiRequest, NextApiResponse } from 'next';
   import { connectToDatabase } from '../../lib/mongodb';

   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     if (req.method !== 'POST') {
       return res.status(405).json({ error: 'Method not allowed' });
     }
     
     try {
       const { db } = await connectToDatabase();
       
       // Determine collection based on data type
       let collection;
       switch (req.query.type) {
         case 'performance':
           collection = db.collection('uploadPerformance');
           break;
         case 'experience':
           collection = db.collection('uploadExperience');
           break;
         case 'resource':
           collection = db.collection('resourceUsage');
           break;
         default:
           collection = db.collection('uploadAnalytics');
       }
       
       // Add timestamp if not present
       const data = {
         ...req.body,
         receivedAt: new Date(),
         timestamp: req.body.timestamp || new Date().toISOString()
       };
       
       // Store the data
       await collection.insertOne(data);
       
       // Return success
       res.status(200).json({ success: true });
     } catch (error) {
       console.error('Error storing analytics data:', error);
       res.status(500).json({ error: 'Failed to store analytics data' });
     }
   }
   ```

2. **Dashboard Data API**
   ```typescript
   // API endpoint for retrieving dashboard data
   import { NextApiRequest, NextApiResponse } from 'next';
   import { connectToDatabase } from '../../lib/mongodb';

   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     if (req.method !== 'GET') {
       return res.status(405).json({ error: 'Method not allowed' });
     }
     
     try {
       const { db } = await connectToDatabase();
       
       // Parse time range
       const { start, end, metric } = req.query;
       const startDate = start ? new Date(start as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
       const endDate = end ? new Date(end as string) : new Date();
       
       let result;
       
       switch (metric) {
         case 'upload_success_rate':
           result = await getUploadSuccessRate(db, startDate, endDate);
           break;
         case 'upload_time':
           result = await getUploadTime(db, startDate, endDate);
           break;
         case 'error_distribution':
           result = await getErrorDistribution(db, startDate, endDate);
           break;
         case 'user_satisfaction':
           result = await getUserSatisfaction(db, startDate, endDate);
           break;
         case 'active_uploads':
           result = await getActiveUploads(db);
           break;
         default:
           result = await getSummaryMetrics(db, startDate, endDate);
       }
       
       res.status(200).json(result);
     } catch (error) {
       console.error('Error retrieving dashboard data:', error);
       res.status(500).json({ error: 'Failed to retrieve dashboard data' });
     }
   }
   
   async function getUploadSuccessRate(db, startDate, endDate) {
     const result = await db.collection('uploadPerformance').aggregate([
       {
         $match: {
           timestamp: { $gte: startDate, $lte: endDate }
         }
       },
       {
         $group: {
           _id: {
             $dateToString: { format: '%Y-%m-%d-%H', date: '$timestamp' }
           },
           total: { $sum: 1 },
           successful: {
             $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
           }
         }
       },
       {
         $project: {
           _id: 0,
           hour: '$_id',
           total: 1,
           successful: 1,
           rate: {
             $multiply: [
               { $divide: ['$successful', '$total'] },
               100
             ]
           }
         }
       },
       { $sort: { hour: 1 } }
     ]).toArray();
     
     return { data: result };
   }
   
   // Implement other metric retrieval functions similarly
   ```

3. **Real-time Updates**
   ```typescript
   // WebSocket server for real-time dashboard updates
   import { Server } from 'socket.io';
   import { createServer } from 'http';
   import { connectToDatabase } from '../lib/mongodb';

   const httpServer = createServer();
   const io = new Server(httpServer, {
     cors: {
       origin: process.env.DASHBOARD_URL,
       methods: ['GET', 'POST']
     }
   });

   // Connect to database
   let db;
   connectToDatabase().then(({ db: database }) => {
     db = database;
     startMetricsCollection();
   });

   // Set up real-time metrics collection
   function startMetricsCollection() {
     // Collect and broadcast metrics every 10 seconds
     setInterval(async () => {
       try {
         const metrics = await collectRealTimeMetrics();
         io.emit('metrics_update', metrics);
       } catch (error) {
         console.error('Error collecting real-time metrics:', error);
       }
     }, 10000);
   }

   async function collectRealTimeMetrics() {
     const now = new Date();
     const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
     
     // Get active uploads (started but not completed)
     const activeUploads = await db.collection('uploadSessions').countDocuments({
       status: 'started',
       lastActivityAt: { $gte: new Date(now.getTime() - 5 * 60 * 1000) }
     });
     
     // Get recent success rate
     const recentUploads = await db.collection('uploadSessions').aggregate([
       {
         $match: {
           startedAt: { $gte: oneHourAgo }
         }
       },
       {
         $group: {
           _id: null,
           total: { $sum: 1 },
           completed: {
             $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
           },
           failed: {
             $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
           }
         }
       }
     ]).toArray();
     
     const successRate = recentUploads.length > 0 && recentUploads[0].total > 0
       ? (recentUploads[0].completed / recentUploads[0].total) * 100
       : null;
     
     // Get recent errors
     const recentErrors = await db.collection('uploadSessions').aggregate([
       {
         $match: {
           status: 'failed',
           completedAt: { $gte: oneHourAgo }
         }
       },
       {
         $group: {
           _id: '$error',
           count: { $sum: 1 }
         }
       },
       { $sort: { count: -1 } },
       { $limit: 5 }
     ]).toArray();
     
     return {
       timestamp: now.toISOString(),
       activeUploads,
       recentSuccessRate: successRate,
       recentErrors: recentErrors.map(e => ({
         error: e._id || 'Unknown error',
         count: e.count
       }))
     };
   }

   // Start the server
   const PORT = process.env.METRICS_SOCKET_PORT || 3001;
   httpServer.listen(PORT, () => {
     console.log(`Metrics socket server running on port ${PORT}`);
   });
   ```

## Alerting System

### Alert Conditions

1. **Critical Alerts**
   - Upload success rate drops below 90% for 15 minutes
   - Average upload time increases by 100% for 30 minutes
   - API error rate exceeds 5% for 10 minutes
   - Storage service unavailable for 5 minutes

2. **Warning Alerts**
   - Upload success rate drops below 95% for 30 minutes
   - Average upload time increases by 50% for 1 hour
   - More than 10 abandoned uploads in 1 hour
   - Unusual spike in resource usage (CPU/memory)

3. **Information Alerts**
   - Daily upload statistics summary
   - Weekly performance trends
   - New error types detected
   - Unusual geographic or device patterns

### Alert Implementation

```typescript
// Alert monitoring service
class AlertMonitor {
  private db: any;
  private alertChannels: AlertChannel[];
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(db: any, alertChannels: AlertChannel[]) {
    this.db = db;
    this.alertChannels = alertChannels;
    
    // Set up alert checks
    this.setupAlertChecks();
  }
  
  private setupAlertChecks() {
    // Critical alerts - check frequently
    this.setupCheck('upload_success_rate_critical', async () => {
      const result = await this.checkUploadSuccessRate(90, 15);
      return {
        triggered: result.triggered,
        message: `CRITICAL: Upload success rate is ${result.rate.toFixed(1)}% (below 90%) for the last 15 minutes`,
        data: result
      };
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    this.setupCheck('upload_time_critical', async () => {
      const result = await this.checkUploadTimeIncrease(100, 30);
      return {
        triggered: result.triggered,
        message: `CRITICAL: Average upload time increased by ${result.percentIncrease.toFixed(1)}% in the last 30 minutes`,
        data: result
      };
    }, 10 * 60 * 1000); // Check every 10 minutes
    
    // Warning alerts - check less frequently
    this.setupCheck('upload_success_rate_warning', async () => {
      const result = await this.checkUploadSuccessRate(95, 30);
      return {
        triggered: result.triggered,
        message: `WARNING: Upload success rate is ${result.rate.toFixed(1)}% (below 95%) for the last 30 minutes`,
        data: result
      };
    }, 15 * 60 * 1000); // Check every 15 minutes
    
    // Information alerts - daily summaries
    this.setupDailySummary();
  }
  
  private setupCheck(
    alertId: string,
    checkFn: () => Promise<{ triggered: boolean; message: string; data: any }>,
    interval: number
  ) {
    // Clear any existing interval
    if (this.checkIntervals.has(alertId)) {
      clearInterval(this.checkIntervals.get(alertId)!);
    }
    
    // Set up new check interval
    const checkInterval = setInterval(async () => {
      try {
        const result = await checkFn();
        
        if (result.triggered) {
          await this.triggerAlert({
            id: alertId,
            level: alertId.includes('critical') ? 'critical' : 
                  alertId.includes('warning') ? 'warning' : 'info',
            message: result.message,
            timestamp: new Date(),
            data: result.data
          });
        }
      } catch (error) {
        console.error(`Error checking alert ${alertId}:`, error);
      }
    }, interval);
    
    this.checkIntervals.set(alertId, checkInterval);
  }
  
  private setupDailySummary() {
    // Calculate time until next summary (9 AM)
    const now = new Date();
    const nextSummary = new Date(now);
    nextSummary.setHours(9, 0, 0, 0);
    if (now >= nextSummary) {
      nextSummary.setDate(nextSummary.getDate() + 1);
    }
    
    const timeUntilSummary = nextSummary.getTime() - now.getTime();
    
    // Schedule the first summary
    setTimeout(() => {
      this.sendDailySummary();
      
      // Then schedule it daily
      setInterval(() => {
        this.sendDailySummary();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilSummary);
  }
  
  private async sendDailySummary() {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Get daily stats
      const stats = await this.getDailyStats(yesterday);
      
      // Format message
      const message = `
        Daily Upload Statistics Summary (${yesterday.toLocaleDateString()})
        
        Total Uploads: ${stats.totalUploads}
        Success Rate: ${stats.successRate.toFixed(1)}%
        Average Upload Time: ${(stats.avgUploadTime / 1000).toFixed(1)} seconds
        
        Top Errors:
        ${stats.topErrors.map(e => `- ${e.error}: ${e.count} occurrences`).join('\n')}
        
        Device Breakdown:
        - Mobile: ${stats.deviceBreakdown.mobile}%
        - Desktop: ${stats.deviceBreakdown.desktop}%
        - Tablet: ${stats.deviceBreakdown.tablet}%
        
        View full report: ${process.env.DASHBOARD_URL}/reports/daily/${yesterday.toISOString().split('T')[0]}
      `;
      
      // Send as info alert
      await this.triggerAlert({
        id: 'daily_summary',
        level: 'info',
        message,
        timestamp: now,
        data: stats
      });
    } catch (error) {
      console.error('Error sending daily summary:', error);
    }
  }
  
  private async triggerAlert(alert: {
    id: string;
    level: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
    data: any;
  }) {
    try {
      // Store alert in database
      await this.db.collection('alerts').insertOne(alert);
      
      // Send to all configured channels
      for (const channel of this.alertChannels) {
        try {
          await channel.sendAlert(alert);
        } catch (error) {
          console.error(`Error sending alert to channel ${channel.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }
  
  // Alert check implementations
  private async checkUploadSuccessRate(threshold: number, minutes: number) {
    const now = new Date();
    const startTime = new Date(now.getTime() - minutes * 60 * 1000);
    
    const result = await this.db.collection('uploadSessions').aggregate([
      {
        $match: {
          startedAt: { $gte: startTime, $lte: now },
          status: { $in: ['completed', 'failed'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]).toArray();
    
    if (result.length === 0 || result[0].total < 10) {
      // Not enough data
      return { triggered: false, rate: 100, total: 0, threshold };
    }
    
    const rate = (result[0].successful / result[0].total) * 100;
    
    return {
      triggered: rate < threshold,
      rate,
      total: result[0].total,
      successful: result[0].successful,
      threshold
    };
  }
  
  private async checkUploadTimeIncrease(percentThreshold: number, minutes: number) {
    const now = new Date();
    const periodEnd = now;
    const periodStart = new Date(now.getTime() - minutes * 60 * 1000);
    const baselinePeriodEnd = periodStart;
    const baselinePeriodStart = new Date(baselinePeriodEnd.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before
    
    // Get current period average
    const currentPeriod = await this.getAverageUploadTime(periodStart, periodEnd);
    
    // Get baseline period average
    const baselinePeriod = await this.getAverageUploadTime(baselinePeriodStart, baselinePeriodEnd);
    
    if (!currentPeriod.avgTime || !baselinePeriod.avgTime || baselinePeriod.count < 10) {
      // Not enough data
      return { triggered: false, percentIncrease: 0, threshold: percentThreshold };
    }
    
    const percentIncrease = ((currentPeriod.avgTime - baselinePeriod.avgTime) / baselinePeriod.avgTime) * 100;
    
    return {
      triggered: percentIncrease > percentThreshold,
      percentIncrease,
      currentAvg: currentPeriod.avgTime,
      baselineAvg: baselinePeriod.avgTime,
      threshold: percentThreshold
    };
  }
  
  private async getAverageUploadTime(startTime: Date, endTime: Date) {
    const result = await this.db.collection('uploadSessions').aggregate([
      {
        $match: {
          startedAt: { $gte: startTime, $lte: endTime },
          status: 'completed',
          completedAt: { $exists: true }
        }
      },
      {
        $project: {
          duration: {
            $subtract: ['$completedAt', '$startedAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$duration' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    return {
      avgTime: result.length > 0 ? result[0].avgTime : null,
      count: result.length > 0 ? result[0].count : 0
    };
  }
  
  private async getDailyStats(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get upload stats
    const uploadStats = await this.db.collection('uploadSessions').aggregate([
      {
        $match: {
          startedAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalUploads: { $sum: 1 },
          successfulUploads: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalDuration: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'completed'] },
                  { $ne: [{ $type: '$completedAt' }, 'missing'] },
                  { $ne: [{ $type: '$startedAt' }, 'missing'] }
                ]},
                { $subtract: ['$completedAt', '$startedAt'] },
                0
              ]
            }
          },
          completedCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'completed'] },
                  { $ne: [{ $type: '$completedAt' }, 'missing'] },
                  { $ne: [{ $type: '$startedAt' }, 'missing'] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();
    
    // Get top errors
    const topErrors = await this.db.collection('uploadSessions').aggregate([
      {
        $match: {
          startedAt: { $gte: startOfDay, $lte: endOfDay },
          status: 'failed',
          error: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$error',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();
    
    // Get device breakdown
    const deviceBreakdown = await this.db.collection('uploadExperience').aggregate([
      {
        $match: {
          timestamp: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $addFields: {
          isMobile: {
            $regexMatch: {
              input: '$userAgent',
              regex: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
            }
          },
          isTablet: {
            $regexMatch: {
              input: '$userAgent',
              regex: /iPad|Android(?!.*Mobile)/i
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          mobile: {
            $sum: { $cond: [{ $eq: ['$isMobile', true] }, 1, 0] }
          },
          tablet: {
            $sum: { $cond: [{ $eq: ['$isTablet', true] }, 1, 0] }
          }
        }
      }
    ]).toArray();
    
    // Calculate stats
    const stats = uploadStats.length > 0 ? uploadStats[0] : { 
      totalUploads: 0, 
      successfulUploads: 0,
      totalDuration: 0,
      completedCount: 0
    };
    
    const successRate = stats.totalUploads > 0 
      ? (stats.successfulUploads / stats.totalUploads) * 100 
      : 0;
    
    const avgUploadTime = stats.completedCount > 0 
      ? stats.totalDuration / stats.completedCount 
      : 0;
    
    // Calculate device breakdown percentages
    let deviceStats = { mobile: 0, desktop: 0, tablet: 0 };
    
    if (deviceBreakdown.length > 0 && deviceBreakdown[0].total > 0) {
      const db = deviceBreakdown[0];
      deviceStats = {
        mobile: ((db.mobile - db.tablet) / db.total) * 100,
        tablet: (db.tablet / db.total) * 100,
        desktop: ((db.total - db.mobile) / db.total) * 100
      };
    }
    
    return {
      date: date.toISOString().split('T')[0],
      totalUploads: stats.totalUploads,
      successRate,
      avgUploadTime,
      topErrors: topErrors.map(e => ({
        error: e._id,
        count: e.count
      })),
      deviceBreakdown: deviceStats
    };
  }
}

// Alert channel interface
interface AlertChannel {
  name: string;
  sendAlert(alert: any): Promise<void>;
}

// Email alert channel
class EmailAlertChannel implements AlertChannel {
  name = 'email';
  
  async sendAlert(alert: any): Promise<void> {
    // Implementation depends on email service
    const { level, message } = alert;
    
    // Only send emails for critical and warning alerts
    if (level === 'info') {
      return;
    }
    
    // Send email
    // ...
  }
}

// Slack alert channel
class SlackAlertChannel implements AlertChannel {
  name = 'slack';
  private webhookUrl: string;
  
  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }
  
  async sendAlert(alert: any): Promise<void> {
    const { level, message, timestamp, data } = alert;
    
    // Format message for Slack
    const color = level === 'critical' ? '#FF0000' : 
                 level === 'warning' ? '#FFA500' : '#36A64F';
    
    const payload = {
      attachments: [
        {
          color,
          title: `[${level.toUpperCase()}] Upload Alert`,
          text: message,
          fields: [
            {
              title: 'Time',
              value: new Date(timestamp).toLocaleString(),
              short: true
            },
            {
              title: 'Alert ID',
              value: alert.id,
              short: true
            }
          ],
          footer: 'Xeadline Upload Monitoring'
        }
      ]
    };
    
    // Send to Slack
    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }
}
```

## Continuous Improvement Process

### Data-Driven Optimization

1. **Weekly Performance Review**
   - Review key metrics and trends
   - Identify performance bottlenecks
   - Prioritize improvements based on impact

2. **A/B Testing Framework**
   - Test different upload strategies
   - Compare performance metrics
   - Gradually roll out improvements

3. **User Feedback Integration**
   - Collect and analyze user feedback
   - Correlate feedback with performance metrics
   - Identify user experience pain points

### Implementation Workflow

1. **Identify Issues**
   - Monitor dashboards for anomalies
   - Analyze error patterns
   - Review user feedback

2. **Prioritize Improvements**
   - Assess impact on user experience
   - Evaluate implementation complexity
   - Consider resource requirements

3. **Implement and Test**
   - Develop improvements
   - Test in staging environment
   - Validate with performance metrics

4. **Deploy and Monitor**
   - Gradually roll out changes
   - Monitor impact on key metrics
   - Adjust based on real-world performance

## Conclusion

A comprehensive monitoring and analytics system is essential for maintaining and improving the video upload experience in Xeadline. By tracking key metrics, identifying issues early, and making data-driven decisions, we can ensure that video uploads are fast, reliable, and user-friendly.

The implementation outlined in this document provides a solid foundation for monitoring upload performance, user experience, and system health. By continuously collecting and analyzing this data, we can identify opportunities for optimization and ensure that our video upload functionality meets the needs of our users.

Key takeaways:

1. **Holistic Monitoring**: Track client-side, server-side, and user experience metrics to get a complete picture of upload performance.

2. **Real-time Visibility**: Implement dashboards and alerts to quickly identify and respond to issues.

3. **Data-Driven Decisions**: Use analytics to guide optimization efforts and measure the impact of improvements.

4. **Continuous Improvement**: Establish a process for regularly reviewing metrics and implementing enhancements.

By following these principles and implementing the monitoring system described in this document, we can create a video upload experience that is reliable, efficient, and user-friendly.