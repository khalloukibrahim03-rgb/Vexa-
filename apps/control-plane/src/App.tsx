import React, { useState } from 'react';
import { synthesizeSpeech } from './services/ttsService';
import { searchStockVideos } from './services/pexelsService';
import { searchCC0AmbientSound } from './services/freesoundService';
import { renderVideoInBrowser, ClientRenderResult } from './services/ffmpegRenderer';

export function App() {
  const [topic, setTopic] = useState('Autonomous Agent Workflows in Node.js');
  const [status, setStatus] = useState<string>('Idle');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [renderOutput, setRenderOutput] = useState<ClientRenderResult | null>(null);

  const handleStartManualGeneration = async () => {
    setIsProcessing(true);
    setStatus('1/4 Synthesizing speech narration via Xenova MMS-TTS...');
    try {
      // 1. Synthesize Speech
      const scriptText = "Most developers build chatbots. But the future belongs to autonomous agents that act on their own.";
      const ttsResult = await synthesizeSpeech(scriptText);

      // 2. Fetch Pexels Stock Clip
      setStatus('2/4 Querying Pexels HD video stock clips...');
      const videoClips = await searchStockVideos('technology nodejs code');
      const clipUrl = videoClips[0] || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

      // 3. Fetch CC0 Freesound Ambient Sound
      setStatus('3/4 Querying CC0 ambient natural atmosphere...');
      const ambientSounds = await searchCC0AmbientSound('gentle atmosphere nature');
      const ambientUrl = ambientSounds[0] || 'https://cdn.freesound.org/previews/512/512132_6253486-lq.mp3';

      // 4. Render MP4 in FFmpeg WASM Browser Engine
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
        <p style={{ margin: '0.5rem 0 0', color: '#94a3b8' }}>Client-Side Browser Media Pipeline & YouTube Publishing</p>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto' }}>
        <section style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>In-Browser Manual Production [MANUAL_TRIGGER]</h2>
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
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isProcessing ? 'Processing...' : 'Generate Video (Client WASM)'}
            </button>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '4px', borderLeft: '4px solid #38bdf8' }}>
            <strong>Status:</strong> {status}
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
