'use client';

import { useEffect, useRef, useState } from 'react';

export default function TemplateEditor({ product }) {
  const frame = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function receive(event) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'lobola-editor-ready') {
        frame.current.contentWindow.postMessage({
          type: 'lobola-load-template',
          slug: product.slug,
          title: product.title,
          canvasFormat: product.canvasFormat || product.design_json?.canvasFormat || 'standard',
          design: product.design_json
        }, window.location.origin);
      }
      if (event.data?.type === 'lobola-template-loaded') setReady(true);
      if (event.data?.type === 'lobola-editor-error') setError(event.data.message);
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [product]);

  function openEditor() {
    frame.current?.contentWindow?.postMessage({ type: 'lobola-open-editor' }, window.location.origin);
  }

  return (
    <div>
      <button className="button editor-launch" type="button" onClick={openEditor} disabled={!ready}>
        {ready ? 'Edit this invitation' : 'Loading editor…'}
      </button>
      {error && <p className="message error">{error}</p>}
      <div className="template-frame-wrap">
        <iframe
          className="template-frame"
          ref={frame}
          src="/invitation-editor.html?mode=public"
          title={`${product.title} invitation editor`}
          onLoad={() => {
            setReady(false);
            frame.current?.contentWindow?.postMessage({ type: 'lobola-parent-ready' }, window.location.origin);
          }}
        />
      </div>
    </div>
  );
}
