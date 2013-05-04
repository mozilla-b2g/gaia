'use strict';

var MockMozActivity = function(activity) {
  MockMozActivity.calls.push(activity);
};

// create an array to hold any calls to this function to test them
MockMozActivity.mSetup = function() {
  MockMozActivity.calls = [];
};

// destroy the array so it resets every time
MockMozActivity.mTeardown = function() {
  delete MockMozActivity.calls;
};
