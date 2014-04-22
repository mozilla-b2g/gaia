/* global define */
/* SettingsListener mock for AMD panel */
define(function() {
  'use strict';

  var ctor = {
    observe: function sl_observe(namekey, arg, callback) {
      callback(namekey);
    }
  };

  return ctor;
});
