import { forwardToModal } from '../../../_lib/modalSessionProxy.js';

// Phones POST multipart/form-data here (image + submitter_name). We stream the raw
// body straight through to Modal so we don't base64-inflate a 2-8 MB phone JPEG by 33%.
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    subpath: `session/${encodeURIComponent(id)}/submit`,
    passThroughRawBody: true,
  });
}
