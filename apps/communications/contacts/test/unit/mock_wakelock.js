'use strict';

var MyLocks = {};

var MockWakeLock = function(type) {
  if (MyLocks[type] == true) {
    throw Exception('Already locked');
  }

  MyLocks[type] = true;

  var lock = {
    'unlock': function() {
      MyLocks[type] = false;
    }
  };

  return lock;
};
