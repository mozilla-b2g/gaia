define(function(require) {
  'use strict';

  var View = require('view');
  var calc = require('calc');
  var dateFormat = require('utils/dateFormat');

  function CurrentTime(options) {
    this._container = options.container;
    this.timespan = options.timespan;
    this._sticky = options.sticky;
  }

  CurrentTime.prototype = {

    _create: function() {
      if (this.element) {
        return;
      }

      this.element = document.createElement('div');
      this.element.classList.add('current-time');
      this._container.appendChild(this.element);
    },

    activate: function() {
      if (!this.timespan.containsNumeric(Date.now())) {
        this._maybeActivateInTheFuture();
        return;
      }

      this._create();
      this.element.classList.add(View.ACTIVE);
      this._tick();
    },

    _maybeActivateInTheFuture: function() {
      var now = Date.now();
      var diff = this.timespan.start - now;
      if (diff >= 0) {
        // if timespan is in the "future" we make sure it will start rendering
        // the current time as soon as it reaches 00:00:00 of the first day
        // inside timespan (eg. current time is 2014-05-22T23:59:50 and user is
        // viewing 2014-05-23 until past midnight)
        this._clearInterval();
        this._interval = setTimeout(this.activate.bind(this), diff);
      }
    },

    deactivate: function() {
      this._clearInterval();
      if (this.element) {
        this.element.classList.remove(View.ACTIVE);
      }
    },

    destroy: function() {
      this.deactivate();
      if (this.element) {
        this._container.removeChild(this.element);
      }
      delete this.element;
      delete this._container;
      delete this._sticky;
      delete this.timespan;
      delete this._previousOverlap;
      delete this._previousHeader;
    },

    _clearInterval: function() {
      if (this._interval) {
        clearTimeout(this._interval);
        this._interval = null;
      }
    },

    _tick: function() {
      this._clearInterval();
      var now = new Date();

      if (!this.timespan.contains(now)) {
        this.deactivate();
        this._unmarkCurrentDay();
        return;
      }
      this._render();

      // will call tick once per minute
      var nextTick = (60 - now.getSeconds()) * 1000;
      this._interval = setTimeout(this._tick.bind(this), nextTick);
    },

    _render: function() {
      var now = new Date();

      this.element.textContent = dateFormat.localeFormat(
        now,
        navigator.mozL10n.get('current-time')
      );

      var hour = now.getHours();
      var elapsedMinutes = (hour * 60) + now.getMinutes();
      var totalMinutes = 24 * 60;
      var percentage = ((elapsedMinutes / totalMinutes) * 100);
      // we limit the position between 0.5-99.5% to avoid cropping the text
      this.element.style.top = Math.max(Math.min(percentage, 99.5), 0.5) + '%';

      this._checkOverlap(hour);
      this._markCurrentDay(now);
    },

    _checkOverlap: function(hour) {
      // we only need to check the current hour (with current design there is
      // no way to overlap previous/next hours)
      var displayHour = this._container.querySelector(
        '.hour-' + hour + ' .display-hour'
      );

      displayHour.classList.toggle('is-hidden', this._intersect(displayHour));

      // just in case last time it checked was against a different hour
      if (this._previousOverlap && this._previousOverlap !== displayHour) {
        this._previousOverlap.classList.remove('is-hidden');
      }

      this._previousOverlap = displayHour;
    },

    _intersect: function(displayHour) {
      var b1 = this.element.getBoundingClientRect();
      var b2 = displayHour.getBoundingClientRect();

      return (
        b1.left <= b2.right &&
        b2.left <= b1.right &&
        b1.top <= b2.bottom &&
        b2.top <= b1.bottom
      );
    },

    _markCurrentDay: function(date) {
      if (!this._sticky) {
        return;
      }

      var day = calc.createDay(date);
      var selector = '.sticky-frame[data-date="' + day +'"] h1';
      var header = this._sticky.querySelector(selector);

      if (header) {
        header.classList.add('is-today');
      }

      if (this._previousHeader !== header) {
        this._unmarkCurrentDay();
      }

      this._previousHeader = header;
    },

    _unmarkCurrentDay: function() {
      if (this._previousHeader) {
        this._previousHeader.classList.remove('is-today');
      }
    }

  };

  return CurrentTime;

});
