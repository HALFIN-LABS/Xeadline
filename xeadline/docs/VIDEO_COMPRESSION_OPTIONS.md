# Video Compression Options for Web Applications

## Overview

Video compression is essential for optimizing upload and playback performance in web applications. This document explores various video compression options that can be implemented to improve the user experience, reduce bandwidth usage, and decrease storage costs.

## Compression Approaches

There are three main approaches to video compression in web applications:

1. **Client-side compression**: Compress videos in the browser before uploading
2. **Server-side compression**: Upload raw videos and compress them on the server
3. **Hybrid approach**: Basic client-side compression followed by server-side optimization

Each approach has its own advantages and trade-offs, which we'll explore in detail.

## Client-Side Compression

### FFmpeg.wasm

[FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) brings the powerful FFmpeg library to the browser using WebAssembly.

#### Implementation Example

```javascript
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const compressVideo = async (videoFile) => {
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();
  
  // Write the file to memory
  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
  
  // Run the compression command
  await ffmpeg.run(
    '-i', 'input.mp4',
    '-c:v', 'libx264',
    '-crf', '28',
    '-preset', 'fast',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    'output.mp4'
  );
  
  // Read the result
  const data = ffmpeg.FS('readFile', 'output.mp4');
  
  // Create a new file from the compressed data
  return new File(
    [data.buffer],
    videoFile.name.replace(/\.[^/.]+$/, "_compressed.mp4"),
    { type: 'video/mp4' }
  );
};
```

#### Pros and Cons

**Pros:**
- No server-side processing required
- Reduces upload bandwidth and time
- Works offline

**Cons:**
- CPU intensive, may freeze the browser UI
- Limited by browser capabilities and memory
- Inconsistent performance across devices

### MediaRecorder API

The [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) can be used to re-encode video at a lower bitrate.

#### Implementation Example

```javascript
const compressWithMediaRecorder = async (videoFile) => {
  // Create a video element to play the file
  const videoEl = document.createElement('video');
  videoEl.src = URL.createObjectURL(videoFile);
  await new Promise(r => videoEl.onloadedmetadata = r);
  
  // Create a canvas to capture the video frames
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d');
  
  // Set up MediaRecorder with lower bitrate
  const stream = canvas.captureStream();
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 1000000 // 1 Mbps
  });
  
  const chunks = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  
  // Start recording and playing
  recorder.start();
  videoEl.play();
  
  // Draw video frames to canvas
  const drawFrame = () => {
    if (videoEl.ended || videoEl.paused) {
      recorder.stop();
      return;
    }
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(drawFrame);
  };
  drawFrame();
  
  // Wait for recording to finish
  return new Promise(resolve => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(new File([blob], 
        videoFile.name.replace(/\.[^/.]+$/, "_compressed.webm"),
        { type: 'video/webm' }
      ));
    };
  });
};
```

#### Pros and Cons

**Pros:**
- Native browser API, no external dependencies
- Relatively efficient
- Can maintain visual quality while reducing file size

**Cons:**
- Limited codec options
- Not supported in all browsers
- May lose audio quality

### Video Compression Libraries

Several JavaScript libraries provide simplified interfaces for video compression:

