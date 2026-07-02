/**
 * Seeding Script: Seed local database with mock citizens, mock admins assigned to departments,
 * mock concerns, and assignment workflows.
 * 
 * Run this from backend root:
 *   node database/seed-demo-data.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seed() {
  try {
    console.log('[Seeder] Connecting to database...');
    const pool = mysql.createPool({
      host: '127.0.0.1',
      port: 3307,
      user: 'root',
      password: 'root',
      database: 'citivoice',
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    console.log('[Seeder] Seeding mock users...');
    
    // 1. Seed Citizens
    const citizens = [
      { name: 'Juan dela Cruz', email: 'juan.dela.cruz@citivoice.ph', phone: '09171234567', barangay: 'Barangay 1 (Poblacion)' },
      { name: 'Maria Clara', email: 'maria.clara@citivoice.ph', phone: '09187654321', barangay: 'Barangay 2 (Poblacion)' }
    ];

    const citizenIds = [];
    for (const c of citizens) {
      const [res] = await pool.query(
        `INSERT INTO users (name, email, password_hash, phone, barangay, role, verification_status, is_verified) 
         VALUES (?, ?, ?, ?, ?, 'citizen', 'verified', 1) 
         ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
        [c.name, c.email, passwordHash, c.phone, c.barangay]
      );
      citizenIds.push(res.insertId);
    }

    // 2. Seed Department Admins
    const admins = [
      { name: 'Engr. Ricardo Ramos', email: 'eng.ramos@citivoice.gov.ph', department: 'City Engineering Office' },
      { name: 'Engr. Karen Villanueva', email: 'eng.villanueva@citivoice.gov.ph', department: 'City Water District' },
      { name: 'Chief Carlos Torres', email: 'chief.torres@citivoice.gov.ph', department: 'PNP / Barangay Tanod' }
    ];

    const adminMap = {};
    for (const a of admins) {
      const [res] = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, department, verification_status, is_verified) 
         VALUES (?, ?, ?, 'admin', ?, 'verified', 1) 
         ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), department = VALUES(department)`,
        [a.name, a.email, adminPasswordHash, a.department]
      );
      adminMap[a.department] = res.insertId;
      console.log(`  Seeded Admin: ${a.name} (${a.email}) -> ${a.department}`);
    }

    console.log('[Seeder] Seeding concerns...');

    const concerns = [
      {
        title: 'Large pothole in Rizal Street',
        description: 'There is a massive pothole in Rizal Street near the local bakery. It poses a risk to motorists, especially motorcycles at night.',
        category: 'Road & Infrastructure',
        priority: 'Medium',
        status: 'Pending',
        lat: 9.9870,
        lng: 122.8140,
        barangay: 'Barangay 1 (Poblacion)',
        userIndex: 0,
        department: 'City Engineering Office — General Queue'
      },
      {
        title: 'Dangling live electrical wires',
        description: 'A fallen post has left live electrical wires dangling close to the road. This is extremely hazardous.',
        category: 'Electricity',
        priority: 'High',
        status: 'In Progress',
        lat: 9.9855,
        lng: 122.8115,
        barangay: 'Barangay 3 (Poblacion)',
        userIndex: 1,
        department: 'NOCECO / Electric Utility — Emergency Crew'
      },
      {
        title: 'Clogged drainage causing street flood',
        description: 'The canal is completely blocked by garbage, causing water to pool and flood the street even during light rain.',
        category: 'Water & Drainage',
        priority: 'Medium',
        status: 'In Progress',
        lat: 9.9882,
        lng: 122.8162,
        barangay: 'Barangay 2 (Poblacion)',
        userIndex: 0,
        department: 'City Water District — Maintenance'
      },
      {
        title: 'Uncollected garbage piles on Rizal street',
        description: 'Garbage has not been collected for over a week, leading to a terrible smell and stray dogs tearing the trash bags.',
        category: 'Waste & Sanitation',
        priority: 'Low',
        status: 'Resolved',
        lat: 9.9890,
        lng: 122.8120,
        barangay: 'Barangay 1 (Poblacion)',
        userIndex: 1,
        department: 'City Sanitation Division — General Queue'
      },
      {
        title: 'Aggressive stray dogs near public school',
        description: 'A pack of aggressive stray dogs has been gathering outside the school gates. They have chased several children already.',
        category: 'Public Safety',
        priority: 'High',
        status: 'Pending',
        lat: 9.9840,
        lng: 122.8180,
        barangay: 'Barangay 4 (Poblacion)',
        userIndex: 0,
        department: 'PNP / Barangay Tanod — Immediate Dispatch'
      }
    ];

    for (const c of concerns) {
      const citizenId = citizenIds[c.userIndex];
      const citizenName = citizens[c.userIndex].name;
      
      const [res] = await pool.query(
        `INSERT INTO concerns (title, description, category, priority, status, location_address, location_lat, location_lng, user_id, user_name, user_barangay, department)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.title,
          c.description,
          c.category,
          c.priority,
          c.status,
          `${c.barangay}, Kabankalan City`,
          c.lat,
          c.lng,
          citizenId,
          citizenName,
          c.barangay,
          c.department
        ]
      );
      const concernId = res.insertId;

      // Seed assignments for these concerns
      const baseDept = c.department.split(' — ')[0];
      const assignedAdminId = adminMap[baseDept] || null;

      const deadline = new Date();
      deadline.setHours(deadline.getHours() + (c.priority === 'High' ? 24 : c.priority === 'Medium' ? 72 : 168));

      await pool.query(
        `INSERT INTO concern_assignments (concern_id, assigned_to, department, sla_hours, sla_deadline, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          concernId,
          assignedAdminId,
          c.department,
          c.priority === 'High' ? 24 : c.priority === 'Medium' ? 72 : 168,
          deadline,
          c.status === 'In Progress' ? 'accepted' : c.status === 'Resolved' ? 'completed' : 'assigned'
        ]
      );
    }

    console.log('✅ Mock data seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeder Error:', err);
    process.exit(1);
  }
}

seed();
