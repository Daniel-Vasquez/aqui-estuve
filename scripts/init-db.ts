import { client, db } from '../src/lib/db';

async function main() {
  const photos = db.collection('photos');
  await photos.createIndexes([
    { key: { createdAt: -1, _id: -1 }, name: 'createdAt_desc' },
    { key: { slug: 1 }, name: 'slug_unique', unique: true },
    { key: { publicId: 1 }, name: 'publicId_unique', unique: true },
    { key: { tags: 1 }, name: 'tags' },
    { key: { hashtags: 1 }, name: 'hashtags' },
  ]);
  // (Tanda 5 añade aquí los índices de `likes`)
  console.log('✔ Índices creados');
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => client.close());
