/**
 * The battery panel displays battery information provided by Battery.
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Battery = require('modules/battery');

  return function ctor_battery_panel() {
    var _batteryLevelText = null;
    var _refreshText = function() {
      navigator.mozL10n.localize(_batteryLevelText,
                                 'batteryLevel-percent-' + Battery.state,
                                 { level: Battery.level });
    };

    return SettingsPanel({
      onInit: function bp_onInit(rootElement) {
        _batteryLevelText = rootElement.querySelector('#battery-level *');
      },
      onBeforeShow: function bp_onBeforeShow(rootElement) {
        var promise = new Promise(function(resolve, reject) {
          Battery.observe('level', _refreshText);
          Battery.observe('state', _refreshText);
          _refreshText();

          setTimeout(function() {
            resolve();
          }, 5000);
        });

        return promise;
      },
      onBeforeHide: function bp_onBeforeHide() {
        Battery.unobserve(_refreshText);
      }
    });
  };
});
