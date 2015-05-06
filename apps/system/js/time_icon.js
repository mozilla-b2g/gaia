/* global BaseIcon, Clock, Service */
'use strict';

(function(exports) {
  var TimeIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  TimeIcon.prototype = Object.create(BaseIcon.prototype);
  TimeIcon.prototype.name = 'TimeIcon';
  TimeIcon.prototype._start = function() {
    if (!this.clock) {
      this.clock = new Clock();
    }
    this.clock.start(this.update.bind(this));
  };
  TimeIcon.prototype._stop = function() {
    this.clock.stop();
  };
  TimeIcon.prototype._getTimeFormat = function(timeFormat) {
    if (this.manager._ampm) {
      timeFormat = timeFormat.replace('%p', '<span>%p</span>');
    } else {
      timeFormat = timeFormat.replace('%p', '').trim();
    }

    return timeFormat;
  };
  TimeIcon.prototype.update = function(now) {
    if (!this.element) {
      return;
    }
    this.manager.active ? this.show() : this.hide();
    now = now || new Date();
    var _ = navigator.mozL10n.get;
    var f = new navigator.mozL10n.DateTimeFormat();

    var timeFormat = window.navigator.mozHour12 ?
      _('shortTimeFormat12') : _('shortTimeFormat24');
    timeFormat = this._getTimeFormat(timeFormat);
    var formatted = f.localeFormat(now, timeFormat);
    this.element.innerHTML = formatted;

    Service.request('OperatorIcon:update', now);
    this.publish('changed');
  };
  exports.TimeIcon = TimeIcon;
}(window));
