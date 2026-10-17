const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('========================================================');
  console.log('🩺 COMPREHENSIVE E2E VERIFICATION TEST (NATIVE FETCH)');
  console.log('========================================================\n');

  let sessionCookie = '';

  const results = [];
  function record(feature, status, detail) {
    results.push({ feature, status, detail });
    const mark = status ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} | ${feature.padEnd(35)} | ${detail}`);
  }

  async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};
    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }
    if (!isFormData && body) {
      headers['Content-Type'] = 'application/json';
    }

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, options);
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        sessionCookie = setCookie.split(';')[0];
      }
      const data = await res.json().catch(() => ({}));
      return { status: res.status, ok: res.ok, data };
    } catch (e) {
      return { status: 500, ok: false, data: { message: e.message } };
    }
  }

  try {
    // 1. Auth Login
    console.log('\n--- 1. AUTHENTICATION & PROFILE ---');
    const loginRes = await apiCall('/auth/login', 'POST', {
      email: 'admin@radiology.local',
      password: 'password123'
    });
    record('Admin Login', loginRes.data.success === true, `User: ${loginRes.data.user?.username}, Role: ${loginRes.data.user?.role}`);

    // 2. Auth Profile
    const profileRes = await apiCall('/auth/profile');
    record('Get Profile (/auth/profile)', profileRes.data.success === true, `Email: ${profileRes.data.user?.email || JSON.stringify(profileRes.data)}`);

    const updateProfileRes = await apiCall('/auth/profile', 'PUT', {
      name: 'Lead Radiologist',
      username: 'Lead Radiologist',
      email: 'admin@radiology.local'
    });
    record('Update Profile (/auth/profile)', updateProfileRes.data.success === true, `Updated name: ${updateProfileRes.data.user?.name || JSON.stringify(updateProfileRes.data)}`);

    // 3. Fast Dashboard Aggregations
    console.log('\n--- 2. DASHBOARD & AGGREGATIONS ---');
    const t0 = Date.now();
    const statsRes = await apiCall('/dashboard/stats');
    const latency = Date.now() - t0;
    record('Dashboard Aggregations ($facet)', statsRes.data.success === true, `Latency: ${latency}ms, Total Scans: ${statsRes.data.stats?.totalScans || 0}`);

    // 4. Scan Upload & Inference
    console.log('\n--- 3. SCAN UPLOAD & INFERENCE PIPELINE ---');
    const sampleImgPath = path.join(__dirname, 'dataset', 'chest_xray', 'test', 'PNEUMONIA', 'person1_virus_6.jpeg');
    let detectionId = null;

    if (fs.existsSync(sampleImgPath)) {
      const fileBuffer = fs.readFileSync(sampleImgPath);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('xrayImage', blob, 'person1_virus_6.jpeg');

      const uploadRes = await apiCall('/scan/upload', 'POST', formData, true);
      const d = uploadRes.data;
      if (d.success && d.detection) {
        detectionId = d.detection._id;
        record('AI DenseNet-121 Inference', true, `Class: ${d.detection.mlDetection?.prediction}, Conf: ${(d.detection.mlDetection?.confidence * 100).toFixed(1)}%`);
        record('Grad-CAM Heatmap Generation', !!d.detection.gradcamImage, `Path: ${d.detection.gradcamImage}`);
        record('Traditional DIP Feature Engine', !!d.detection.manualDetection, `Method: ${d.detection.manualDetection?.method}, Pred: ${d.detection.manualDetection?.prediction}`);
        record('Dual-Method Agreement Analysis', !!d.detection.comparison, `Agreement: ${d.detection.comparison?.agreementStatus}`);
      } else {
        record('Scan Upload & Inference', false, d.message || 'Upload failed');
      }
    } else {
      record('Scan Upload & Inference', false, 'Test image not found');
    }

    // 5. Worklist History & Detail
    console.log('\n--- 4. WORKLIST & STUDY DETAIL ---');
    const resultsRes = await apiCall('/scan/results?page=1&limit=5');
    record('Worklist History & Filtering', resultsRes.data.success === true, `Returned ${resultsRes.data.detections?.length || 0} studies`);

    if (detectionId) {
      const detailRes = await apiCall(`/scan/detail/${detectionId}`);
      record('Study Detail & PACS Telemetry', detailRes.data.success === true, `Study ID: ${detailRes.data.detection?._id}`);
    }

    // 6. Reports Archive
    console.log('\n--- 5. DIAGNOSTIC REPORTS ---');
    const reportRes = await apiCall('/report');
    record('Reports Archive (/api/report)', reportRes.data.success === true, `Found ${reportRes.data.reports?.length || 0} diagnostic reports`);

    // 7. Benchmark Comparison
    console.log('\n--- 6. BENCHMARK COMPARISON ---');
    const compRes = await apiCall('/comparison');
    record('Algorithm Benchmark Matrix', compRes.data.success === true, `Total Studies Evaluated: ${compRes.data.totalComparisons || compRes.data.metrics?.totalStudies || 0}`);

    // 8. Clinical Feedback System
    console.log('\n--- 7. CLINICAL FEEDBACK SYSTEM ---');
    const feedbackSubmit = await apiCall('/feedback', 'POST', {
      subject: 'Excellent Grad-CAM Localization',
      message: 'The DenseNet-121 model localized consolidation accurately in the right lower lobe.',
      rating: 5,
      category: 'Accuracy'
    });
    record('Submit Clinical Feedback', feedbackSubmit.data.success === true, `Feedback saved`);

    const feedbackList = await apiCall('/feedback');
    record('View Clinical Feedback List', feedbackList.data.success === true, `Count: ${feedbackList.data.feedbacks?.length || 0}`);

    // 9. Admin Hub & User Management
    console.log('\n--- 8. ADMIN CONTROL & USER HUB ---');
    const trainingStatus = await apiCall('/admin/training-status');
    record('Admin Model Metrics & Weights', trainingStatus.data.success === true, `Model: ${trainingStatus.data.modelInfo?.architecture || 'DenseNet-121'}`);

    const userList = await apiCall('/admin/users');
    record('Admin User Management (List)', userList.data.success === true, `User count: ${userList.data.users?.length || 0}`);

    const adminDash = await apiCall('/admin/dashboard');
    record('Admin Control Panel Overview', adminDash.data.success === true, `Active users: ${adminDash.data.stats?.users || 0}`);

    console.log('\n========================================================');
    console.log(`SUMMARY: ${results.filter(r => r.status).length}/${results.length} TESTS PASSED`);
    console.log('========================================================\n');

  } catch (err) {
    console.error('Test error:', err);
  }
}

runTests();
