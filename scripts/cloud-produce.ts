import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@vexa/database';
import { pipeline, env } from '@xenova/transformers';
import { searchStockVideos } from '../apps/control-plane/src/services/pexelsService.js';
import { searchCC0AmbientSound } from '../apps/control-plane/src/services/freesoundService.js';
import { FFmpegRenderer } from '../apps/backend/src/pipeline/FFmpegRenderer.js';
import { CompositionTimeline } from '../apps/backend/src/pipeline/ScenePlanner.js';
import { YouTubePublishingProvider } from '../apps/backend/src/providers/publishing/YouTubePublishingProvider.js';
import { decryptToken, refreshAccessToken } from '../apps/backend/src/utils/youtubeAuth.js';
import { logger } from '../apps/backend/src/utils/logger.js';

const execAsync = promisify(exec);

// Configure single-threaded execution for ONNX
if (env && env.backends && env.backends.onnx && env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

function parseJobIdArg(): string {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('jobId=')) {
      return arg.split('=')[1]!.trim();
    }
    if (arg.startsWith('--jobId=')) {
      return arg.split('=')[1]!.trim();
    }
  }
  const jobIdIdx = process.argv.findIndex((a) => a === 'jobId' || a === '--jobId');
  if (jobIdIdx !== -1 && process.argv[jobIdIdx + 1]) {
    return process.argv[jobIdIdx + 1]!.trim();
  }
  if (process.argv[2] && !process.argv[2].includes('=')) {
    return process.argv[2]!.trim();
  }
  throw new Error('Missing required argument jobId. Usage: npx tsx scripts/cloud-produce.ts jobId=<id>');
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  await fs.promises.writeFile(destPath, Buffer.from(arrayBuffer));
}

