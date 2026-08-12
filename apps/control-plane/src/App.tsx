import React, { useState } from 'react';

// Decoupled types for rendering
export interface MockDecision {
  id: string;
  topic: string;
  outcome: 'PRODUCE' | 'RESEARCH_MORE' | 'DO_NOTHING' | 'PAUSE_FOR_HUMAN';
  confidence: number;
  expectedOutcome: string;
}

export interface MockJob {
  id: string;
  name: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';
  idempotencyKey: string;
}

export function App() {
  const [mode, setMode] = useState<'MANUAL' | 'AUTONOMOUS'>('MANUAL');

  const mockDecisions: MockDecision[] = [
    {
      id: 'dec-1',
      topic: 'Autonomous Agent Workflows in Node.js',
      outcome: 'PRODUCE',
      confidence: 0.95,
      expectedOutcome: 'Create structured content outline and script layouts',
    },
    {
      id: 'dec-2',
      topic: 'How to build $0 Staging Environments',
      outcome: 'RESEARCH_MORE',
      confidence: 0.88,
      expectedOutcome: 'Scrape additional Reddit trends or star indices',
    }
  ];

  const mockJobs: MockJob[] = [
    { id: 'job-1', name: 'ScriptJob', status: 'COMPLETED', idempotencyKey: 'idem-script-1' },
    { id: 'job-2', name: 'RenderJob', status: 'RUNNING', idempotencyKey: 'idem-render-1' },
    { id: 'job-3', name: 'PublishingJob', status: 'DEAD_LETTER', idempotencyKey: 'idem-pub-1' }
  ];

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', padding: '24px' }}>
      {/* Header Panel */}
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#38bdf8' }}>VEXA Control Center</h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>Autonomous AI Content Production Loop</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>Brain Mode:</span>
          <button
            onClick={() => setMode(mode === 'MANUAL' ? 'AUTONOMOUS' : 'MANUAL')}
            style={{
              backgroundColor: mode === 'AUTONOMOUS' ? '#22c55e' : '#f59e0b',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {mode}
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Left Grid Column: Decisions and Memories */}
        <section style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>Brain Decisions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mockDecisions.map((dec) => (
              <div key={dec.id} style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '16px' }}>{dec.topic}</strong>
                  <span style={{
                    backgroundColor: dec.outcome === 'PRODUCE' ? '#15803d' : '#1d4ed8',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>{dec.outcome}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                  <p style={{ margin: '4px 0' }}>Confidence: <strong>{(dec.confidence * 100).toFixed(0)}%</strong></p>
                  <p style={{ margin: '4px 0' }}>Expected outcome: {dec.expectedOutcome}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Grid Column: Jobs, Queues and Approvals */}
        <section style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>Worker Queue & Jobs Monitor</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mockJobs.map((job) => (
              <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '12px 16px', borderRadius: '8px', border: '1px solid #475569' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>{job.name}</span>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Idempotence: {job.idempotencyKey}</div>
                </div>
                <div>
                  <span style={{
                    backgroundColor: job.status === 'COMPLETED' ? '#15803d' : job.status === 'RUNNING' ? '#ca8a04' : '#b91c1c',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>{job.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Reject Batch</button>
            <button style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Approve & Publish</button>
          </div>
        </section>

      </div>
    </div>
  );
}
export default App;
