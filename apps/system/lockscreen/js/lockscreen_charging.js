'use strict';
(function(exports) {

/**
 * Creates an object used for refreshing the charging string UI element.
 * @class  LockScreenChargingStatus
 */
function LockScreenChargingStatus() {
  this.elements = {
    charging: document.getElementById('lockscreen-charging')
  };
}

LockScreenChargingStatus.listenEvents = [
  'chargingchange',
  'levelchange',
  'chargingtimechange'
];

LockScreenChargingStatus.prototype.start = function cs_start() {
  this.refresh();

  LockScreenChargingStatus.listenEvents.forEach(
    ename => navigator.battery.addEventListener(ename, this));
};

LockScreenChargingStatus.prototype.stop = function cs_stop() {
  LockScreenChargingStatus.listenEvents.forEach(
    ename => navigator.battery.removeEventListener(ename, this));
};

LockScreenChargingStatus.prototype.handleEvent = function cs_handleEvent(evt) {
  this.refresh();
};

LockScreenChargingStatus.prototype.refresh = function cs_refresh() {

  if (!navigator.battery.charging) {
    if (!this.elements.charging.hasAttribute('hidden')) {
      this.elements.charging.setAttribute('hidden', '');
    }
    return;
  }

  var l10nAttrs = {
    id: null,
    args: {
      level: parseInt(navigator.battery.level * 100)
    }
  };

  var chargingTime = navigator.battery.chargingTime;

  if (chargingTime === Infinity ||
      chargingTime < 60) { // less than a minute remaining
    l10nAttrs.id = 'charging-no-time';
  } else {
    var timeLeft = new Date(0, 0, 0, 0, 0, chargingTime);
    l10nAttrs.args.hours = timeLeft.getHours();
    l10nAttrs.args.minutes = timeLeft.getMinutes();

    if (l10nAttrs.args.hours > 0) {
      l10nAttrs.id = 'charging-hours';
    } else {
      l10nAttrs.id = 'charging-minutes';
    }
  }

  navigator.mozL10n.setAttributes(this.elements.charging,
    l10nAttrs.id, l10nAttrs.args);

  if (this.elements.charging.hasAttribute('hidden')) {
    this.elements.charging.removeAttribute('hidden');
  }
};

/** @exports LockScreenChargingStatus */
exports.LockScreenChargingStatus = LockScreenChargingStatus;

})(window);
