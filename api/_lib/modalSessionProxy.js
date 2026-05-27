// Shared forwarder for the multi-device session endpoints. Mirrors the JSON-only
// pattern in api/modal/{simulation,hybrid,soccer}.js but with two additions:
//   1. forwards multipart bodies too (raw passthrough; bodyParser off when needed),
//   2. supports arbitrary subpaths under the Modal session base URL.

const TIMEOUT_MS = 60_000;

export function getSessionBaseUrl() {
  const ep = process.env.SNAPBOT_SESSION_MODAL_ENDPOINT;
  if (!ep) return null;
  return ep.endsWith('/') ? ep : ep + '/';
}

/**
 * Forward an incoming request to the Modal session endpoint.
 *
 * @param {object} req         Vercel/Node IncomingMessage
 * @param {object} res         Vercel/Node ServerResponse
 * @param {object} options
 * @param {string} options.method    HTTP method to use on Modal
 * @param {string} options.subpath   path appended after the base, e.g. "session/482917/submit"
 * @param {boolean} [options.passThroughRawBody]  true for multipart; false uses req.body as JSON
 * @param {boolean} [options.noBody]  true to send no body at all (e.g. /end takes only Authorization)
 */
export async function forwardToModal(req, res, { method, subpath, passThroughRawBody = false, noBody = false }) {
  const base = getSessionBaseUrl();
  if (!base) {
    return res.status(500).json({
      error: 'Session endpoint not configured',
      code: 'NOT_CONFIGURED',
      details: 'Missing SNAPBOT_SESSION_MODAL_ENDPOINT environment variable',
    });
  }
  const url = `${base}${subpath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Forward Authorization for any method — the backend uses Bearer host_token on
  // privileged endpoints (e.g. /end). Without this, Vercel's serverless function
  // doesn't propagate the header by default since our init.headers below would
  // overwrite it.
  const authHeader = req.headers['authorization'];

  try {
    let init;
    if (method === 'GET') {
      const headers = {};
      if (authHeader) headers['Authorization'] = authHeader;
      init = { method: 'GET', headers, signal: controller.signal };
    } else if (noBody) {
      const headers = {};
      if (authHeader) headers['Authorization'] = authHeader;
      init = { method, headers, signal: controller.signal };
    } else if (passThroughRawBody) {
      // Buffer the request body into a Buffer and forward it. Byte-perfect copy of
      // whatever the browser sent. Content-Type (including the multipart boundary)
      // is passed through verbatim — never set it manually without the boundary or
      // Starlette will fail to parse the parts. fetch will derive Content-Length from
      // the Buffer so we don't need to forward the header.
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'binary') : chunk);
      }
      const body = Buffer.concat(chunks);
      const contentType = req.headers['content-type'];
      console.log(`[session proxy] forwarding multipart: ${body.length} bytes, Content-Type=${contentType}`);
      // Sanity-check that the boundary in Content-Type appears in the body. If it
      // doesn't, something stripped it before we got here.
      const boundaryMatch = contentType && contentType.match(/boundary=([^;]+)/);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1].replace(/^"|"$/g, '');
        const found = body.includes(Buffer.from('--' + boundary));
        console.log(`[session proxy] boundary "${boundary}" present in body: ${found}`);
      }
      const headers = {};
      if (contentType) headers['Content-Type'] = contentType;
      if (authHeader) headers['Authorization'] = authHeader;
      init = {
        method,
        headers,
        body,
        signal: controller.signal,
      };
    } else {
      const headers = { 'Content-Type': 'application/json' };
      if (authHeader) headers['Authorization'] = authHeader;
      init = {
        method,
        headers,
        body: JSON.stringify(req.body || {}),
        signal: controller.signal,
      };
    }

    const modalResponse = await fetch(url, init);
    clearTimeout(timeoutId);

    const contentType = modalResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await modalResponse.json();
      return res.status(modalResponse.status).json(data);
    }
    const text = await modalResponse.text();
    return res.status(modalResponse.status).send(text);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request to Modal session endpoint timed out',
        code: 'UPSTREAM_TIMEOUT',
      });
    }
    console.error(`Modal session proxy error (${method} ${subpath}):`, err);
    return res.status(502).json({
      error: 'Failed to reach Modal session endpoint',
      code: 'UPSTREAM_ERROR',
      details: err.message,
    });
  }
}
