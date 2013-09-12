define(function(require) {
'use strict';

var asyncStorage = require('shared/js/async_storage');
var AlarmList = require('alarm_list');
var Utils = require('utils');
var SETTINGS_CLOCKMODE = 'settings_clockoptions_mode';
var mozL10n = require('l10n');
var viewMode = null;

// Retrieve stored view mode data as early as possible.
asyncStorage.getItem(SETTINGS_CLOCKMODE, function(value) {

  // If no value has been stored, don't update
  // the viewMode closure.
  if (value === null) {
    return;
  }
  // If the ClockView hasn't initialized yet,
  // and the stored value is different from
  // the arbitrarily chosen default view (analog)
  // then update the viewMode closure.
  if (!ClockView.isInitialized && viewMode !== value) {
    viewMode = value;
  }
});

var ClockView = {
  get mode() {
    // Closure value, stored in settings,
    // or the default (analog)
    return viewMode;
  },

  set mode(value) {
    // If the `mode` is being updated to a new value:
    //
    //    - Update the viewMode closure
    //    - Store the new value in persistent data storage
    //
    // Always return `value`
    if (viewMode !== value) {
      viewMode = value;
      asyncStorage.setItem(
        SETTINGS_CLOCKMODE, value
      );
    }
    return viewMode;
  },

  timeouts: {
    analog: null,
    dayDate: null,
    digital: null
  },

  get digital() {
    delete this.digital;
    return this.digital = document.getElementById('digital-clock');
  },

  get analog() {
    delete this.analog;
    return this.analog = document.getElementById('analog-clock');
  },

  get time() {
    delete this.time;
    return this.time = document.getElementById('clock-time');
  },

  get hourState() {
    delete this.hourState;
    return this.hourState = document.getElementById('clock-hour24-state');
  },

  get dayDate() {
    delete this.dayDate;
    return this.dayDate = document.getElementById('clock-day-date');
  },

  get container() {
    delete this.container;
    return this.container =
      document.getElementById('analog-clock-container');
  },
  isInitialized: false,

  init: function cv_init() {
    var handler = this.handleEvent.bind(this);

    document.addEventListener('visibilitychange', handler);

    this.analog.addEventListener('click', handler, false);
    this.digital.addEventListener('click', handler, false);
    this.hands = {};
    ['second', 'minute', 'hour'].forEach(function(hand) {
      this.hands[hand] = document.getElementById(hand + 'hand');
    }, this);
    // Kick off the day date display (upper left string)
    this.updateDayDate();

    // If the attempt to request and set the viewMode
    // closure early has failed to respond before the
    // call to ClockView.init(), make an async request,
    // passing the response value as an argument to this.show()
    if (this.mode === null) {
      asyncStorage.getItem(
        SETTINGS_CLOCKMODE, this.show.bind(this)
      );
    } else {
      // Display the clock face
      this.show();
    }

    this.isInitialized = true;
  },

  updateDayDate: function cv_updateDayDate() {
    var d = new Date();
    var f = new mozL10n.DateTimeFormat();
    var format = mozL10n.get('dateFormat');
    var formated = f.localeFormat(d, format);
    var remainMillisecond = (24 - d.getHours()) * 3600 * 1000 -
                            d.getMinutes() * 60 * 1000 -
                            d.getMilliseconds();

    this.dayDate.innerHTML = formated.replace(/([0-9]+)/, '<b>$1</b>');

    this.timeouts.dayDate = setTimeout(
      this.updateDayDate.bind(this), remainMillisecond
    );
  },

  update: function cv_update(opts) {
    opts = opts || {};

    if (this.mode === 'digital') {
      this.updateDigitalClock(opts);
    } else {
      this.updateAnalogClock(opts);
    }
  },

  updateDigitalClock: function cv_updateDigitalClock(opts) {
    opts = opts || {};

    var d = new Date();
    var time = Utils.getLocaleTime(d);
    this.time.textContent = time.t;
    this.hourState.textContent = time.p || '  '; // 2 non-break spaces

    this.timeouts.digital = setTimeout(
      this.updateDigitalClock.bind(this), (60 - d.getSeconds()) * 1000
    );
  },

  updateAnalogClock: function cv_updateAnalogClock(opts) {
    opts = opts || {};

    if (opts.needsResize) {
      this.resizeAnalogClock();
    }
    var now = new Date();
    var sec, min, hour;
    sec = now.getSeconds();
    min = now.getMinutes();
    // hours progress gradually
    hour = (now.getHours() % 12) + min / 60;
    this.setTransform('second', sec);
    this.setTransform('minute', min);
    this.setTransform('hour', hour);
    // update again in one second
    this.timeouts.analog = setTimeout(
      this.updateAnalogClock.bind(this), 1000 - now.getMilliseconds()
    );
  },

  setTransform: function cv_setTransform(id, angle) {
    var hand = this.hands[id];
    // return correct angle for different hands
    function conv(timeFrag) {
      var mult;
      // generate a conformable number to rotate about
      // 30 degrees per hour 6 per second and minute
      mult = id === 'hour' ? 30 : 6;
      // we generate the angle from the fractional sec/min/hour
      return (timeFrag * mult);
    }
    // Use transform rotate on the rect itself vs on a child element
    // avoids unexpected behavior if either dur and fill are set to defaults
    hand.style.transform = 'rotate(' + conv(angle) + 'deg)';
  },

  handleEvent: function cv_handleEvent(event) {
    var newMode, target;

    switch (event.type) {
      case 'visibilitychange':
        if (document.hidden) {
          if (this.timeouts.dayDate) {
            clearTimeout(this.timeouts.dayDate);
          }
          if (this.timeouts.digital) {
            clearTimeout(this.timeouts.digital);
          }
          if (this.timeouts.analog) {
            clearTimeout(this.timeouts.analog);
          }
          return;
        } else if (!document.hidden) {
          // Refresh the view when app return to foreground.
          this.updateDayDate();

          if (this.mode === 'digital') {
            this.updateDigitalClock();
          } else if (this.mode === 'analog') {
            this.updateAnalogClock();
          }
        }
        break;

      case 'click':
        target = event.target;

        if (!target) {
          return;
        }

        if (this.digital.contains(target) ||
            target.id === 'digital-clock') {

          newMode = 'analog';
        }

        if (this.analog.contains(target) ||
            target.id === 'analog-clock') {

          newMode = 'digital';
        }

        if (newMode) {
          this.show(newMode);
        }

        break;
    }
  },

  calAnalogClockType: function cv_calAnalogClockType(count) {
    if (count <= 1) {
      count = 1;
    } else if (count >= 4) {
      count = 4;
    }
    return count;
  },

  resizeAnalogClock: function cv_resizeAnalogClock() {
    var type = this.calAnalogClockType(AlarmList.getAlarmCount() + 1);
    this.container.className = 'marks' + type;
    document.getElementById('alarms').className = 'count' + type;
  },

  show: function cv_show(mode) {
    var isAnalog = false;
    var previous, hiding, showing;

    if (location.hash !== '#alarm-panel') {
      location.hash = '#alarm-panel';
    }

    // The clock display mode is either
    //
    //    - Explicitly passed as the mode param
    //    - Set as a property of ClockView
    //    - Default to "analog"
    //
    mode = mode || this.mode || 'analog';

    isAnalog = mode === 'analog';

    // Determine what to hide and what to show
    previous = isAnalog ? 'digital' : 'analog';
    hiding = isAnalog ? this.digital : this.analog;
    showing = isAnalog ? this.analog : this.digital;

    // Clear any previously created timeouts.
    if (this.timeouts[previous]) {
      clearTimeout(
        this.timeouts[previous]
      );
    }

    hiding.classList.remove('visible');
    showing.classList.add('visible');

    // Update the locally stored `mode`.
    this.mode = mode;

    // This MUST be called after this.mode is set
    // to ensure that the correct mode is used for
    // updating the clockface
    this.update({
      needsResize: true
    });
  }
};

return ClockView;
});
