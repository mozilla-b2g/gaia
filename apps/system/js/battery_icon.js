/* global BaseIcon */
'use strict';

(function(exports) {
  var BatteryIcon = function() {};
  BatteryIcon.prototype = Object.create(BaseIcon.prototype);
  BatteryIcon.prototype.name = 'BatteryIcon';
  BatteryIcon.prototype.determine = function() {
    return this.manager;
  };
  BatteryIcon.prototype.updateLevel = function() {
    var battery = this.manager.battery;
    var icon = this.element;
    var previousLevel = parseInt(icon.dataset.level, 10);
    var previousCharging = icon.dataset.charging === 'true';

    icon.dataset.charging = battery.charging;
    var level = Math.floor(battery.level * 10) * 10;

    if (previousLevel !== level || previousCharging !== battery.charging) {
      icon.dataset.level = level;
      navigator.mozL10n.setAttributes(
        icon,
        battery.charging ? 'statusbarBatteryCharging' : 'statusbarBattery',
        {level: level}
      );
      this.previousCharging = battery.charging;
    }
  };
  exports.BatteryIcon = BatteryIcon;
}(window));
