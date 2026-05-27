import { forwardToModal } from '../../../../_lib/modalSessionProxy.js';

export default async function handler(req, res) {
  const { id, subId } = req.query;
  if (!id || !subId) {
    return res.status(400).json({ error: 'Missing session or submission id', code: 'INVALID_REQUEST' });
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }
  return forwardToModal(req, res, {
    method: 'GET',
    subpath: `session/${encodeURIComponent(id)}/submission/${encodeURIComponent(subId)}`,
  });
}
