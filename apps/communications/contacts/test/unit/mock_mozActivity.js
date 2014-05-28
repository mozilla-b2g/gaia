'use strict';

MockMozActivity.currentActivity = {
  onsuccess: null,
  onerror: null,
  result: null
};

function MockMozActivity(activity) {
  MockMozActivity.calls.push(activity);
  MockMozActivity.instances.push(this);

  return MockMozActivity.currentActivity;
}

MockMozActivity.setResult = function(expectedResult) {
 MockMozActivity.currentActivity.result = expectedResult || {};
};

// create an array to hold any calls to this function to test them
MockMozActivity.mSetup = function() {
  MockMozActivity.calls = [];
  MockMozActivity.instances = [];
  MockMozActivity.result = {};
};

// destroy the array so it resets every time
MockMozActivity.mTeardown = function() {
  delete MockMozActivity.calls;
  delete MockMozActivity.instances;
  delete MockMozActivity.result;
};
