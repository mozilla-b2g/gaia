/* global System, BaseUI */
'use strict';

(function(exports) {
  var TimeIcon = function(manager) {
    this.manager = manager;
    this.clock = new Clock();
  };
  TimeIcon.prototype = Object.create(BaseUI.prototype);
  TimeIcon.prototype.constructor = TimeIcon;
  TimeIcon.prototype.EVENT_PREFIX = 'TimeIcon';
  TimeIcon.prototype.containerElement = document.getElementById('statusbar');
  TimeIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon-time" role="listitem"></div>';
  };
  TimeIcon.prototype.instanceID = 'statusbar-time';
  TimeIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  TimeIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  TimeIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  TimeIcon.prototype.start = function() {
    this.updateBind = this.update.bind(this);
    window.addEventListener('moztimechange', this);
    window.addEventListener('timeformatchange', this);
    window.addEventListener('hierarchychanged', this);
    SettingsListener.observe('statusbar.show-am-pm', true, this.updateBind);
  };
  TimeIcon.prototype.stop = function() {
    SettingsListener.unobserve('statusbar.show-am-pm', true, this.updateBind);
    window.removeEventListener('hierarchychanged', this);
    window.removeEventListener('moztimechange', this);
    window.removeEventListener('timeformatchange', this);
  };
  TimeIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  TimeIcon.prototype.handleEvent = function() {
    switch (evt.type) {
      case 'hierarchychanged':
        var win = System.query('getTopMostWindow');
        if ((win.CLASS_NAME === 'SecureWindow' && win.isFullScreen()) ||
             win.CLASS_NAME === 'LockScreenWindow') {
          this.toggle(false);
        } else {
          this.toggle(true);
        }
        break;
      case 'timeformatchange':
      case 'moztimechange':
        navigator.mozL10n.ready((function _updateTime() {
          // To stop clock for reseting the clock interval which runs every 60
          // seconds. The reason to do this is that the time updated will be
          // exactly aligned to minutes which means always getting 0 on seconds
          // part.
          this.toggle(false);
          this.toggle(true);

          // But we still need to consider if we're locked. So may we need to
          // hide it again.
          this.toggle(!System.query('getTopMostWindow').CLASS_NAME === 'LockScreenWindow');
        }).bind(this));
        break;
      case 'mozChromeEvent':
        switch (evt.detail.type) {
          case 'volume-state-changed':
            this.umsActive = evt.detail.active;
            this.update();
            break;
        }
        break;
    }
  };
  TimeIcon.prototype.toggle = function(enable) {
    var icon = this.element;
    if (enable) {
      this.clock.start(this.timeIcon.update.bind(this.timeIcon));
    } else {
      this.clock.stop();
    }
    enable ? this.show() : this.hide();
  };
  TimeIcon.prototype.update = function() {
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
