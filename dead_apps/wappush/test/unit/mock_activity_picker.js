/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MockActivityPicker = {};

[
 'url'
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
