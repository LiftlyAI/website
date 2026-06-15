// Seeds the Coaches Network with demo coaches, a few coached athletes, and
// reviews so /coaches, profiles, and the leaderboard look alive immediately.
// Idempotent: coaches/athletes upsert by email, links/reviews by their keys.
// Run: `npm run db:seed-coaches` (after `npm run db:init`).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import postgres from 'postgres';

// Minimal .env.local loader (mirrors scripts/init-db.ts).
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .env.local first.');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, ssl: 'require', max: 1 });
const now = Date.now();

interface SeedCoach {
  email: string;
  name: string;
  username: string;
  featured?: boolean;
  profile: Record<string, unknown>;
  reviews: { rating: number; communication?: number; programming?: number; meetPrep?: number; responsiveness?: number; body: string }[];
}

const COACHES: SeedCoach[] = [
  {
    email: 'josh.bryant@example.com',
    name: 'Josh Bryant',
    username: 'josh-bryant',
    featured: true,
    profile: {
      tagline: 'National-level raw coach · 14 IPF qualifiers',
      bio: 'Two decades under the bar and behind the platform. I build raw lifters from their first meet to the national stage with conjugate-influenced blocks and ruthless meet-day strategy.',
      location: 'Austin, TX',
      specialties: ['meet-prep', 'raw', 'powerlifting', 'peaking'],
      federations: ['USAPL', 'IPF'],
      credentials: ['CSCS', 'Exercise Science Degree'],
      experienceYears: 18,
      online: true,
      inPerson: true,
      availability: 'accepting',
      responseTime: 'within 24h',
    },
    reviews: [
      { rating: 5, communication: 5, programming: 5, meetPrep: 5, responsiveness: 5, body: 'Took me from a 1300 to a 1500 total and a state record. The peak was dialed.' },
      { rating: 5, communication: 5, programming: 5, meetPrep: 4, responsiveness: 5, body: 'Clear weekly programming and fast video feedback. First meet went perfectly.' },
    ],
  },
  {
    email: 'mara.lopez@example.com',
    name: 'Mara Lopez',
    username: 'mara-lopez',
    featured: true,
    profile: {
      tagline: "Women's powerlifting specialist · 11 national qualifiers",
      bio: 'I coach women through every phase — first barbell to elite total. Evidence-based programming with a focus on long-term progression and confidence on the platform.',
      location: 'Denver, CO',
      specialties: ['womens', 'powerlifting', 'beginner', 'online'],
      federations: ['USAPL', 'USPA'],
      credentials: ['NASM CPT', 'USAW'],
      experienceYears: 9,
      online: true,
      inPerson: false,
      availability: 'accepting',
      responseTime: 'within 12h',
    },
    reviews: [
      { rating: 5, communication: 5, programming: 5, meetPrep: 5, responsiveness: 5, body: 'Best coach I have worked with. Hit a 20kg PR squat in one block.' },
    ],
  },
  {
    email: 'devon.carter@example.com',
    name: 'Devon Carter',
    username: 'devon-carter',
    profile: {
      tagline: 'Bench press specialist · equipped & raw',
      bio: 'The bench is a skill. I rebuild technique from the ground up and add real kilos with targeted overload and supramaximal work.',
      location: 'Columbus, OH',
      specialties: ['bench', 'equipped', 'powerlifting'],
      federations: ['WRPF', 'USPA'],
      credentials: ['CSCS'],
      experienceYears: 12,
      online: true,
      inPerson: true,
      availability: 'waitlist',
      responseTime: 'within 48h',
    },
    reviews: [
      { rating: 4, communication: 4, programming: 5, meetPrep: 4, responsiveness: 4, body: 'Bench went up 15kg in 4 months. Knows the equipped game inside out.' },
    ],
  },
  {
    email: 'priya.nair@example.com',
    name: 'Priya Nair',
    username: 'priya-nair',
    profile: {
      tagline: 'Powerbuilding & hypertrophy-led strength',
      bio: 'Get strong and look it. I blend powerbuilding with smart hypertrophy accessories so you bring up weak points without burning out.',
      location: 'Online',
      specialties: ['powerbuilding', 'hypertrophy', 'online'],
      federations: ['USAPL'],
      credentials: ['NASM CPT', 'Nutrition Coach'],
      experienceYears: 5,
      online: true,
      inPerson: false,
      availability: 'accepting',
      responseTime: 'within 24h',
    },
    reviews: [
      { rating: 5, communication: 5, programming: 4, meetPrep: 4, responsiveness: 5, body: 'Great accessory selection and check-ins. Strongest and leanest I have been.' },
    ],
  },
  {
    email: 'tomas.eriksson@example.com',
    name: 'Tomas Eriksson',
    username: 'tomas-eriksson',
    profile: {
      tagline: 'Teen & novice development coach',
      bio: 'Patient, technique-first coaching for teens and brand-new lifters. Safety, fundamentals, and a love of the sport that lasts.',
      location: 'Minneapolis, MN',
      specialties: ['teens', 'beginner', 'powerlifting'],
      federations: ['USAPL'],
      credentials: ['USAW', 'First Aid / CPR'],
      experienceYears: 7,
      online: true,
      inPerson: true,
      availability: 'accepting',
      responseTime: 'within 24h',
    },
    reviews: [],
  },
  {
    email: 'grace.okafor@example.com',
    name: 'Grace Okafor',
    username: 'grace-okafor',
    profile: {
      tagline: 'Elite meet-prep & peaking systems',
      bio: 'I specialize in the last 12 weeks. Attempt selection, openers, water/sodium, and timing — nothing left to chance on meet day.',
      location: 'Atlanta, GA',
      specialties: ['meet-prep', 'peaking', 'powerlifting', 'raw'],
      federations: ['IPF', 'USAPL'],
      credentials: ['CSCS', 'MS Exercise Physiology'],
      experienceYears: 14,
      online: true,
      inPerson: false,
      availability: 'full',
      responseTime: 'within 48h',
    },
    reviews: [
      { rating: 5, communication: 4, programming: 5, meetPrep: 5, responsiveness: 4, body: 'Went 9/9 at nationals. The attempt strategy was flawless.' },
      { rating: 4, communication: 4, programming: 4, meetPrep: 5, responsiveness: 4, body: 'Peaking knowledge is elite. Worth the waitlist.' },
    ],
  },
  {
    email: 'leo.martins@example.com',
    name: 'Leo Martins',
    username: 'leo-martins',
    profile: {
      tagline: 'Online raw strength · data-driven',
      bio: 'RPE and velocity-based programming with weekly data reviews. Great fit for self-motivated lifters who want a clear plan and accountability.',
      location: 'Online',
      specialties: ['raw', 'powerlifting', 'online'],
      federations: ['USPA', 'IPL'],
      credentials: ['NASM CPT'],
      experienceYears: 4,
      online: true,
      inPerson: false,
      availability: 'accepting',
      responseTime: 'within 24h',
    },
    reviews: [
      { rating: 4, communication: 5, programming: 4, meetPrep: 3, responsiveness: 5, body: 'Solid online coach, very responsive. Programming kept me progressing.' },
    ],
  },
];

