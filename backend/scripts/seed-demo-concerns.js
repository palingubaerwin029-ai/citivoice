#!/usr/bin/env node
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('../db');

const DEMO_CONCERNS = [
  {
    title: 'Severe road flooding near Barangay Tabao main crossing',
    description: 'Deep flood water blocking vehicles near the main crossing. Needs immediate drainage clearing.',
    category: 'Water & Drainage',
    priority: 'High',
    status: 'In Progress',
    location_address: 'Barangay Tabao, Kabankalan City',
    location_lat: 9.9920,
    location_lng: 122.8180,
    user_name: 'Juan Dela Cruz',
    user_barangay: 'Tabao',
    department: 'City Water District',
    admin_note: 'Dispatched Maintenance Team 4 to clear drainage blockages.',
    upvotes: 14
  },
  {
    title: 'Fallen electric post and dangling power cables',
    description: 'Electric post tilted dangerously after heavy storm. Exposed live wires on the street.',
    category: 'Electricity',
    priority: 'High',
    status: 'Pending',
    location_address: 'Barangay 1, Rizal Street, Kabankalan City',
    location_lat: 9.9880,
    location_lng: 122.8140,
    user_name: 'Maria Clara',
    user_barangay: 'Barangay 1',
    department: 'NOCECO / Electric Utility',
    admin_note: 'Awaiting urgent utility crew dispatch.',
    upvotes: 22
  },
  {
    title: 'Large pothole causing traffic congestion near bridge',
    description: 'Deep road cavity damaging vehicle tires and slowing down main highway traffic.',
    category: 'Road & Infrastructure',
    priority: 'Medium',
    status: 'In Progress',
    location_address: 'Ilog Bridge Access Road, Kabankalan City',
    location_lat: 9.9750,
    location_lng: 122.8050,
    user_name: 'Roberto Santos',
    user_barangay: 'Binicuil',
    department: 'City Engineering Office',
    admin_note: 'Asphalt patching scheduled for tomorrow morning.',
    upvotes: 9
  },
  {
    title: 'Uncollected garbage accumulation near public market',
    description: 'Waste bags overflowing onto sidewalk creating foul odor and pest hazard.',
    category: 'Waste & Sanitation',
    priority: 'Medium',
    status: 'Pending',
    location_address: 'Kabankalan Public Market Plaza',
    location_lat: 9.9820,
    location_lng: 122.8110,
    user_name: 'Ana Lim',
    user_barangay: 'Barangay 2',
    department: 'City Sanitation Division',
    admin_note: 'Notified sanitation truck route supervisor.',
    upvotes: 11
  },
  {
    title: 'Non-functioning streetlights along Guinzadan road',
    description: 'Dark stretch of street at night causing safety concerns for evening commuters.',
    category: 'Electricity',
    priority: 'Low',
    status: 'Resolved',
    location_address: 'Guinzadan Road, Kabankalan City',
    location_lat: 9.9950,
    location_lng: 122.8250,
    user_name: 'Pedro Penduko',
    user_barangay: 'Guinzadan',
    department: 'NOCECO / Electric Utility',
    admin_note: 'Replaced 6 LED street bulbs. Operational.',
    upvotes: 7
  },
  {
    title: 'Clogged drainage pipe causing street overflow',
    description: 'Rainwater overflowing from blocked culvert onto residential sidewalk.',
    category: 'Water & Drainage',
    priority: 'High',
    status: 'Pending',
    location_address: 'Barangay 3 Crossing, Kabankalan City',
    location_lat: 10.0050,
    location_lng: 122.8300,
    user_name: 'Elena Torres',
    user_barangay: 'Barangay 3',
    department: 'City Water District',
    admin_note: null,
    upvotes: 18
  },
  {
    title: 'Damaged traffic warning signage near school zone',
    description: 'School zone sign knocked down by passing truck. Poses risk to elementary students.',
    category: 'Public Safety',
    priority: 'Medium',
    status: 'Pending',
    location_address: 'Kabankalan Elementary School Front',
    location_lat: 9.9890,
    location_lng: 122.8160,
    user_name: 'Mark Reyes',
    user_barangay: 'Barangay 1',
    department: 'PNP / Barangay Tanod',
    admin_note: null,
    upvotes: 5
  }
];

(async () => {
  try {
    console.log('🌱 Seeding demo concerns for Kabankalan City...');

    for (const c of DEMO_CONCERNS) {
      const [existing] = await pool.query('SELECT id FROM concerns WHERE title = ?', [c.title]);
      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO concerns (title, description, category, priority, status, location_address, location_lat, location_lng, user_name, user_barangay, department, admin_note, upvotes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            c.title,
            c.description,
            c.category,
            c.priority,
            c.status,
            c.location_address,
            c.location_lat,
            c.location_lng,
            c.user_name,
            c.user_barangay,
            c.department,
            c.admin_note,
            c.upvotes,
          ]
        );
        console.log(`➕ Added concern: ${c.title}`);
      } else {
        await pool.query(
          `UPDATE concerns SET status = ?, priority = ?, category = ?, location_lat = ?, location_lng = ?, updated_at = NOW() WHERE id = ?`,
          [c.status, c.priority, c.category, c.location_lat, c.location_lng, existing[0].id]
        );
        console.log(`🔄 Updated concern: ${c.title}`);
      }
    }

    console.log('✅ Demo concerns seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
})();
