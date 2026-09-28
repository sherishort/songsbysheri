// The owner's secret key. Only its hash lives here, so the public
// repository never reveals it.
import { createHash, timingSafeEqual } from 'node:crypto';

const KEY_HASH = Buffer.from('769596d932f1a0979c90261549a0bd780fb900933265d555f497de6a7604766c', 'hex');

export const isOwner = (req) => {
  const key = req.headers.get('x-stats-key');
  if (typeof key !== 'string' || !key) return false;
  return timingSafeEqual(createHash('sha256').update(key).digest(), KEY_HASH);
};
