// The owner's secret key. Only its hash lives here, so the public
// repository never reveals it.
import { createHash, timingSafeEqual } from 'node:crypto';

const KEY_HASH = Buffer.from('c4a9bb9ae89f6cec7fcd5a109df17cb6031afc71664107a8a6c60f08b2e36bd2', 'hex');

export const isOwner = (req) => {
  const key = req.headers.get('x-stats-key');
  if (typeof key !== 'string' || !key) return false;
  return timingSafeEqual(createHash('sha256').update(key).digest(), KEY_HASH);
};
