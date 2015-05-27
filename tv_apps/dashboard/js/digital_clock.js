'use strict';

(function (exports) {

  function DigitalClock () {
    this.date = null;

    this.timeoutId = null;
    this.intervalId = null;

    this.elements = {
      'hours-tens-digit': document.getElementById('hours-tens-digit'),
      'hours-units-digit': document.getElementById('hours-units-digit'),
      'minutes-tens-digit': document.getElementById('minutes-tens-digit'),
      'minutes-units-digit': document.getElementById('minutes-units-digit'),
      'seconds-tens-digit': document.getElementById('seconds-tens-digit'),
      'seconds-units-digit': document.getElementById('seconds-units-digit'),
      'today': document.getElementById('today-is')
    };
  }

  DigitalClock.prototype = {

    init: function () {
      this._initTime(new Date());
    },

    start: function () {
      this._start(this._update.bind(this));
    },

    stop: function () {
      if (this.timeoutId) {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      if (this.intervalId) {
        window.clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },

    /**
     * Start ticking the clock.
     * @param  {Function} refresh A callback to run on every tick.
     */
    _start: function (refresh) {
      var now = new Date();

      this.timeoutId = setTimeout(function () {
        refresh(new Date());

        this.intervalId = setInterval(function () {
          refresh(new Date());
        }, 1000);
      }.bind(this), 1000 - now.getMilliseconds());
    },

    /**
     * Init the time of the clock.
     */
    _initTime: function (date) {
      var hours = date.getHours();
      var minutes = date.getMinutes();
      var seconds = date.getSeconds();

      this.elements['hours-tens-digit'].textContent = Math.floor(hours / 10);
      this.elements['hours-units-digit'].textContent = hours % 10;
      this.elements['minutes-tens-digit'].textContent =
        Math.floor(minutes / 10);
      this.elements['minutes-units-digit'].textContent = minutes % 10;
      this.elements['seconds-tens-digit'].textContent =
        Math.floor(seconds / 10);
      this.elements['seconds-units-digit'].textContent = seconds % 10;

      this._changeDate(date);

      this.date = date;
    },

    /**
     * Update the display date and time.
     * @param  {Date} date The Date to be displayed.
     */
    _update: function (date) {
      var hours = date.getHours();
      var minutes = date.getMinutes();
      var seconds = date.getSeconds();

      if (this.date.getHours() !== hours) {
        this._changeTime('hours', this.date.getHours(), hours);
      }

      if (this.date.getMinutes() !== minutes) {
        this._changeTime('minutes', this.date.getMinutes(), minutes);
      }

      this._changeTime('seconds', this.date.getSeconds(), seconds);

      if (this.date.getDate() !== date.getDate()) {
        this._changeDate(date);
      }
      this.date = date;
    },

    _changeTime: function(unit, oldValue, newValue) {
      if (Math.floor(oldValue / 10) !== Math.floor(newValue / 10)) {
        this._changeDigit(unit + '-tens-digit', Math.floor(newValue / 10));
      }
      this._changeDigit(unit + '-units-digit', newValue % 10);
    },

    /**
     * Change the specified digit and handle the changing animations.
     * @param  {String} position The position of the element.
     * @param  {Number} digit    The number to be changed to.
     */
    _changeDigit: function (position, digit) {
      // TODO: handle animations
      this.elements[position].textContent = digit;
    },

    /**
     * Change the display date using mozL10n.
     * @param  {[Date} date The date to be displayed.
     */
    _changeDate: function (date) {
      navigator.mozL10n.ready(function() {
        var dateTimeFormat = new navigator.mozL10n.DateTimeFormat();
        var format = navigator.mozL10n.get('dateFormat');
        var formatted = dateTimeFormat.localeFormat(date, format);
        this.elements.today.dataset.l10nArgs =
          JSON.stringify({ 'date': formatted });
      }.bind(this));
    }

  };

  exports.DigitalClock = DigitalClock;

})(window);