// Strongest coaches start verified so the trust badges render in the demo.
const VERIFIED = new Set(['josh-bryant', 'mara-lopez', 'grace-okafor']);

async function upsertCoach(c: SeedCoach): Promise<string> {
  const id = crypto.randomUUID();
  const verified = VERIFIED.has(c.username);
  const rows = await sql<{ id: string }[]>`
    insert into coaches (id, email, name, username, profile_json, listed, featured, verified, verified_at, created_at)
    values (${id}, ${c.email}, ${c.name}, ${c.username}, ${JSON.stringify(c.profile)}, true,
            ${c.featured ?? false}, ${verified}, ${verified ? now : null}, ${now})
    on conflict (email) do update set
      name = excluded.name, username = excluded.username,
      profile_json = excluded.profile_json, listed = true, featured = excluded.featured,
      verified = excluded.verified, verified_at = excluded.verified_at
    returning id
  `;
  return rows[0].id;
}

// Per-coach content (services, a post, showcase, approved credentials). Cleared
// and reinserted each run so the seed stays idempotent.
async function seedContent(coachId: string, c: SeedCoach): Promise<void> {
  await sql`delete from coach_services where coach_id = ${coachId}`;
  await sql`delete from coach_posts where coach_id = ${coachId}`;
  await sql`delete from coach_showcase where coach_id = ${coachId}`;
  await sql`delete from coach_credentials where coach_id = ${coachId}`;

  const services = [
    { name: 'Online Coaching', description: 'Fully individualized weekly programming with video review.', price: 150, cadence: 'month', features: ['Weekly programming', 'Video form review', 'Meet prep'] },
    { name: 'Form Review', description: 'One detailed breakdown of a lift.', price: 50, cadence: 'one-time', features: ['Rep-by-rep analysis', 'Cue sheet'] },
  ];
  let i = 0;
  for (const s of services) {
    await sql`
      insert into coach_services (id, coach_id, name, description, price, cadence, features_json, sort_order, created_at)
      values (${crypto.randomUUID()}, ${coachId}, ${s.name}, ${s.description}, ${s.price}, ${s.cadence}, ${JSON.stringify(s.features)}, ${i++}, ${now})
    `;
  }

  await sql`
    insert into coach_posts (id, coach_id, title, body, created_at)
    values (${crypto.randomUUID()}, ${coachId}, ${`${c.name.split(' ')[0]}'s take: train the lift you're worst at`},
            ${'Most lifters avoid their weakest lift. Flip it — lead the week with it, fresh, and watch your total climb. Consistency over intensity.'}, ${now})
  `;

  const unit = (c.profile.specialties as string[] | undefined)?.includes('equipped') ? 'lbs' : 'kg';
  const result = { title: 'Big squat jump pre-nationals', athleteName: 'A. Reed', lift: 'Squat', beforeValue: 180, afterValue: 215, unit, timeframe: '14 weeks' };
  const athlete = { name: 'J. Vargas', weightClass: '83kg', bestSquat: 245, bestBench: 150, bestDeadlift: 280, unit, meetResult: '1st · USAPL' };
  await sql`
    insert into coach_showcase (id, coach_id, type, data_json, sort_order, created_at)
    values (${crypto.randomUUID()}, ${coachId}, 'result', ${JSON.stringify(result)}, 0, ${now}),
           (${crypto.randomUUID()}, ${coachId}, 'athlete', ${JSON.stringify(athlete)}, 1, ${now})
  `;

  const creds = (c.profile.credentials as string[] | undefined) ?? [];
  for (const title of creds) {
    await sql`
      insert into coach_credentials (id, coach_id, title, status, created_at, reviewed_at)
      values (${crypto.randomUUID()}, ${coachId}, ${title}, 'approved', ${now}, ${now})
    `;
  }
}

