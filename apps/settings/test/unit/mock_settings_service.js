/* global define */
define(function(require) {
  'use strict';
  var MockSettingsService = {
    _cachedNavigation: [],
    navigate: function(panelId, options) {
      this._cachedNavigation.push({
        panelId: panelId,
        options: options
      });
    }
  };

  return MockSettingsService;
});
