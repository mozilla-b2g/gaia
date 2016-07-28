'use strict';

function MockDialog(params) {
  MockDialog.calls.push(params);
  MockDialog.instances.push(this);

  Object.keys(params.options).forEach(function(option) {
    MockDialog.triggers[option] = function() {
      MockDialog.triggers[option].called = true;
      params.options[option].method();
    };

    // Setup the initial |false| value, this prevents assert.isFalse from
    // failing on |undefined| trigger properties
    MockDialog.triggers[option].called = false;
  });
}

MockDialog.triggers = {};

MockDialog.prototype = {
  show: function() {
    this.show.called = true;
  }
};

MockDialog.mSetup = function() {
  MockDialog.calls = [];
  MockDialog.instances = [];
};

MockDialog.mTeardown = function() {
  delete MockDialog.calls;
  delete MockDialog.instances;

  Object.keys(MockDialog.triggers).forEach(function(trigger) {
    MockDialog.triggers[trigger].called = false;
  });
};

function MockErrorDialog() {
  MockErrorDialog.calls.push(arguments);
}

MockErrorDialog.prototype = {
  show: function() {
    this.show.called = true;
  }
};

MockErrorDialog.mSetup = function() {
  MockErrorDialog.calls = [];
};

MockErrorDialog.mTeardown = function() {
  delete MockErrorDialog.calls;
};
