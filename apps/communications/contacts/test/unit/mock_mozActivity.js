'use strict';

function MockMozActivity(activity) {
  MockMozActivity.calls.push(activity);
  MockMozActivity.instances.push(this);


  activity.onerror = function() {};
  return {
    set onsuccess(cb) {
      cb();
    }
  };
}

// create an array to hold any calls to this function to test them
MockMozActivity.mSetup = function() {
  MockMozActivity.calls = [];
  MockMozActivity.instances = [];
};

// destroy the array so it resets every time
MockMozActivity.mTeardown = function() {
  delete MockMozActivity.calls;
  delete MockMozActivity.instances;
};
