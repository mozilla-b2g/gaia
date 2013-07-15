'use strict';

function MockOptionMenu(options) {
  MockOptionMenu.calls.push(options);
  MockOptionMenu.instances.push(this);
}

MockOptionMenu.prototype = {
  show: function() {
    this.show.called = true;
  }
};
// create an array to hold any calls to this function to test them
MockOptionMenu.mSetup = function() {
  MockOptionMenu.calls = [];
  MockOptionMenu.instances = [];
};

// destroy the array so it resets every time
MockOptionMenu.mTeardown = function() {
  delete MockOptionMenu.calls;
  delete MockOptionMenu.instances;
};
