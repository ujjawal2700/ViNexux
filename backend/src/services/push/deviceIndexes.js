import { PushDevice } from '../../models/PushDevice.js';

let ready;
// Older releases indexed a raw `token` field. The current model stores only a
// token hash as _id; a unique index on the absent field rejects the second
// browser with a duplicate null key. Retire only that exact obsolete index.
export async function ensurePushDeviceIndexes() {
  if (!ready) ready = (async () => {
    await PushDevice.init();
    let indexes;
    try { indexes = await PushDevice.collection.indexes(); }
    catch (error) { if (error.code === 26) return; throw error; }
    for (const index of indexes) {
      if (index.unique && Object.keys(index.key).length === 1 && index.key.token === 1) {
        try { await PushDevice.collection.dropIndex(index.name); }
        catch (error) { if (error.code !== 27) throw error; }
      }
    }
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}
