import { embedText } from '../lib/embeddings';

(async () => {
  const vec = await embedText('Software engineer with Python and ML experience');
  console.log('vector length →', vec.length);          // should log 1536
  console.log('first 5 dims →', [...vec.slice(0, 5)]);
})();
