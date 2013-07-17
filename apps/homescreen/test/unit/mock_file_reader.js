'use strict';

var MockFileReader = function() {
  MockFileReader.instances.push(this);
};

MockFileReader.mSetup = function() {
  MockFileReader.instances = [];
};

MockFileReader.mTeardown = function() {
  delete MockFileReader.instances;
};

MockFileReader.prototype = {
  readAsDataURL: function() {
    this.readAsDataURLInvoked = true;
  }
};
