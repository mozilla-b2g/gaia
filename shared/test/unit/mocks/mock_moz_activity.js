'use strict';

/* exported MockMozActivity */

var MockMozActivity = function(info) {
  MockMozActivity.calls.push(info);
  MockMozActivity.instances.push(this);

  if (!info) {
    return;
  }

  var name = info.name;
  var data = info.data;
  return {
    set onsuccess(cb) {
      MockMozActivity.timeouts.push(setTimeout(cb, 50));
    },
    set onerror(cb) {
      MockMozActivity.errorCallback = cb;
    },
    name: name,
    data: data,
    get result() {
      return MockMozActivity.successResult;
    }
  };
};

// create an array to hold any calls to this function to test them
MockMozActivity.mSetup = function() {
  MockMozActivity.calls = [];
  MockMozActivity.instances = [];
  MockMozActivity.successResult = null;
  MockMozActivity.timeouts = [];
};

MockMozActivity.mTriggerOnError = function() {
  MockMozActivity.errorCallback();
};

// destroy the array so it resets every time
MockMozActivity.mTeardown = function() {
  delete MockMozActivity.calls;
  delete MockMozActivity.instances;

  MockMozActivity.timeouts.forEach(clearTimeout);
  MockMozActivity.timeouts = [];
};
