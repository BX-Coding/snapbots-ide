import { forwardToModal } from '../../_lib/modalSessionProxy.js';

// POST /api/modal/session/:id/command/:cmdId/ack  →  same on Modal.
// Host-authenticated (Bearer host_token); no body — marks the command consumed.
export default async function handler(req, res) {
  const { id, cmdId } = req.query;
  if (!id || !cmdId) {
    return res.status(400).json({ error: 'Missing session or command id', code: 'INVALID_REQUEST' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }
  return forwardToModal(req, res, {
    method: 'POST',
    subpath: `session/${encodeURIComponent(id)}/command/${encodeURIComponent(cmdId)}/ack`,
    noBody: true,
  });
}
