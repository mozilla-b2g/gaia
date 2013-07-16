'use strict';

var SETTINGS_CLOCKMODE = 'settings_clockoptions_mode';

var ClockView = {
  _clockMode: null, /* is read from settings */

  get digitalClock() {
    delete this.digitalClock;
    return this.digitalClock = document.getElementById('digital-clock');
  },

  get analogClock() {
    delete this.analogClock;
    return this.analogClock = document.getElementById('analog-clock');
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

  get digitalClockBackground() {
    delete this.digitalClockBackground;
    return this.digitalClockBackground =
      document.getElementById('digital-clock-background');
  },

  init: function cv_init() {
    this.container = document.getElementById('analog-clock-container');

    document.addEventListener('visibilitychange', this);

    this.updateDaydate();
    this.initClockface();
  },

  initClockface: function cv_initClockface() {
    var self = this;

    this.analogClock.addEventListener('touchstart', this);
    this.digitalClock.addEventListener('touchstart', this);

    asyncStorage.getItem(SETTINGS_CLOCKMODE, function(mode) {
      switch (mode) {
        case 'digital':
          self.showDigitalClock();
          break;
        default:
          self.showAnalogClock();
          break;
      }
    });
  },

  updateDaydate: function cv_updateDaydate() {
    var d = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var format = navigator.mozL10n.get('dateFormat');
    var formated = f.localeFormat(d, format);
    this.dayDate.innerHTML = formated.replace(/([0-9]+)/, '<b>$1</b>');

    var self = this;
    var remainMillisecond = (24 - d.getHours()) * 3600 * 1000 -
                            d.getMinutes() * 60 * 1000 -
                            d.getMilliseconds();
    this._updateDaydateTimeout =
    window.setTimeout(function cv_updateDaydateTimeout() {
      self.updateDaydate();
    }, remainMillisecond);
  },

  updateDigitalClock: function cv_updateDigitalClock() {
    var d = new Date();
    var time = Utils.getLocaleTime(d);
    this.time.textContent = time.t;
    this.hourState.textContent = time.p || '  '; // 2 non-break spaces

    var self = this;
    this._updateDigitalClockTimeout =
    window.setTimeout(function cv_updateDigitalClockTimeout() {
      self.updateDigitalClock();
    }, (59 - d.getSeconds()) * 1000);
  },

  updateAnalogClock: function cv_updateAnalogClock() {
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

    // Update the clock again in 1 minute
    var self = this;
    this._updateAnalogClockTimeout =
    window.setTimeout(function cv_updateAnalogClockTimeout() {
      self.updateAnalogClock();
    }, (1000 - now.getMilliseconds()));
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

  handleEvent: function cv_handleEvent(evt) {
    switch (evt.type) {
      case 'visibilitychange':
        if (document.hidden) {
          if (this._updateDaydateTimeout) {
            window.clearTimeout(this._updateDaydateTimeout);
          }
          if (this._updateDigitalClockTimeout) {
            window.clearTimeout(this._updateDigitalClockTimeout);
          }
          if (this._updateAnalogClockTimeout) {
            window.clearTimeout(this._updateAnalogClockTimeout);
          }
          return;
        } else if (!document.hidden) {
          // Refresh the view when app return to foreground.
          this.updateDaydate();
          if (this._clockMode === 'digital') {
            this.updateDigitalClock();
          } else if (this._clockMode === 'analog') {
            this.updateAnalogClock();
          }
        }
        break;

      case 'touchstart':
        var input = evt.target;
        if (!input)
          return;

        switch (input.id) {
          case 'digital-clock-display':
            this.showAnalogClock();
            break;

          case 'analog-clock-svg':
            this.showDigitalClock();
            break;
        }
        break;
    }
  },

  showAnalogClock: function cv_showAnalogClock() {
    if (this._clockMode !== 'analog')
      asyncStorage.setItem(SETTINGS_CLOCKMODE, 'analog');

    if (this._updateDigitalClockTimeout) {
      window.clearTimeout(this._updateDigitalClockTimeout);
    }
    this.digitalClock.classList.remove('visible');
    this.digitalClockBackground.classList.remove('visible');
    this.resizeAnalogClock();
    this.updateAnalogClock();
    this._clockMode = 'analog';
    this.analogClock.classList.add('visible');
  },

  showDigitalClock: function cv_showDigitalClock() {
    if (this._clockMode !== 'digital')
      asyncStorage.setItem(SETTINGS_CLOCKMODE, 'digital');

    if (this._updateDigitalClockTimeout) {
      window.clearTimeout(this._updateAnalogClockTimeout);
    }
    this.analogClock.classList.remove('visible');
    this.updateDigitalClock();
    this._clockMode = 'digital';
    this.digitalClock.classList.add('visible');
    this.digitalClockBackground.classList.add('visible');
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
    var self = this;
    // Set a time out to add a delay so the clock is hidden
    // after the edit mode is shown
    setTimeout(function() {
      self.digitalClock.className = '';
      self.analogClock.className = '';
    }, 500);
  },

  show: function cv_show() {
    window.location.hash = 'alarm-view';
    var self = this;
    self.digitalClock.className = '';
    self.analogClock.className = '';
    if (self._clockMode === 'analog') {
      self.analogClock.className = 'visible';
    } else {
      self.digitalClock.className = 'visible';
    }
  }

};

