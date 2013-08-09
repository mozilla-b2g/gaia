'use strict';


var MockActivityPicker = {};


[
 'email', 'dial', 'url',
 'createNewContact', 'addToExistingContact',
 'sendMessage'
].forEach(function(fn) {
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
