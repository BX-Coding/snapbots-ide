import { forwardToModal } from '../../_lib/modalSessionProxy.js';

// POST /api/modal/session  →  POST /session on Modal (create a new session)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }
  return forwardToModal(req, res, { method: 'POST', subpath: 'session' });
}
