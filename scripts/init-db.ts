import { client, db } from '../src/lib/db';

async function main() {
  const photos = db.collection('photos');
  await photos.createIndexes([
    { key: { createdAt: -1, _id: -1 }, name: 'createdAt_desc' },
    { key: { slug: 1 }, name: 'slug_unique', unique: true },
    { key: { publicId: 1 }, name: 'publicId_unique', unique: true },
    { key: { tags: 1 }, name: 'tags' },
    { key: { hashtags: 1 }, name: 'hashtags' },
    { key: { categories: 1, createdAt: -1, _id: -1 }, name: 'categories_createdAt' },
    { key: { category: 1, createdAt: -1, _id: -1 }, name: 'category_createdAt' },   // formato antiguo
    { key: { device: 1, createdAt: -1, _id: -1 }, name: 'device_createdAt' },
  ]);
  await db.collection('categories').createIndexes([
    { key: { key: 1 }, name: 'key_unique', unique: true },
  ]);
  const likes = db.collection('likes');
  await likes.createIndexes([
    { key: { photoId: 1, ipHash: 1 }, name: 'photo_ip_unique', unique: true },
    { key: { ipHash: 1 }, name: 'ipHash' },
  ]);
  console.log('✔ Índices creados');
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => client.close());
