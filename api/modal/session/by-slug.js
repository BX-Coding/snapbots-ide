import { forwardToModal } from '../../_lib/modalSessionProxy.js';

// GET /api/modal/session/by-slug/:slug  →  GET /session/by-slug/:slug on Modal
export default async function handler(req, res) {
  const { slug } = req.query;
  if (!slug) {
    return res.status(400).json({ error: 'Missing slug', code: 'INVALID_REQUEST' });
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }
  return forwardToModal(req, res, {
    method: 'GET',
    subpath: `session/by-slug/${encodeURIComponent(slug)}`,
  });
}
