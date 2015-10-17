define(function(require) {
  'use strict';

  var SettingsCache = require('modules/settings_cache');
  var SettingsPanel = require('modules/settings_panel');

  return function ctor_improveBrowserOS() {
    return SettingsPanel({
      onInit: function(panel) {
        var appUsage = panel.querySelector('#appUsageByRegion');
        var sharePrefDataToggle =
          panel.querySelector('#menuItem-sharePerformanceData gaia-checkbox');

        appUsage.addEventListener('click', this._openAppUsage.bind(this));

        return new Promise(function(resolve) {
          SettingsCache.getSettings((results) => {
            var dogFooding = !!results['debug.performance_data.dogfooding'];
            sharePrefDataToggle.disabled = dogFooding;
            resolve();
          });
        });
      },

      _openAppUsage: function() {
        var activity = new window.MozActivity({
          name: 'marketplace-search',
          data: {
            type: 'firefox-os-app-stats'
          }
        });
        activity.onerror = function() {
          console.log('Error opening app stats page in Marketplace');
        };
      }
    });
  };
});
