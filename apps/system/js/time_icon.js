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
    this.timeFormatter = new Intl.DateTimeFormat(navigator.languages, {
      hour12: navigator.mozHour12,
      hour: 'numeric',
      minute: 'numeric'
    });

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

    if (this.timeFormatter.resolvedOptions().hour12 === true) {
      var timeParts = this.timeFormatter.formatToParts(now);
      timeText = timeParts.map(({type, value}) => {
        switch (type) {
          case 'dayPeriod':
            if (this.manager._ampm) {
              return `<span>${value}</span>`;
            }
            return '';
          default: return value;
        }
      }).reduce((string, part) => string + part, '');
    } else {
      timeText = this.timeFormatter.format(now);
    }
    this.element.innerHTML = timeText;

    Service.request('OperatorIcon:update', now);
    this.publish('changed');
  };
  exports.TimeIcon = TimeIcon;
}(window));
