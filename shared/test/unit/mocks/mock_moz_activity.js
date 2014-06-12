'use strict';

var MockMozActivity = function(info) {

  MockMozActivity.calls.push(info);
  MockMozActivity.instances.push(this);

  if (!info) {
    return;
  }

  var name = info.name;
  var data = info.data;

  return {
    set onsuccess(cb) { setTimeout(cb, 50); },
    set onerror(cb) {},
    name: name,
    data: data
  };

};

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
