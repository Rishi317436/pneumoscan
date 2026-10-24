const fs = require('fs');
const path = require('path');
const { matchSampleBenchmark, SAMPLE_BENCHMARKS } = require('../config/sampleObservations');

function runTests() {
  console.log('=== Running PneumoScan Sample Observations Verification ===\n');
  let failures = 0;

  // 1. Verify Image 1: person53_virus_107.jpeg
  const sample1Path = path.join(__dirname, '../public/sample_scans/person53_virus_107.jpeg');
  if (!fs.existsSync(sample1Path)) {
    console.error('FAIL: person53_virus_107.jpeg does not exist at', sample1Path);
    failures++;
  } else {
    const buf1 = fs.readFileSync(sample1Path);
    const match1 = matchSampleBenchmark(buf1, 'person53_virus_107.jpeg');
    if (!match1 || match1.id !== 'person53_virus_107') {
      console.error('FAIL: Sample 1 did not match configuration via SHA-256 / filename. Got:', match1);
      failures++;
    } else {
      console.log('PASS: Sample 1 correctly matched by', match1.matchedBy);
      
      const expectedObs1 = {
        right_upper: 'No obvious dense focal opacity apparent on preliminary visual inspection.',
        right_middle: 'Mild haziness may be present.',
        right_lower: 'Relative haziness around the lower/perihilar region warrants closer review.',
        left_upper: 'No obvious dense focal opacity apparent.',
        left_middle: 'Mild haziness and overlapping structures limit assessment.',
        left_lower: 'Assessment is limited by the heart shadow.'
      };

      for (const [zone, exp] of Object.entries(expectedObs1)) {
        if (match1.observations[zone] !== exp) {
          console.error(`FAIL: Sample 1 zone [${zone}] mismatch.\nExpected: "${exp}"\nGot:      "${match1.observations[zone]}"`);
          failures++;
        }
      }
      console.log('PASS: Sample 1 all 6 zone observations verified matching specification.');

      const expectedStatuses1 = {
        right_upper: 'NORMAL',
        right_middle: 'SUSPICIOUS',
        right_lower: 'ABNORMAL',
        left_upper: 'NORMAL',
        left_middle: 'SUSPICIOUS',
        left_lower: 'SUSPICIOUS'
      };
      for (const [zone, exp] of Object.entries(expectedStatuses1)) {
        if (match1.zoneStatuses[zone] !== exp) {
          console.error(`FAIL: Sample 1 zone status [${zone}] mismatch.\nExpected: "${exp}"\nGot:      "${match1.zoneStatuses[zone]}"`);
          failures++;
        }
      }
      console.log('PASS: Sample 1 all 6 zone statuses verified.');
    }
  }

  // 2. Verify Image 2: person67_bacteria_333.jpeg
  const sample2Path = path.join(__dirname, '../public/sample_scans/person67_bacteria_333.jpeg');
  if (!fs.existsSync(sample2Path)) {
    console.error('FAIL: person67_bacteria_333.jpeg does not exist at', sample2Path);
    failures++;
  } else {
    const buf2 = fs.readFileSync(sample2Path);
    const match2 = matchSampleBenchmark(buf2, 'person67_bacteria_333.jpeg');
    if (!match2 || match2.id !== 'person67_bacteria_333') {
      console.error('FAIL: Sample 2 did not match configuration via SHA-256 / filename. Got:', match2);
      failures++;
    } else {
      console.log('PASS: Sample 2 correctly matched by', match2.matchedBy);
      
      const expectedObs2 = {
        right_upper: 'Diffuse haziness is visible, with overlapping structures limiting assessment.',
        right_middle: 'Increased haziness is visible around the central lung region.',
        right_lower: 'Hazy opacities are visible in the lower lung region.',
        left_upper: 'The upper region appears relatively better aerated, although assessment is limited.',
        left_middle: 'Hazy appearance is present around the central region.',
        left_lower: 'Hazy opacities are visible near the lower lung region.'
      };

      for (const [zone, exp] of Object.entries(expectedObs2)) {
        if (match2.observations[zone] !== exp) {
          console.error(`FAIL: Sample 2 zone [${zone}] mismatch.\nExpected: "${exp}"\nGot:      "${match2.observations[zone]}"`);
          failures++;
        }
      }
      console.log('PASS: Sample 2 all 6 zone observations verified matching specification.');

      const expectedStatuses2 = {
        right_upper: 'SUSPICIOUS',
        right_middle: 'ABNORMAL',
        right_lower: 'ABNORMAL',
        left_upper: 'NORMAL',
        left_middle: 'ABNORMAL',
        left_lower: 'ABNORMAL'
      };
      for (const [zone, exp] of Object.entries(expectedStatuses2)) {
        if (match2.zoneStatuses[zone] !== exp) {
          console.error(`FAIL: Sample 2 zone status [${zone}] mismatch.\nExpected: "${exp}"\nGot:      "${match2.zoneStatuses[zone]}"`);
          failures++;
        }
      }
      console.log('PASS: Sample 2 all 6 zone statuses verified.');
    }
  }

  // 3. Verify Ordinary Uploads: must return null (genuine analysis preserved)
  const randomBuffer = Buffer.from('Ordinary Patient Chest X-Ray Binary Data ' + Date.now());
  const matchRandom = matchSampleBenchmark(randomBuffer, 'patient_chest_xray_9912.jpeg');
  if (matchRandom !== null) {
    console.error('FAIL: Random upload erroneously matched sample benchmark!');
    failures++;
  } else {
    console.log('PASS: Ordinary non-sample upload returns null (genuine inference pipeline preserved).');
  }

  console.log(`\n=== Verification Complete: ${failures === 0 ? 'ALL TESTS PASSED (0 failures)' : failures + ' FAILURES'} ===`);
  process.exit(failures === 0 ? 0 : 1);
}

runTests();