async function upsertAthlete(email: string, name: string): Promise<string> {
  const id = crypto.randomUUID();
  const rows = await sql<{ id: string }[]>`
    insert into athletes (id, email, name, created_at)
    values (${id}, ${email}, ${name}, ${now})
    on conflict (email) do update set name = excluded.name
    returning id
  `;
  return rows[0].id;
}

(async () => {
  try {
    let reviewerSeq = 0;
    const coachIds: string[] = [];
    const athleteIds: string[] = [];
    for (const c of COACHES) {
      const coachId = await upsertCoach(c);
      coachIds.push(coachId);
      await seedContent(coachId, c);
      for (const r of c.reviews) {
        reviewerSeq++;
        const email = `reviewer${reviewerSeq}@example.com`;
        const athleteId = await upsertAthlete(email, `Athlete ${reviewerSeq}`);
        athleteIds.push(athleteId);
        // Relationship so the review passes the verified-athlete gate.
        await sql`
          insert into coach_athletes (coach_id, athlete_id, status, created_at)
          values (${coachId}, ${athleteId}, 'active', ${now})
          on conflict (coach_id, athlete_id) do update set status = 'active'
        `;
        await sql`update athletes set coached_by = ${coachId} where id = ${athleteId}`;
        await sql`
          insert into coach_reviews
            (id, coach_id, athlete_id, rating, communication, programming, meet_prep, responsiveness, body, created_at)
          values (${crypto.randomUUID()}, ${coachId}, ${athleteId}, ${r.rating},
                  ${r.communication ?? null}, ${r.programming ?? null}, ${r.meetPrep ?? null},
                  ${r.responsiveness ?? null}, ${r.body}, ${now})
          on conflict (coach_id, athlete_id) do update set
            rating = excluded.rating, communication = excluded.communication,
            programming = excluded.programming, meet_prep = excluded.meet_prep,
            responsiveness = excluded.responsiveness, body = excluded.body
        `;
      }
    }

    // Follows: each seeded athlete follows the first three coaches, all stamped
    // recently so follower counts and the "Rising" rail are non-empty.
    let follows = 0;
    for (const athleteId of athleteIds) {
      for (const coachId of coachIds.slice(0, 3)) {
        await sql`
          insert into coach_follows (athlete_id, coach_id, created_at)
          values (${athleteId}, ${coachId}, ${now})
          on conflict (athlete_id, coach_id) do nothing
        `;
        follows++;
      }
    }

    console.log(`Seeded ${COACHES.length} coaches, ${reviewerSeq} reviews, ${follows} follows, services/posts/showcase/credentials.`);
    console.log('Coach logins (passwordless, /coach/login):');
    for (const c of COACHES) console.log(`  ${c.email}  →  /coach/${c.username}`);
    console.log('Make yourself admin: set ADMIN_EMAILS=<a coach email> in .env.local, then visit /admin.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
})();
