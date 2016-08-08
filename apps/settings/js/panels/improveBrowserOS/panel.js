define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');

  return function ctor_improveBrowserOS() {
    return SettingsPanel({
      onInit: function(panel) {
        var appUsage = panel.querySelector('#appUsageByRegion');
        var addingText = document.getElementById('sendReport-desc');
        appUsage.addEventListener('click', this._openAppUsage.bind(this));
        SettingsListener.observe('app.reportCrashes', 'ask',
            function handleCrashSetting(value) {
              addingText.setAttribute('data-l10n-id', value.concat('SendReport'));
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
