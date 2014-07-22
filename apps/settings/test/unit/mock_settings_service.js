/* global define */
define(function() {
  'use strict';
  var MockSettingsService = {
    navigate: function(panelId, options, callback) {
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }
  };

  return MockSettingsService;
});
