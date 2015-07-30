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

  TimeIcon.prototype.render = function() {
    if (!this.rendered) {
      BaseIcon.prototype.render.apply(this);
      this.rendered = true;
    }
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

    var timeText = this.timeFormatter.format(now);

    if (this.timeFormatter.resolvedOptions().hour12 === true) {
      // this is a non-standard, Gecko only API, but we have
      // no other way to get the am/pm portion of the date to wrap it in
      // a <span/> element.
      var amPm = now.toLocaleFormat('%p');
      if (this.manager._ampm) {
        timeText = timeText.replace(amPm, '<span>$&</span>');
      } else {
        timeText = timeText.replace(amPm, '').trim();
      }
    }
    this.element.innerHTML = timeText;

    Service.request('OperatorIcon:update', now);
    this.publish('changed');
  };
  exports.TimeIcon = TimeIcon;
}(window));
