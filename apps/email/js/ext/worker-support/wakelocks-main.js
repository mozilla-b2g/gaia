/**
 * The docs for this can be found in `mailapi/wakelocks.js`.
 *
 * This file runs on the main thread, receiving messages sent from a
 * SmartWakeLock instance -> through the router -> to this file.
 */
define(function() {
  'use strict';

  function debug(str) {
    dump('WakeLocks: ' + str + '\n');
  }

  var nextId = 1;
  var locks = {};

  function requestWakeLock(type) {
    var lock = navigator.requestWakeLock(type);
    var id = nextId++;
    locks[id] = lock;
    return id;
  }

  var self = {
    name: 'wakelocks',
    sendMessage: null,
    process: function(uid, cmd, args) {
      debug('process ' + cmd + ' ' + JSON.stringify(args));
      switch (cmd) {
      case 'requestWakeLock':
        var type = args[0];
        self.sendMessage(uid, cmd, [requestWakeLock(type)]);
        break;
      case 'unlock':
        var id = args[0];
        var lock = locks[id];
        if (lock) {
          lock.unlock();
          delete locks[id];
        }
        self.sendMessage(uid, cmd, []);
      }
    }
  };
  return self;
});
