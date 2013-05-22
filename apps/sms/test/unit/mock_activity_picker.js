'use strict';


var MockActivityPicker = {};


['call', 'createNewContact', 'addToExistingContact'].forEach(function(fn) {
  MockActivityPicker[fn] = function() {
    MockActivityPicker[fn].called = true;
    MockActivityPicker[fn].calledWith = [].slice.call(arguments);
  };

  MockActivityPicker[fn].mSetup = function() {
    MockActivityPicker[fn].called = false;
    MockActivityPicker[fn].calledWith = null;
  };

  MockActivityPicker[fn].mTeardown = function() {
    delete MockActivityPicker[fn].called;
    delete MockActivityPicker[fn].calledWith;
  };
});