1. **[Compress.js](https://github.com/fengyuanchen/compressorjs)** - Primarily for images but can be adapted
2. **[Video Compressor](https://github.com/WangYuLue/image-conversion)** - Simple compression library
3. **[React Video Compressor](https://github.com/sanjayaharshana/react-video-compressor)** - React component for video compression

## Server-Side Compression

### FFmpeg on Node.js

FFmpeg is the industry standard for video processing and can be used on the server.

#### Implementation Example

```javascript
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const compressVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i ${inputPath} -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k ${outputPath}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(outputPath);
    });
  });
};

// API route handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  
  try {
    // Save uploaded file
    const tempPath = `/tmp/${Date.now()}.mp4`;
    fs.writeFileSync(tempPath, req.body);
    
    // Compress the video
    const outputPath = `/tmp/${Date.now()}_compressed.mp4`;
    await compressVideo(tempPath, outputPath);
    
    // Read the compressed file
    const compressedData = fs.readFileSync(outputPath);
    
    // Clean up
    fs.unlinkSync(tempPath);
    fs.unlinkSync(outputPath);
    
    // Upload to storage
    const result = await uploadToStorage(compressedData);
    
    res.status(200).json({ url: result.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

#### Pros and Cons

**Pros:**
- Powerful and flexible compression options
- No client-side resource usage
- Consistent results

**Cons:**
- Increases server load
- May have timeout issues with serverless functions
- Requires more complex infrastructure

### Cloud-Based Video Processing

Several cloud services offer video processing capabilities:

1. **[AWS Elastic Transcoder](https://aws.amazon.com/elastictranscoder/)** - Managed video transcoding
2. **[Google Cloud Video Intelligence](https://cloud.google.com/video-intelligence)** - Video analysis and processing
3. **[Azure Media Services](https://azure.microsoft.com/en-us/services/media-services/)** - Media encoding and streaming

#### Implementation Example (AWS Elastic Transcoder)

```javascript
import AWS from 'aws-sdk';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const elasticTranscoder = new AWS.ElasticTranscoder();
const s3 = new AWS.S3();

// API route handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  
  try {
    // Upload original to S3
    const key = `uploads/${Date.now()}.mp4`;
    await s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: req.body,
      ContentType: 'video/mp4'
    }).promise();
    
    // Create transcoding job
    const job = await elasticTranscoder.createJob({
      PipelineId: process.env.ELASTIC_TRANSCODER_PIPELINE_ID,
      Input: {
        Key: key,
        FrameRate: 'auto',
        Resolution: 'auto',
        AspectRatio: 'auto',
        Interlaced: 'auto',
        Container: 'auto'
      },
      Outputs: [{
        Key: `compressed/${Date.now()}.mp4`,
        PresetId: '1351620000001-000010' // System preset: Generic 720p
      }]
    }).promise();
    
    res.status(200).json({ 
      jobId: job.Job.Id,
      status: 'processing'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

#### Pros and Cons

**Pros:**
- Scalable and reliable
- No server maintenance
- Professional-grade transcoding

**Cons:**
- Additional costs
- Potential vendor lock-in
- More complex integration

### Dedicated Video Platforms

Specialized video platforms provide end-to-end video handling:

1. **[Mux](https://mux.com/)** - Video API for developers
2. **[Cloudinary](https://cloudinary.com/)** - Media management platform
3. **[Vimeo](https://developer.vimeo.com/)** - Video hosting with API access

#### Implementation Example (Mux)

```javascript
import Mux from '@mux/mux-node';
import { v4 as uuidv4 } from 'uuid';

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID,
  process.env.MUX_TOKEN_SECRET
);

// API route handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  
  try {
    // Create a direct upload URL
    const upload = await Video.Uploads.create({
      cors_origin: req.headers.origin,
      new_asset_settings: {
        playback_policy: 'public',
        mp4_support: 'standard'
      }
    });
    
    res.status(200).json({ 
      uploadUrl: upload.url,
      uploadId: upload.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

#### Pros and Cons

**Pros:**
- Complete video solution (transcoding, streaming, analytics)
- Optimized for different devices and bandwidths
- Professional features (thumbnails, captions, etc.)

**Cons:**
- Monthly subscription costs
- External dependency
- May be overkill for simple use cases

## Compression Settings

### Recommended Settings for Web Videos

| Parameter | Recommended Value | Description |
|-----------|-------------------|-------------|
| Codec | H.264 (AVC) | Most compatible video codec |
| Container | MP4 | Universal container format |
| Resolution | 720p (1280x720) | Good balance of quality and size |
| Bitrate | 2-5 Mbps | Depends on content complexity |
| Audio Codec | AAC | Standard for web audio |
| Audio Bitrate | 128 Kbps | Good quality for most content |
| Framerate | Original (max 30fps) | Maintain original or cap at 30fps |
| CRF | 23-28 | Constant Rate Factor (lower = better quality) |
| Preset | medium | Encoding speed vs compression efficiency |

### FFmpeg Command Examples

**Basic Compression:**
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4
```

**Resolution Reduction:**
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -vf "scale=1280:720" -preset medium -c:a aac -b:a 128k output.mp4
```

**Bitrate Control:**
```bash
ffmpeg -i input.mp4 -c:v libx264 -b:v 2M -maxrate 2M -bufsize 1M -c:a aac -b:a 128k output.mp4
```

**Fast Compression (Lower Quality):**
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k output.mp4
```

## Implementation Strategy

### Recommended Approach

For most web applications, a hybrid approach works best:

1. **Client-side pre-processing**:
   - Resize video to maximum dimensions (e.g., 1280x720)
   - Basic compression for very large files
   - Progress feedback to user

2. **Server-side optimization**:
   - More thorough compression with FFmpeg
   - Generate multiple formats/qualities if needed
   - Create thumbnails and metadata

3. **Adaptive delivery**:
   - Serve appropriate quality based on device/connection
   - Progressive loading for faster initial playback
   - Fallback options for older browsers

### Implementation Phases

1. **Phase 1: Basic Client-Side Compression**
   - Implement FFmpeg.wasm for browser-based compression
   - Add user options for quality vs. speed
   - Improve upload UI with detailed progress

2. **Phase 2: Server-Side Processing**
   - Add FFmpeg processing on the server
   - Generate optimized versions and thumbnails
   - Implement caching strategies

3. **Phase 3: Advanced Features**
   - Adaptive bitrate streaming
   - Automatic quality selection
   - Analytics and optimization

## Conclusion

Video compression is a balance between quality, file size, and processing time. The best approach depends on your specific requirements, user base, and infrastructure constraints. By implementing a combination of client-side and server-side compression techniques, you can significantly improve the user experience while reducing bandwidth and storage costs.

For most web applications, starting with basic client-side compression and gradually adding server-side optimization provides the best balance of implementation complexity and user experience benefits.