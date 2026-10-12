#!/usr/bin/env node
'use strict';

/**
 * Notice: Hardcoded admin seeding has been deprecated for security.
 * Please use the interactive, salted admin setup script:
 *
 *   node scripts/seed-admin.js
 */

console.log('⚠️  Notice: Hardcoded default admin credentials have been disabled for security.');
console.log('👉 Please run the interactive script instead:');
console.log('   node scripts/seed-admin.js\n');

// Delegate execution to the secure interactive setup script
require('./scripts/seed-admin');
