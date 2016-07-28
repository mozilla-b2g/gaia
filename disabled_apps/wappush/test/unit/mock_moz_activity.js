/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function MockMozActivity(activity) {
  MockMozActivity.calls.push(activity);
  MockMozActivity.instances.push(this);

  this.onsuccess = function() {};
  this.onerror = function() {};
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
