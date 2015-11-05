/* global BaseIcon, Clock, Service, mozIntl */
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
    if (this.manager._ampm) {
      this.timeFormatter = new mozIntl.DateTimeFormat(navigator.languages, {
        hour12: navigator.mozHour12,
        hour: 'numeric',
        minute: 'numeric'
      });
    } else {
      this.timeFormatter = new mozIntl.DateTimeFormat(navigator.languages, {
        hour12: navigator.mozHour12,
        dayperiod: false,
        hour: 'numeric',
        minute: 'numeric'
      });
    }

    this.clock.start(this.update.bind(this));
  };
  TimeIcon.prototype._stop = function() {
    this.clock.stop();
  };

  TimeIcon.prototype.view = function view() {
    return `<div id="statusbar-time"
              class="sb-icon-time" role="listitem">
            </div>`;
  };

  TimeIcon.prototype.update = function(now) {
    if (!this.element) {
      return;
    }
    this.manager.active ? this.show() : this.hide();
    now = now || new Date();

    var timeText;

    if (this.manager._ampm &&
        this.timeFormatter.resolvedOptions().hour12 === true) {
      timeText = this.timeFormatter.format(now, {
        dayperiod: '<span>$&</span>'
      });
    } else {
      timeText = this.timeFormatter.format(now);
    }
    this.element.innerHTML = timeText;

    Service.request('OperatorIcon:update', now);
    this.publish('changed');
  };
  exports.TimeIcon = TimeIcon;
}(window));
