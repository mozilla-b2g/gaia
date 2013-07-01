'use strict';

function MockDialog(params) {
  MockDialog.calls.push(params);
  MockDialog.instances.push(this);
}

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
};