async function generateNarrationWav(scriptText: string, outputPath: string): Promise<number> {
  logger.info({ scriptText }, 'Synthesizing speech narration audio via Xenova MMS-TTS');
  const synthesizer = await pipeline('text-to-speech', 'Xenova/mms-tts-eng', { quantized: true });
  const output = await synthesizer(scriptText);
  const audioData: Float32Array = output.audio;
  const samplingRate: number = output.sampling_rate || 22050;
  const durationSeconds = audioData.length / samplingRate;

  const buffer = new ArrayBuffer(44 + audioData.length * 2);
  const view = new DataView(buffer);

  function writeString(v: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + audioData.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, samplingRate, true);
  view.setUint32(28, samplingRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, audioData.length * 2, true);

  let offset = 44;
  for (let i = 0; i < audioData.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  await fs.promises.writeFile(outputPath, Buffer.from(buffer));
  logger.info({ durationSeconds, outputPath }, 'Speech narration audio synthesized successfully');
  return durationSeconds;
}

async function getYouTubeAccessToken(): Promise<string> {
  const memoryEntry = await prisma.memoryEntry.findUnique({
    where: { key: 'YOUTUBE_REFRESH_TOKEN' },
  });

  let refreshToken: string | null = null;

  if (memoryEntry && (memoryEntry.data as any)?.encryptedRefreshToken) {
    try {
      refreshToken = decryptToken((memoryEntry.data as any).encryptedRefreshToken);
      logger.info('Decrypted YouTube refresh token from PostgreSQL database');
    } catch (e) {
      logger.warn({ error: e }, 'Could not decrypt refresh token from database');
    }
  }

  if (!refreshToken && process.env['YOUTUBE_REFRESH_TOKEN']) {
    const rawEnvToken = process.env['YOUTUBE_REFRESH_TOKEN'];
    if (rawEnvToken.includes(':')) {
      try {
        refreshToken = decryptToken(rawEnvToken);
      } catch {
        refreshToken = rawEnvToken;
      }
    } else {
      refreshToken = rawEnvToken;
    }
  }

  if (refreshToken) {
    logger.info('Exchanging refresh token for fresh YouTube access token...');
    return await refreshAccessToken(refreshToken);
  }

  if (process.env['YOUTUBE_ACCESS_TOKEN']) {
    return process.env['YOUTUBE_ACCESS_TOKEN'];
  }

  throw new Error('No valid YouTube OAuth refresh token found in PostgreSQL database or process environment.');
}

async function main() {
  const jobId = parseJobIdArg();
  logger.info({ jobId }, 'Starting cloud production execution for job');

  // 1. Fetch job from database
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new Error(`Job with ID '${jobId}' not found in database.`);
  }

  // Update status to RUNNING
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'RUNNING', errorMessage: null, errorStack: null },
  });

  const payload = (job.payload || {}) as any;
  const topic: string = payload.topic || 'Autonomous Agent Workflows in Node.js';
  const scriptText: string = payload.script || 'Most developers build chatbots. But the future belongs to autonomous agents that act on their own.';
  const title: string = payload.title || `VEXA: ${topic}`;
  const description: string = payload.description || `Autonomous video generated by VEXA platform on topic: ${topic}`;
  const tags: string[] = payload.tags || ['AI', 'VEXA', 'Automation'];

  const tempDir = path.resolve(process.cwd(), 'temp_render');
  if (!fs.existsSync(tempDir)) {
    await fs.promises.mkdir(tempDir, { recursive: true });
  }

  const narrationWavPath = path.join(tempDir, `narration_${jobId}.wav`);
  const ambientMp3Path = path.join(tempDir, `ambient_${jobId}.mp3`);
  const outputMp4Path = path.join(tempDir, `output_${jobId}.mp4`);
  const concatTxtPath = path.join(tempDir, `concat_${jobId}.txt`);
  const downloadedVideoPaths: string[] = [];

  try {
    // 2. Synthesize speech narration
    const narrationDuration = await generateNarrationWav(scriptText, narrationWavPath);

    // 3. Fetch ambient sound and stock videos
    logger.info({ topic }, 'Querying stock video clips and ambient sound');
    const videoUrls = await searchStockVideos(topic);
    const ambientUrls = await searchCC0AmbientSound(topic);

    // Download or create ambient audio
    if (ambientUrls.length > 0) {
      try {
        await downloadFile(ambientUrls[0]!, ambientMp3Path);
      } catch (e) {
        logger.warn({ error: e }, 'Failed downloading ambient audio, creating silent fallback');
        await execAsync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${Math.ceil(narrationDuration)} ${ambientMp3Path}`);
      }
    } else {
      await execAsync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${Math.ceil(narrationDuration)} ${ambientMp3Path}`);
    }

    // Download or create stock video clips
    const clipPath = path.join(tempDir, `clip_0_${jobId}.mp4`);
    if (videoUrls.length > 0) {
      try {
        await downloadFile(videoUrls[0]!, clipPath);
        downloadedVideoPaths.push(clipPath);
      } catch (e) {
        logger.warn({ error: e }, 'Failed downloading stock video clip, creating color fallback video');
        await execAsync(`ffmpeg -f lavfi -i color=c=0x0f172a:s=1920x1080:r=30 -t ${Math.ceil(narrationDuration)} -pix_fmt yuv420p ${clipPath}`);
        downloadedVideoPaths.push(clipPath);
      }
    } else {
      await execAsync(`ffmpeg -f lavfi -i color=c=0x0f172a:s=1920x1080:r=30 -t ${Math.ceil(narrationDuration)} -pix_fmt yuv420p ${clipPath}`);
      downloadedVideoPaths.push(clipPath);
    }

    // Write concat file
    const concatContent = downloadedVideoPaths.map((p) => `file '${path.resolve(p)}'`).join('\n');
    await fs.promises.writeFile(concatTxtPath, concatContent);

    // Build timeline if not provided
    const timeline: CompositionTimeline = payload.timeline || {
      durationSeconds: Math.max(5, Math.ceil(narrationDuration)),
      layers: [
        {
          id: 'text_layer_1',
          type: 'text',
          start: 0,
          end: Math.max(5, Math.ceil(narrationDuration)),
          sourceUrl: scriptText,
        },
      ],
    };

    // 4. Compile and execute FFmpeg command
    logger.info('Compiling FFmpeg rendering pipeline');
    const { args } = FFmpegRenderer.compileFFmpegCommand(
      timeline,
      outputMp4Path,
      narrationWavPath,
      ambientMp3Path
    );

    // Replace default temp_visual_concat.txt path in args with our concatTxtPath
    const concatIdx = args.findIndex((a) => a === 'temp_visual_concat.txt');
    if (concatIdx !== -1) {
      args[concatIdx] = concatTxtPath;
    }

    const ffmpegCmd = `ffmpeg ${args.join(' ')}`;
    logger.info({ ffmpegCmd }, 'Executing FFmpeg process');
    const { stdout, stderr } = await execAsync(ffmpegCmd);
    logger.debug({ stdout, stderr }, 'FFmpeg process completed');

    if (!fs.existsSync(outputMp4Path) || (await fs.promises.stat(outputMp4Path)).size === 0) {
      throw new Error('FFmpeg execution completed but output MP4 file was not generated or is 0 bytes.');
    }

    logger.info({ outputMp4Path }, 'Video rendering successfully finished');

    // 5. Upload to YouTube
    logger.info('Retrieving YouTube authorization and publishing video...');
    const accessToken = await getYouTubeAccessToken();
    const publisher = new YouTubePublishingProvider(accessToken);
    const pubResult = await publisher.publishVideo(outputMp4Path, title, description, tags);

    logger.info({ publishUrl: pubResult.publishUrl }, 'Video successfully published to YouTube!');

    // 6. Update database record
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        result: {
          publishUrl: pubResult.publishUrl,
          platformVideoId: pubResult.platformVideoId,
          metadata: pubResult.metadata,
          completedAt: new Date().toISOString(),
        },
      },
    });

    logger.info({ jobId }, 'Job execution successfully completed');
  } finally {
    // 7. Cleanup local ephemeral files
    logger.info('Cleaning up ephemeral rendering files');
    const cleanupFiles = [
      outputMp4Path,
      narrationWavPath,
      ambientMp3Path,
      concatTxtPath,
      ...downloadedVideoPaths,
    ];
    for (const f of cleanupFiles) {
      if (fs.existsSync(f)) {
        await fs.promises.unlink(f).catch(() => {});
      }
    }
  }
}

main().catch(async (error: any) => {
  const jobId = process.argv.slice(2).join(' ');
  logger.error({ error, jobId }, 'Cloud production script failed');
  try {
    const parsedJobId = parseJobIdArg();
    await prisma.job.update({
      where: { id: parsedJobId },
      data: {
        status: 'FAILED',
        errorMessage: error?.message || String(error),
        errorStack: error?.stack,
      },
    });
  } catch {}
  process.exit(1);
});
