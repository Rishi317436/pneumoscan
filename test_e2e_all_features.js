const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('========================================================');
  console.log('🩺 COMPREHENSIVE E2E VERIFICATION TEST');
  console.log('========================================================\n');

  const cookieJar = { cookie: '' };
  const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true
  });

  // Attach cookies manually for session persistence
  client.interceptors.request.use((config) => {
    if (cookieJar.cookie) {
      config.headers['Cookie'] = cookieJar.cookie;
    }
    return config;
  });

  client.interceptors.response.use((response) => {
    const setCookie = response.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      cookieJar.cookie = setCookie[0].split(';')[0];
    }
    return response;
  });

  const results = [];
  function record(feature, status, detail) {
    results.push({ feature, status, detail });
    const mark = status ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} | ${feature.padEnd(35)} | ${detail}`);
  }

  try {
    // 1. Admin Login
    console.log('\n--- 1. AUTHENTICATION & PROFILE ---');
    const loginRes = await client.post('/auth/login', {
      email: 'admin@radiology.local',
      password: 'password123'
    });
    record('Admin Login', loginRes.data.success === true, `User: ${loginRes.data.user?.username}, Role: ${loginRes.data.user?.role}`);

    // 2. Auth Profile Get & Put
    const profileRes = await client.get('/auth/profile');
    record('Get Profile (/auth/profile)', profileRes.data.success === true, `Email: ${profileRes.data.user?.email}`);

    const updateProfileRes = await client.put('/auth/profile', {
      username: 'Lead Radiologist',
      email: 'admin@radiology.local'
    });
    record('Update Profile (/auth/profile)', updateProfileRes.data.success === true, `Updated username: ${updateProfileRes.data.user?.username}`);

    // 3. Fast Dashboard Aggregations
    console.log('\n--- 2. DASHBOARD & AGGREGATIONS ---');
    const t0 = Date.now();
    const statsRes = await client.get('/dashboard/stats');
    const latency = Date.now() - t0;
    record('Dashboard Aggregations ($facet)', statsRes.data.success === true, `Latency: ${latency}ms, Total Scans: ${statsRes.data.stats?.totalScans || 0}`);

    // 4. Scan Upload & Prediction Pipeline (WSL2 Python + DenseNet121 + GradCAM + DIP)
    console.log('\n--- 3. SCAN UPLOAD & INFERENCE PIPELINE ---');
    const sampleImgPath = path.join(__dirname, 'dataset', 'chest_xray', 'test', 'PNEUMONIA', 'person1_virus_6.jpeg');
    let scanId = null;
    let detectionId = null;

    if (fs.existsSync(sampleImgPath)) {
      const form = new FormData();
      form.append('xrayImage', fs.createReadStream(sampleImgPath));
      
      const uploadRes = await axios.post(`${BASE_URL}/scan/upload`, form, {
        headers: {
          ...form.getHeaders(),
          'Cookie': cookieJar.cookie
        },
        validateStatus: () => true
      });

      const d = uploadRes.data;
      if (d.success && d.detection) {
        scanId = d.scan?._id;
        detectionId = d.detection?._id;
        record('AI DenseNet-121 Inference', true, `Class: ${d.detection.mlDetection?.prediction}, Conf: ${(d.detection.mlDetection?.confidence * 100).toFixed(1)}%`);
        record('Grad-CAM Heatmap Generation', !!d.detection.gradcamImage, `Path: ${d.detection.gradcamImage}`);
        record('Traditional DIP Feature Engine', !!d.detection.manualDetection, `Method: ${d.detection.manualDetection?.method}, Pred: ${d.detection.manualDetection?.prediction}`);
        record('Dual-Method Agreement Analysis', !!d.detection.comparison, `Agreement: ${d.detection.comparison?.agreementStatus}`);
      } else {
        record('Scan Upload & Inference', false, d.message || 'Upload failed');
      }
    } else {
      record('Scan Upload & Inference', false, 'Test image not found at ' + sampleImgPath);
    }

    // 5. Worklist / Results Pagination & Filtering
    console.log('\n--- 4. WORKLIST & STUDY DETAIL ---');
    const resultsRes = await client.get('/scan/results?page=1&limit=5');
    record('Worklist History & Filtering', resultsRes.data.success === true, `Returned ${resultsRes.data.detections?.length || 0} studies`);

    if (detectionId) {
      const detailRes = await client.get(`/scan/detail/${detectionId}`);
      record('Study Detail & PACS Telemetry', detailRes.data.success === true, `Study ID: ${detailRes.data.detection?._id}`);
    }

    // 6. Reports Generation & Retrieval
    console.log('\n--- 5. DIAGNOSTIC REPORTS ---');
    const reportRes = await client.get('/report');
    record('Reports Archive (/api/report)', reportRes.data.success === true, `Found ${reportRes.data.reports?.length || 0} diagnostic reports`);

    // 7. Method Benchmark & Comparison Analytics
    console.log('\n--- 6. BENCHMARK COMPARISON ---');
    const compRes = await client.get('/comparison');
    record('Algorithm Benchmark Matrix', compRes.data.success === true, `Total Studies Evaluated: ${compRes.data.totalComparisons || compRes.data.metrics?.totalStudies || 0}`);

    // 8. Clinical Feedback System
    console.log('\n--- 7. CLINICAL FEEDBACK SYSTEM ---');
    const feedbackSubmit = await client.post('/feedback', {
      subject: 'Excellent Grad-CAM Localization',
      message: 'The DenseNet-121 model localized consolidation accurately in the right lower lobe.',
      rating: 5,
      category: 'Accuracy'
    });
    record('Submit Clinical Feedback', feedbackSubmit.data.success === true, `Feedback ID: ${feedbackSubmit.data.feedback?._id || 'OK'}`);

    const feedbackList = await client.get('/feedback');
    record('View Clinical Feedback List', feedbackList.data.success === true, `Count: ${feedbackList.data.feedbacks?.length || 0}`);

    // 9. Admin Hub & User Management
    console.log('\n--- 8. ADMIN CONTROL & USER HUB ---');
    const trainingStatus = await client.get('/admin/training-status');
    record('Admin Model Metrics & Weights', trainingStatus.data.success === true, `Model: ${trainingStatus.data.modelInfo?.architecture || 'DenseNet-121'}`);

    const userList = await client.get('/admin/users');
    record('Admin User Management (List)', userList.data.success === true, `User count: ${userList.data.users?.length || 0}`);

    const adminDash = await client.get('/admin/dashboard');
    record('Admin Control Panel Overview', adminDash.data.success === true, `Active users: ${adminDash.data.stats?.users || 0}`);

    console.log('\n========================================================');
    console.log(`SUMMARY: ${results.filter(r => r.status).length}/${results.length} TESTS PASSED`);
    console.log('========================================================\n');

  } catch (err) {
    console.error('Test execution error:', err.message);
  }
}

runTests();
