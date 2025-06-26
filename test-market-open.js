// Test market open logic with multiple scenarios
const { isAfter, isBefore } = require('date-fns');

// Test the isMarketOpenWithTimes function logic (using inclusive comparisons like the fixed version)
function isMarketOpenWithTimes(startTime, endTime, testDate = new Date()) {
  const now = testDate;
  
  if (now.getDay() !== 4) { // Not Thursday
    console.log(`❌ Not Thursday (day ${now.getDay()}), market closed`);
    return false;
  }
  
  // Parse the time strings (format: "HH:MM" or "HH:MM:SS")
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const marketStartTime = new Date(now);
  marketStartTime.setHours(startHour, startMinute, 0, 0);
  
  const marketEndTime = new Date(now);
  marketEndTime.setHours(endHour, endMinute, 0, 0);
  
  console.log(`  Market start time: ${marketStartTime.toLocaleTimeString()}`);
  console.log(`  Market end time: ${marketEndTime.toLocaleTimeString()}`);
  console.log(`  Current time: ${now.toLocaleTimeString()}`);
  
  // Use inclusive comparisons: market is open from start time (inclusive) to end time (inclusive)
  const isAfterStart = now >= marketStartTime;
  const isBeforeEnd = now <= marketEndTime;
  
  console.log(`  Is after/equal to start: ${isAfterStart}`);
  console.log(`  Is before/equal to end: ${isBeforeEnd}`);
  
  return isAfterStart && isBeforeEnd;
}

// Test scenarios
const testScenarios = [
  {
    name: "Wednesday (not Thursday) - should be closed",
    date: new Date('2024-01-17T15:30:00'), // Wednesday
    startTime: '15:00:00',
    endTime: '18:30:00',
    expected: false
  },
  {
    name: "Thursday before market opens (2:30 PM) - should be closed",
    date: new Date('2024-01-18T14:30:00'), // Thursday
    startTime: '15:00:00',
    endTime: '18:30:00',
    expected: false
  },
  {
    name: "Thursday at market start time (3:00 PM) - should be open",
    date: new Date('2024-01-18T15:00:00'), // Thursday
    startTime: '15:00:00',
    endTime: '18:30:00',
    expected: true
  },
  {
    name: "Thursday during market hours (4:30 PM) - should be open",
    date: new Date('2024-01-18T16:30:00'), // Thursday
    startTime: '15:00:00',
    endTime: '18:30:00',
    expected: true
  },
  {
    name: "Thursday at market end time (6:30 PM) - should be open",
    date: new Date('2024-01-18T18:30:00'), // Thursday
    startTime: '15:00:00',
    endTime: '18:30:00',
    expected: true
  },
  {
    name: "Thursday after market closes (7:00 PM) - should be closed",
    date: new Date('2024-01-18T19:00:00'), // Thursday
    startTime: '15:00:00',
    endTime: '18:30:00',
    expected: false
  },
  {
    name: "Friday (not Thursday) - should be closed",
    date: new Date('2024-01-19T16:00:00'), // Friday
    startTime: '15:00:00',
    endTime: '18:30:00',
    expected: false
  },
  {
    name: "Sunday (not Thursday) - should be closed",
    date: new Date('2024-01-21T16:00:00'), // Sunday
    startTime: '15:00:00',
    endTime: '18:30:00',
    expected: false
  },
  {
    name: "Thursday with different market hours (10 AM - 2 PM) - current time 12 PM - should be open",
    date: new Date('2024-01-18T12:00:00'), // Thursday
    startTime: '10:00:00',
    endTime: '14:00:00',
    expected: true
  },
  {
    name: "Thursday with different market hours (10 AM - 2 PM) - current time 3 PM - should be closed",
    date: new Date('2024-01-18T15:00:00'), // Thursday
    startTime: '10:00:00',
    endTime: '14:00:00',
    expected: false
  }
];

console.log('🧪 Testing Market Open Logic (Fixed Version)\n');

let passedTests = 0;
let totalTests = testScenarios.length;

testScenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log(`   Date: ${scenario.date.toLocaleDateString()} ${scenario.date.toLocaleTimeString()}`);
  console.log(`   Market hours: ${scenario.startTime} - ${scenario.endTime}`);
  
  const result = isMarketOpenWithTimes(scenario.startTime, scenario.endTime, scenario.date);
  
  if (result === scenario.expected) {
    console.log(`   ✅ PASS: Expected ${scenario.expected}, got ${result}`);
    passedTests++;
  } else {
    console.log(`   ❌ FAIL: Expected ${scenario.expected}, got ${result}`);
  }
});

console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! The market open logic is working correctly.');
} else {
  console.log('⚠️  Some tests failed. There may be issues with the market open logic.');
}

// Test current time
console.log('\n🔍 Current Time Test:');
const now = new Date();
console.log(`Current day: ${now.getDay()} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]})`);
console.log(`Current time: ${now.toLocaleTimeString()}`);
const currentResult = isMarketOpenWithTimes('15:00:00', '18:30:00', now);
console.log(`Market open right now: ${currentResult}`); 