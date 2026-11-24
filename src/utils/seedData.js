'use strict';

/**
 * Sample data for the Campus Lost and Found Portal.
 * Used by `npm run seed` and (when SEED_ON_START=true) on first boot, so the UI is
 * never empty: 4 accounts, 12 listings (mixed lost/found) and 3 claims.
 */
const bcrypt = require('bcryptjs');
const { users, items, claims } = require('../store');
const { idOf } = require('./serialize');

const DEMO_ACCOUNTS = [
  {
    username: 'admin',
    email: 'admin@campus.edu',
    password: 'Admin@123',
    fullName: 'Portal Administrator',
    role: 'admin',
  },
  {
    username: 'belum.vishal',
    email: 'belumvishalreddy7@gmail.com',
    password: 'Student@123',
    fullName: 'Belum Vishal Reddy',
    role: 'user',
  },
  {
    username: 'priya.sharma',
    email: 'priya.sharma@campus.edu',
    password: 'Student@123',
    fullName: 'Priya Sharma',
    role: 'user',
  },
  {
    username: 'arjun.rao',
    email: 'arjun.rao@campus.edu',
    password: 'Student@123',
    fullName: 'Arjun Rao',
    role: 'user',
  },
];

const SAMPLE_ITEMS = [
  {
    owner: 'belum.vishal',
    title: 'Black Leather Wallet with Student ID',
    description:
      'Black bi-fold wallet containing my student ID card, two bank cards and about 300 rupees in cash. Lost somewhere between the Finance Building corridor and the cafeteria.',
    category: 'Wallet & Cards',
    location: 'Cafeteria / Food Court',
    date: '2026-11-01',
    type: 'lost',
    status: 'open',
  },
  {
    owner: 'priya.sharma',
    title: 'Set of Three Brass Keys with Blue Keychain',
    description:
      'Found a bunch of three brass keys on a blue plastic keychain near the library issue counter. Handed one key to the librarian, the rest are with me.',
    category: 'Keys',
    location: 'Central Library',
    date: '2026-11-02',
    type: 'found',
    status: 'open',
  },
  {
    owner: 'arjun.rao',
    title: 'Silver Dell Laptop Charger 65W',
    description:
      'Left my Dell 65W charger plugged into the socket in Computer Science Lab 2 after the DBMS practical. It has a small white sticker with the initials AR.',
    category: 'Electronics',
    location: 'Computer Science Lab',
    date: '2026-11-03',
    type: 'lost',
    status: 'open',
  },
  {
    owner: 'belum.vishal',
    title: 'Found: Wireless Earbuds in a Grey Case',
    description:
      'Found a grey charging case with white wireless earbuds on the second row bench of the auditorium after the technical symposium. Serial number available on request.',
    category: 'Electronics',
    location: 'Auditorium',
    date: '2026-11-03',
    type: 'found',
    status: 'claimed',
  },
  {
    owner: 'priya.sharma',
    title: 'Blue Nike Water Bottle',
    description:
      'Lost my dark blue Nike 750 ml water bottle during the inter-department basketball practice. It has a small dent near the base and a name sticker.',
    category: 'Sports Equipment',
    location: 'Sports Complex',
    date: '2026-11-04',
    type: 'lost',
    status: 'returned',
  },
  {
    owner: 'arjun.rao',
    title: 'Found: Data Structures Textbook (Cormen)',
    description:
      'A copy of Introduction to Algorithms left behind on the third floor reading table of the library. Name written on the inside cover, collected and kept at the issue desk.',
    category: 'Books & Stationery',
    location: 'Central Library',
    date: '2026-11-04',
    type: 'found',
    status: 'open',
  },
  {
    owner: 'belum.vishal',
    title: 'College ID Card - Roll No 23BCE1042',
    description:
      'Lost my college identity card somewhere near the Administration Building while collecting my bonafide certificate. Roll number 23BCE1042, B.Tech CSE third year.',
    category: 'ID Card & Documents',
    location: 'Administration Building',
    date: '2026-11-05',
    type: 'lost',
    status: 'open',
  },
  {
    owner: 'priya.sharma',
    title: 'Found: Red Canvas Backpack',
    description:
      'Red Wildcraft backpack found on the bus bay bench after the 5:30 pm shuttle left. Contains notebooks and a geometry box. Kept safely in Hostel Block A warden office.',
    category: 'Bags & Luggage',
    location: 'Bus Bay / Parking',
    date: '2026-11-05',
    type: 'found',
    status: 'open',
  },
  {
    owner: 'arjun.rao',
    title: 'Prescription Spectacles in Brown Case',
    description:
      'Lost my rimless spectacles in a brown hard case during the workshop session. The frame is thin metal and the lenses are slightly tinted.',
    category: 'Clothing & Accessories',
    location: 'Engineering Workshop',
    date: '2026-11-06',
    type: 'lost',
    status: 'open',
  },
  {
    owner: 'belum.vishal',
    title: 'Found: Silver Anklet near Hostel Gate',
    description:
      'Found a single silver anklet with small bells on the walkway outside Hostel Block B gate in the evening. Please describe it accurately to claim.',
    category: 'Jewellery',
    location: 'Hostel Block B',
    date: '2026-11-07',
    type: 'found',
    status: 'open',
  },
  {
    owner: 'priya.sharma',
    title: 'Casio FX-991 Calculator',
    description:
      'Lost my Casio FX-991ES Plus scientific calculator in Academic Block A, second floor classroom. The back cover has my roll number written in marker.',
    category: 'Electronics',
    location: 'Academic Block A',
    date: '2026-11-07',
    type: 'lost',
    status: 'open',
  },
  {
    owner: 'arjun.rao',
    title: 'Found: Grey Hoodie with Hostel Laundry Tag',
    description:
      'A grey XL hoodie with a hostel laundry tag was left in the Academic Block B seminar hall after the coding club meet. Kept with the security desk.',
    category: 'Clothing & Accessories',
    location: 'Academic Block B',
    date: '2026-11-08',
    type: 'found',
    status: 'open',
  },
];

