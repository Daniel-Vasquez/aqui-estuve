import { client, db } from '../src/lib/db';

// Recalcula likesCount de cada foto a partir de la colección `likes`.
async function main() {
  const counts = await db
    .collection('likes')
    .aggregate<{ _id: unknown; n: number }>([{ $group: { _id: '$photoId', n: { $sum: 1 } } }])
    .toArray();
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));

  const photos = await db.collection('photos').find({}, { projection: { likesCount: 1 } }).toArray();
  let fixed = 0;
  for (const p of photos) {
    const real = byId.get(String(p._id)) ?? 0;
    if (p.likesCount !== real) {
      await db.collection('photos').updateOne({ _id: p._id }, { $set: { likesCount: real } });
      fixed++;
    }
  }
  console.log(`✔ ${photos.length} fotos revisadas, ${fixed} corregidas`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => client.close());
