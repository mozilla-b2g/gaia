/* global define */
define(function() {
  'use strict';

  var allSettings = {};
  var settingsObservers = {};

  return {
    createLock: function() {
      return {
        get: function(key) {
          var ret = { onsuccess: null, result: {} };
          setTimeout(function() {
            ret.result[key] = allSettings[key];
            ret.onsuccess && ret.onsuccess();
          });
          return ret;
        },
        set: function(settings) {
          var ret = { onsuccess: null };
          /* jshint loopfunc:true */
          for (var key in settings) {
            allSettings[key] = settings[key];
            var listeners = settingsObservers[key];
            if (listeners) {
              listeners.forEach(function(cb) {
                cb({ settingValue: settings[key] });
              });
            }
          }
          setTimeout(function() {
            ret.onsuccess && ret.onsuccess();
          });
          return ret;
        }
      };
    },

    addObserver: function(key, cb) {
      var listeners = settingsObservers[key] || [];
      listeners.push(cb);
      settingsObservers[key] = listeners;
    },
  };
});
