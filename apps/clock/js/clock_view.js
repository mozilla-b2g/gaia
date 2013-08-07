(function(exports) {
'use strict';

var SETTINGS_CLOCKMODE = 'settings_clockoptions_mode';
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

  get alarmNewBtn() {
    delete this.alarmNewBtn;
    return this.alarmNewBtn = document.getElementById('alarm-new');
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
    var f = new navigator.mozL10n.DateTimeFormat();
    var format = navigator.mozL10n.get('dateFormat');
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

    // Update the SVG clock graphic to show current time
    var now = new Date(); // Current time
    var sec = now.getSeconds(); // Seconds
    var min = now.getMinutes(); // Minutes
    var hour = (now.getHours() % 12) + min / 60; // Fractional hours
    var lastHour = (now.getHours() - 1 % 12) + min / 60;
    // 6 degrees per second
    this.setTransform('secondhand', sec * 6, (sec - 1) * 6);
    // Inverse angle 180 degrees for rect hands
    // 6 degrees per minute
    this.setTransform('minutehand', min * 6 - 180, (min - 1) * 6 - 180);
    // 30 degrees per hour
    this.setTransform('hourhand', hour * 30 - 180, (lastHour) * 30 - 180);

    this.timeouts.analog = setTimeout(
      this.updateAnalogClock.bind(this), 1000 - now.getMilliseconds()
    );
  },

  setTransform: function cv_setTransform(id, angle, from) {
    !this.rotation && (this.rotation = {});
    // Get SVG elements for the hands of the clock
    var hand = document.getElementById(id);
    // Set an SVG attribute on them to move them around the clock face
    if (!this.rotation[id]) {
      this.rotation[id] =
        document.createElementNS('http://www.w3.org/2000/svg',
                                 'animateTransform');
    }
    if (!hand) { return; }

    // In order to repaint once see, i use this trick. See Bug 817993
    var rotate = this.rotation[id];
    // don't repaint unless hand has changed
    if (rotate.getAttribute('to') == angle + ',135,135')
      return;

    rotate.setAttribute('attributeName', 'transform');
    rotate.setAttribute('attributeType', 'xml');
    rotate.setAttribute('type', 'rotate');
    rotate.setAttribute('from', from + ',135,135');
    rotate.setAttribute('to', angle + ',135,135');
    rotate.setAttribute('dur', '0.001s');
    rotate.setAttribute('fill', 'freeze');
    hand.appendChild(rotate);
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
    var type = this.calAnalogClockType(AlarmList.getAlarmCount());
    this.container.className = 'marks' + type;
    document.getElementById('alarms').className = 'count' + type;
  },

  showHideAlarmSetIndicator: function cv_showHideAlarmSetIndicator(enabled) {
    if (enabled) {
      this.hourState.classList.add('alarm-set-indicator');
    } else {
      this.hourState.classList.remove('alarm-set-indicator');
    }
  },

  hide: function cv_hide() {
    setTimeout(function() {
      this.digital.className = '';
      this.analog.className = '';
    }.bind(this), 500);
  },

  show: function cv_show(mode) {
    var isAnalog = false;
    var previous, hiding, showing;

    if (window.location.hash !== 'alarm-view') {
      window.location.hash = 'alarm-view';
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

exports.ClockView = ClockView;

}(this));
