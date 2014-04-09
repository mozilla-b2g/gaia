/**
 * Links the root panel list item with Battery.
 */
require(['modules/battery'], function(Battery) {
  'use strict';

  var l10n = navigator.mozL10n;
  l10n.once(function l10nReady() {
    var batteryDesc = document.getElementById('battery-desc');
    var _refreshText = function() {
      l10n.localize(batteryDesc,
                    'batteryLevel-percent-' + Battery.state,
                    { level: Battery.level });
      if (batteryDesc.hidden) {
        batteryDesc.hidden = false;
      }
    };

    Battery.observe('level', _refreshText);
    Battery.observe('state', _refreshText);
    _refreshText();
  });
});
