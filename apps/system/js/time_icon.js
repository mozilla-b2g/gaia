/* global System, BaseUI */
'use strict';

(function(exports) {
  var TimeIcon = function(manager) {
    this.manager = manager;
    this.clock = new Clock();
  };
  TimeIcon.prototype = Object.create(BaseIcon.prototype);
  TimeIcon.prototype.name = 'TimeIcon';
  TimeIcon.prototype._start = function() {
    this.toggle(true);
  };
  TimeIcon.prototype._stop = function() {
    this.toggle(false);
  };
  TimeIcon.prototype.toggle = function(enable) {
    var icon = this.element;
    if (enable) {
      this.clock.start(this.update.bind(this));
    } else {
      this.clock.stop();
    }
    enable ? this.show() : this.hide();
  };
  TimeIcon.prototype.update = function() {
    if (!this.element) {
      return;
    }
    now = now || new Date();
    var _ = navigator.mozL10n.get;
    var f = new navigator.mozL10n.DateTimeFormat();

    var timeFormat = window.navigator.mozHour12 ?
      _('shortTimeFormat12') : _('shortTimeFormat24');
    timeFormat = this._getTimeFormat(timeFormat);
    var formatted = f.localeFormat(now, timeFormat);
    this.element.innerHTML = formatted;

    this.manager.labelIcon.updateTime(now);
    this.manager._updateIconVisibility();
  };
  exports.TimeIcon = TimeIcon;
}(window));
