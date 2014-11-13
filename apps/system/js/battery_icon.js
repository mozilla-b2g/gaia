/* global System, BaseUI */
'use strict';

(function(exports) {
  var BatteryIcon = function(manager) {
    this.manager = manager;
    this.battery = window.navigator.battery;
  };
  BatteryIcon.prototype = Object.create(BaseUI.prototype);
  BatteryIcon.prototype.constructor = BatteryIcon;
  BatteryIcon.prototype.EVENT_PREFIX = 'batteryicon';
  BatteryIcon.prototype.containerElement = document.getElementById('statusbar');
  BatteryIcon.prototype.view = function() {
    return '<div id="statusbar-battery" class="sb-start-upper sb-icon-label" ' +
            'role="listitem"></div>';
  };
  BatteryIcon.prototype.instanceID = 'statusbar-battery';
  BatteryIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  BatteryIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  BatteryIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  BatteryIcon.prototype.start = function() {
    this.battery.addEventListener('statuschange', this);
    this.battery.addEventListener('chargingchange', this);
    this.battery.addEventListener('levelchange', this);
    this.update();
  };
  BatteryIcon.prototype.stop = function() {
    this.battery.removeEventListener('statuschange', this);
    this.battery.removeEventListener('chargingchange', this);
    this.battery.removeEventListener('levelchange', this);
  };
  BatteryIcon.prototype.handleEvent = function() {
    this.update();
  };
  BatteryIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  BatteryIcon.prototype.update = function() {
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

      this.cloneStatusbar();
    }
    this.manager._updateIconVisibility();
  };
  exports.BatteryIcon = BatteryIcon;
}(window));
