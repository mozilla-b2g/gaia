/* global BaseIcon */
'use strict';

(function(exports) {
  var AlarmIcon = function(manager) {
    this.manager = manager;
  };
  AlarmIcon.prototype = Object.create(BaseIcon.prototype);
  AlarmIcon.prototype.constructor = AlarmIcon;
  AlarmIcon.OBSERVED_SETTINGS = [
    'alarm.enabled'
  ];
  AlarmIcon.prototype.CLASS_LIST = 'sb-icon sb-icon-alarm';
  AlarmIcon.prototype.l10nId = 'statusbarAlarm';
  AlarmIcon.prototype.instanceID = 'statusbar-alarm';
  AlarmIcon.prototype.update = function() {
    var icon = this.element;
    this._setting['alarm.enabled'] ? this.show() : this.hide();
  };
  exports.AlarmIcon = AlarmIcon;
}(window));