const SAMPLE_CLAIMS = [
  {
    itemTitle: 'Found: Wireless Earbuds in a Grey Case',
    claimer: 'arjun.rao',
    message: 'These look like mine - I lost white earbuds in a grey case at the symposium. The case has a scratch on the hinge.',
    status: 'approved',
  },
  {
    itemTitle: 'Found: Data Structures Textbook (Cormen)',
    claimer: 'belum.vishal',
    message: 'The book is mine, my name is written on the inside cover. Can I collect it from the issue desk?',
    status: 'pending',
  },
  {
    itemTitle: 'Found: Red Canvas Backpack',
    claimer: 'arjun.rao',
    message: 'I think this is my roommate\'s bag. He reported it lost on the same day.',
    status: 'rejected',
  },
];

async function createUsers() {
  const created = new Map();
  for (const account of DEMO_ACCOUNTS) {
    const existing = await users.findOne({ email: account.email });
    if (existing) {
      created.set(account.username, existing);
      continue;
    }
    const passwordHash = await bcrypt.hash(account.password, 10);
    const user = await users.create({
      username: account.username,
      email: account.email,
      fullName: account.fullName,
      passwordHash,
      role: account.role,
    });
    created.set(account.username, user);
  }
  return created;
}

/**
 * Insert sample data.
 * @param {{onlyIfEmpty?: boolean, reset?: boolean}} options
 */
async function seedDatabase({ onlyIfEmpty = false, reset = false } = {}) {
  const store = require('../store');
  if (reset && typeof store.reset === 'function') store.reset();

  if (onlyIfEmpty) {
    const existing = await items.count({});
    if (existing > 0) return { seeded: false, items: existing, users: 0, claims: 0 };
  }

  const userMap = await createUsers();
  const itemMap = new Map();

  for (const sample of SAMPLE_ITEMS) {
    const owner = userMap.get(sample.owner);
    const item = await items.create({
      title: sample.title,
      description: sample.description,
      category: sample.category,
      location: sample.location,
      date: new Date(`${sample.date}T10:00:00.000Z`),
      type: sample.type,
      imageUrl: null,
      postedBy: idOf(owner),
      status: sample.status,
      resolvedAt: sample.status === 'returned' ? new Date('2026-11-08T12:00:00.000Z') : null,
    });
    itemMap.set(sample.title, item);
  }

  let claimCount = 0;
  for (const sample of SAMPLE_CLAIMS) {
    const item = itemMap.get(sample.itemTitle);
    const claimer = userMap.get(sample.claimer);
    if (!item || !claimer) continue;
    await claims.create({
      item: idOf(item),
      claimer: idOf(claimer),
      message: sample.message,
      status: sample.status,
      decidedAt: sample.status === 'pending' ? null : new Date('2026-11-08T15:00:00.000Z'),
    });
    claimCount += 1;
  }

  return { seeded: true, items: SAMPLE_ITEMS.length, users: DEMO_ACCOUNTS.length, claims: claimCount };
}

module.exports = { seedDatabase, DEMO_ACCOUNTS, SAMPLE_ITEMS, SAMPLE_CLAIMS };
