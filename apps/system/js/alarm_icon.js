/* global System, BaseUI */
'use strict';

(function(exports) {
  var AlarmIcon = function(manager) {
    this.manager = manager;
  };
  AlarmIcon.prototype = Object.create(BaseUI.prototype);
  AlarmIcon.prototype.constructor = AlarmIcon;
  AlarmIcon.prototype.EVENT_PREFIX = 'AlarmIcon';
  AlarmIcon.prototype.containerElement = document.getElementById('statusbar');
  AlarmIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-alarm" hidden ' +
            'role="listitem" data-l10n-id="statusbarAlarm"></div>';
  };
  AlarmIcon.prototype.instanceID = 'statusbar-alarm';
  AlarmIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  AlarmIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  AlarmIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  AlarmIcon.prototype.start = function() {
    System.request('addObserver', 'alarm.enabled', this);
  };
  AlarmIcon.prototype.stop = function() {
    System.request('removeObserver', 'alarm.enabled', this);
  };
  AlarmIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  AlarmIcon.prototype.observe = function() {
    this._setting[key] = value;
    this.update();
  };
  AlarmIcon.prototype.update = function() {
    var icon = this.element;
    this._setting['alarm.enabled'] ? this.show() : this.hide();
    this.manager._updateIconVisibility();
  };
  exports.AlarmIcon = AlarmIcon;
}(window));
