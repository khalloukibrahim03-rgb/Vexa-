import React, { useState, useEffect } from 'react';
import { synthesizeSpeech } from './services/ttsService.js';
import { searchStockVideos } from './services/pexelsService.js';
import { searchCC0AmbientSound } from './services/freesoundService.js';
import { renderVideoInBrowser, ClientRenderResult } from './services/ffmpegRenderer.js';

export interface CloudJobState {
  jobId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string;
  actionsRunUrl: string;
  publishUrl?: string;
  errorMessage?: string;
  payloadTopic?: string;
}

export function App() {
  const [topic, setTopic] = useState('Autonomous Agent Workflows in Node.js');
  const [cloudTopic, setCloudTopic] = useState('Autonomous Agent Workflows in Node.js');
  const [status, setStatus] = useState<string>('Idle');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [renderOutput, setRenderOutput] = useState<ClientRenderResult | null>(null);

  // Cloud Production state
  const [isCloudProcessing, setIsCloudProcessing] = useState<boolean>(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<string>('Idle');
  const [currentJob, setCurrentJob] = useState<CloudJobState | null>(null);

  // Poll active cloud production job status
  useEffect(() => {
    if (!currentJob?.jobId || ['COMPLETED', 'FAILED'].includes(currentJob.status)) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/jobs/${currentJob.jobId}`);
        if (!res.ok) return;

        const data = await res.json();
        const updatedStatus = data.status;
        const publishUrl = data.result?.publishUrl;
        const errorMessage = data.errorMessage;

        setCurrentJob((prev) =>
          prev
            ? {
                ...prev,
                status: updatedStatus,
                publishUrl: publishUrl || prev.publishUrl,
                errorMessage: errorMessage || prev.errorMessage,
              }
            : null
        );

        if (updatedStatus === 'COMPLETED') {
          setIsCloudProcessing(false);
          setCloudStatusMsg('Success! Video successfully produced in cloud and published to YouTube.');
        } else if (updatedStatus === 'FAILED') {
          setIsCloudProcessing(false);
          setCloudStatusMsg(`Error: Production failed (${errorMessage || 'Unknown error'})`);
        } else {
          setCloudStatusMsg(`Status: ${updatedStatus} — Executing rendering pipeline in GitHub Actions...`);
        }
      } catch (err) {
        console.error('Error polling job status:', err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [currentJob?.jobId, currentJob?.status]);

  const handleStartCloudProduction = async () => {
    setIsCloudProcessing(true);
    setCloudStatusMsg('Initiating cloud production job and dispatching GitHub Actions runner...');

    try {
      const response = await fetch('/api/v1/jobs/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: cloudTopic }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.details || errJson.error || 'Failed to dispatch cloud production job');
      }

      const data = await response.json();
      setCurrentJob({
        jobId: data.jobId,
        status: data.status,
        actionsRunUrl: data.actionsRunUrl,
        payloadTopic: data.payload?.topic || cloudTopic,
      });

      setCloudStatusMsg(`Job ${data.jobId} created (${data.status}). GitHub Actions runner dispatched.`);
    } catch (error: any) {
      console.error('Cloud production trigger error:', error);
      setCloudStatusMsg(`Error: ${error?.message || String(error)}`);
      setIsCloudProcessing(false);
    }
  };

  const handleStartManualGeneration = async () => {
    setIsProcessing(true);
    setStatus('1/4 Synthesizing speech narration via Xenova MMS-TTS...');
    try {
      const scriptText = "Most developers build chatbots. But the future belongs to autonomous agents that act on their own.";
      const ttsResult = await synthesizeSpeech(scriptText);

      setStatus('2/4 Querying Pexels HD video stock clips...');
      const videoClips = await searchStockVideos('technology nodejs code');
      const clipUrl = videoClips[0] || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

      setStatus('3/4 Querying CC0 ambient natural atmosphere...');
      const ambientSounds = await searchCC0AmbientSound('gentle atmosphere nature');
      const ambientUrl = ambientSounds[0] || 'https://cdn.freesound.org/previews/512/512132_6253486-lq.mp3';

      setStatus('4/4 Transcoding MP4 in FFmpeg.wasm browser engine (Ken Burns, ducking, subtitles)...');
      const renderResult = await renderVideoInBrowser([
        {
          videoUrl: clipUrl,
          narrationAudioBlob: ttsResult.audioBlob,
          ambientAudioUrl: ambientUrl,
          subtitlesText: scriptText,
          durationSeconds: ttsResult.durationSeconds,
        },
      ]);

      setRenderOutput(renderResult);
      setStatus('Success: MP4 rendered cleanly in browser memory!');
    } catch (error: any) {
      console.error('Generation error:', error);
      setStatus(`Error: ${error?.message || String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', padding: '2rem' }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#38bdf8' }}>VEXA — Control Plane</h1>
        <p style={{ margin: '0.5rem 0 0', color: '#94a3b8' }}>Cloud FFmpeg Production Pipeline & Real YouTube Publishing</p>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Cloud Production Trigger Section */}
        <section style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #0284c7' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.3rem', color: '#38bdf8' }}>🚀 Cloud Production via GitHub Actions</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
            Triggers unattended real FFmpeg rendering on GitHub Actions Linux runner and publishes directly to YouTube.
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Topic (Leave empty for dynamic AI selection)"
              value={cloudTopic}
              onChange={(e) => setCloudTopic(e.target.value)}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
            />
            <button
              onClick={handleStartCloudProduction}
              disabled={isCloudProcessing}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isCloudProcessing ? '#475569' : '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isCloudProcessing ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isCloudProcessing ? 'Producing in Cloud...' : 'Produce via Cloud'}
            </button>
          </div>

          <div style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '4px', borderLeft: '4px solid #38bdf8', marginBottom: '1rem' }}>
            <strong>Cloud Status:</strong> {cloudStatusMsg}
          </div>

          {currentJob && (
            <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <p style={{ margin: '0 0 0.5rem' }}><strong>Job ID:</strong> <code>{currentJob.jobId}</code> | <strong>Status:</strong> <span style={{ color: currentJob.status === 'COMPLETED' ? '#4ade80' : currentJob.status === 'FAILED' ? '#f87171' : '#facc15' }}>{currentJob.status}</span></p>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                <a
                  href={currentJob.actionsRunUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: '#334155', color: '#38bdf8', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}
                >
                  View GitHub Actions Workflow ↗
                </a>

                {currentJob.publishUrl && (
                  <a
                    href={currentJob.publishUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: '#16a34a', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}
                  >
                    Watch Published YouTube Video ↗
                  </a>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Local WASM Browser Preview Section */}
        <section style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#94a3b8' }}>In-Browser Local WASM Preview (Optional)</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
            />
            <button
              onClick={handleStartManualGeneration}
              disabled={isProcessing}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isProcessing ? 'Processing...' : 'Generate Local WASM Preview'}
            </button>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '4px', borderLeft: '4px solid #94a3b8' }}>
            <strong>Preview Status:</strong> {status}
          </div>
        </section>

        {renderOutput && (
          <section style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#4ade80' }}>Rendered MP4 Preview (In-Browser Blob Memory)</h2>
            <p><strong>Duration:</strong> {renderOutput.durationSeconds}s | <strong>Byte Size:</strong> {(renderOutput.byteSize / 1024 / 1024).toFixed(2)} MB</p>
            <video src={renderOutput.videoUrl} controls style={{ width: '100%', borderRadius: '4px', marginBottom: '1rem' }} />
            <a
              href={renderOutput.videoUrl}
              download="vexa_generated_video.mp4"
              style={{ display: 'inline-block', padding: '0.75rem 1.25rem', backgroundColor: '#16a34a', color: '#fff', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}
            >
              Download MP4
            </a>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
