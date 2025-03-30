const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const hashedPassword = await bcrypt.hash('test123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
    },
  });

  // Create some test tracks
  const tracks = await Promise.all([
    prisma.track.upsert({
      where: { beatportId: 'test-track-1' },
      update: {},
      create: {
        title: 'Test Track 1',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 180,
        bpm: 128,
        key: 'Am',
        genre: 'House',
        beatportId: 'test-track-1',
      },
    }),
    prisma.track.upsert({
      where: { beatportId: 'test-track-2' },
      update: {},
      create: {
        title: 'Test Track 2',
        artist: 'Another Artist',
        album: 'Another Album',
        duration: 200,
        bpm: 140,
        key: 'Fm',
        genre: 'Techno',
        beatportId: 'test-track-2',
      },
    }),
  ]);

  // Create a test playlist
  const playlist = await prisma.playlist.create({
    data: {
      name: 'Test Playlist',
      description: 'A playlist for testing',
      userId: user.id,
      tracks: {
        connect: tracks.map(track => ({ id: track.id })),
      },
    },
  });

  console.log({ user, tracks, playlist });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
