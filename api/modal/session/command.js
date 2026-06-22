import { forwardToModal } from '../../_lib/modalSessionProxy.js';

// POST /api/modal/session/:id/command  →  POST /session/:id/command on Modal.
// Host-authenticated: the Authorization: Bearer <host_token> header is forwarded
// by the shared proxy. Body is the JSON command {type, target_submission_id?}.
export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing session id', code: 'INVALID_REQUEST' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }
  return forwardToModal(req, res, {
    method: 'POST',
    subpath: `session/${encodeURIComponent(id)}/command`,
  });
}
