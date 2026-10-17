const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./backend/models/User');

const BASE_URL = 'http://localhost:5000/api';
const MONGO_URI = 'mongodb://localhost:27017/pneumonia_detection_db';

async function testRegistrationFlow() {
  console.log('========================================================');
  console.log('🧪 COMPREHENSIVE REGISTRATION FLOW & MONGO VERIFICATION');
  console.log('========================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function record(desc, passed, detail) {
    totalCount++;
    if (passed) passedCount++;
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} | ${desc.padEnd(45)} | ${detail}`);
  }

  // 1. Validation Test: Missing Fields
  const res1 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '', email: '', password: '' })
  });
  const data1 = await res1.json();
  record('Validation: Missing Name/Email/Password', res1.status === 400 && !data1.success, `Msg: "${data1.message}"`);

  // 2. Validation Test: Invalid Email
  const res2 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dr. Test', email: 'invalid-email', password: 'password123' })
  });
  const data2 = await res2.json();
  record('Validation: Invalid Email Format', res2.status === 400 && !data2.success, `Msg: "${data2.message}"`);

  // 3. Validation Test: Short Password
  const res3 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dr. Test', email: 'test@radiology.org', password: '123' })
  });
  const data3 = await res3.json();
  record('Validation: Short Password (<6 chars)', res3.status === 400 && !data3.success, `Msg: "${data3.message}"`);

  // 4. Validation Test: Future DOB
  const res4 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Test',
      email: 'future@radiology.org',
      password: 'password123',
      dob: '2099-01-01'
    })
  });
  const data4 = await res4.json();
  record('Validation: Future Date of Birth Rejection', res4.status === 400 && !data4.success, `Msg: "${data4.message}"`);

  // 5. Successful Full-Field Registration
  const testEmail = `elena.rostova.${Date.now()}@radiology.org`;
  const rawPassword = 'ClinicalSecurePass!2026';
  const fullPayload = {
    name: 'Dr. Elena Rostova, MD',
    email: testEmail,
    password: rawPassword,
    phone: '+1 (555) 987-6543',
    dob: '1988-05-14',
    gender: 'Female',
    address: 'Thoracic Imaging Center, Unit 4'
  };

  const res5 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullPayload)
  });
  const data5 = await res5.json();
  record('API: Full Registration Submission', res5.status === 201 && data5.success === true, `Created User ID: ${data5.user?.id}`);

  // 6. Direct MongoDB Verification
  await mongoose.connect(MONGO_URI);
  const dbUser = await User.findOne({ email: testEmail });

  if (dbUser) {
    record('MongoDB: Name Stored Correctly', dbUser.name === fullPayload.name, `Stored: "${dbUser.name}"`);
    record('MongoDB: Email Normalized & Stored', dbUser.email === testEmail.toLowerCase(), `Stored: "${dbUser.email}"`);
    record('MongoDB: Phone Stored Correctly', dbUser.phone === fullPayload.phone, `Stored: "${dbUser.phone}"`);
    record('MongoDB: Date of Birth Stored as Date', dbUser.dob instanceof Date && dbUser.dob.toISOString().startsWith('1988-05-14'), `Stored: "${dbUser.dob?.toISOString()}"`);
    record('MongoDB: Gender Stored as Enum', dbUser.gender === 'Female', `Stored: "${dbUser.gender}"`);
    record('MongoDB: Address / Facility Stored', dbUser.address === fullPayload.address, `Stored: "${dbUser.address}"`);
    
    // Check Password Hashing
    const isHashed = dbUser.password.startsWith('$2a$') || dbUser.password.startsWith('$2b$');
    const matchesPassword = await bcrypt.compare(rawPassword, dbUser.password);
    record('MongoDB: Password Securely Hashed (Bcrypt)', isHashed && matchesPassword, `Hash prefix: ${dbUser.password.substring(0, 7)}... Match: ${matchesPassword}`);
  } else {
    record('MongoDB: User Record Exists', false, 'User not found in DB');
  }

  // 7. Duplicate Email Rejection
  const res7 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullPayload)
  });
  const data7 = await res7.json();
  record('Validation: Duplicate Email Prevention', res7.status === 400 && !data7.success, `Msg: "${data7.message}"`);

  // 8. Session Login with Newly Registered User
  const res8 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: rawPassword })
  });
  const data8 = await res8.json();
  record('Authentication: Login with New Clinician', res8.status === 200 && data8.success === true, `Welcome ${data8.user?.name}`);

  await mongoose.disconnect();

  console.log('\n========================================================');
  console.log(`SUMMARY: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log('========================================================\n');
}

testRegistrationFlow().catch(console.error);
