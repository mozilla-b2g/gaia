/**
 * The battery panel displays battery information provided by Battery.
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Battery = require('modules/battery');

  return function ctor_battery_panel() {
    var _batteryLevelText = null;
    var _batteryTimeText = null;
    var _getBatteryTimeL10n = function(type) {
      type = type === 'charging' ? 'charging': 'discharging';

      var time = Battery[type + 'Time'];
      var l10nAttrs = {
        id: 'battery-' + type + '-calculating',
        args: {}
      };

      if (time !== Infinity && time > 0) {
        var timeLeft = new Date(0, 0, 0, 0, 0, time);
        l10nAttrs.args.hours = timeLeft.getHours();
        l10nAttrs.args.minutes = timeLeft.getMinutes();

        if (l10nAttrs.args.hours > 0) {
          l10nAttrs.id = 'battery-' + type + '-hours';
        } else {
          l10nAttrs.id = 'battery-' + type + '-minutes';
        }
      } else if (time !== Infinity && time === 0) {
        l10nAttrs.id = 'battery-' + type + '-complete';
      }

      return l10nAttrs;
    };
    var _refreshText = function() {
      navigator.mozL10n.setAttributes(_batteryLevelText,
        'battery-current-level', { level: Battery.level });

      if (Battery.state === 'unplugged') {
        var l10nDischarging = _getBatteryTimeL10n('discharging');
        navigator.mozL10n.setAttributes(_batteryTimeText,
          l10nDischarging.id, l10nDischarging.args);
      }
      else {
        var l10nCharging = _getBatteryTimeL10n('charging');
        navigator.mozL10n.setAttributes(_batteryTimeText,
          l10nCharging.id, l10nCharging.args);
      }
    };

    return SettingsPanel({
      onInit: function bp_onInit(rootElement) {
        _batteryLevelText = rootElement.querySelector(
          '#battery-level');
        _batteryTimeText = rootElement.querySelector(
          '#battery-time');
      },
      onBeforeShow: function bp_onBeforeShow(rootElement) {
        Battery.observe('level', _refreshText);
        Battery.observe('state', _refreshText);
        Battery.observe('chargingTime', _refreshText);
        Battery.observe('dischargingTime', _refreshText);
        _refreshText();
      },
      onBeforeHide: function bp_onBeforeHide() {
        Battery.unobserve(_refreshText);
      }
    });
  };
});
