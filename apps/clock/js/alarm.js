'use strict';

var _ = navigator.mozL10n.get;
var SETTINGS_CLOCKMODE = 'settings_clockoptions_mode';

var ClockView = {
  _clockMode: null, /* is read from settings */

  _analogGestureDetector: null,
  _digitalGestureDetector: null,

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

    document.addEventListener('mozvisibilitychange', this);

    this.updateDaydate();
    this.initClockface();
  },

  initClockface: function cv_initClockface() {
    var self = this;

    this._analogGestureDetector = new GestureDetector(this.analogClock);
    this.analogClock.addEventListener('tap', this);

    this._digitalGestureDetector = new GestureDetector(this.digitalClock);
    this.digitalClock.addEventListener('tap', this);

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
    var time = getLocaleTime(d);
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
      case 'mozvisibilitychange':
        if (document.mozHidden) {
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
        } else if (!document.mozHidden) {
          // Refresh the view when app return to foreground.
          this.updateDaydate();
          if (this._clockMode === 'digital') {
            this.updateDigitalClock();
          } else if (this._clockMode === 'analog') {
            this.updateAnalogClock();
          }
        }
        break;

      case 'tap':
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
    this._analogGestureDetector.startDetecting();
    this._digitalGestureDetector.stopDetecting();
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
    this._digitalGestureDetector.startDetecting();
    this._analogGestureDetector.stopDetecting();
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

var BannerView = {

  _remainHours: 0,
  _remainMinutes: 0,

  get bannerCountdown() {
    delete this.bannerCountdown;
    return this.bannerCountdown = document.getElementById('banner-countdown');
  },

  init: function BV_init() {
    this.bannerCountdown.addEventListener('click', this);
  },

  handleEvent: function al_handleEvent(evt) {
    this.hideBannerStatus();
  },

  calRemainTime: function BV_calRemainTime(targetTime) {
    var now = new Date();
    var remainTime = targetTime.getTime() - now.getTime();
    this._remainHours = Math.floor(remainTime / (60 * 60 * 1000)); // per hour
    this._remainMinutes = Math.floor((remainTime / (60 * 1000)) -
                          (this._remainHours * 60)); // per minute
  },

  setStatus: function BV_setStatus(nextAlarmFireTime) {
    this.calRemainTime(nextAlarmFireTime);

    var innerHTML = '';
    if (this._remainHours === 0) {
      innerHTML = _('countdown-lessThanAnHour', {
        minutes: _('nMinutes', { n: this._remainMinutes })
      });
    } else if (this._remainHours < 24) {
      innerHTML = _('countdown-moreThanAnHour', {
        hours: _('nHours', { n: this._remainHours }),
        minutes: _('nRemainMinutes', { n: this._remainMinutes })
      });
    } else {
      var remainDays = Math.floor(this._remainHours / 24);
      var remainHours = this._remainHours - (remainDays * 24);
      innerHTML = _('countdown-moreThanADay', {
        days: _('nRemainDays', { n: remainDays }),
        hours: _('nRemainHours', { n: remainHours })
      });
    }
    this.bannerCountdown.innerHTML = '<p>' + innerHTML + '</p>';

    this.showBannerStatus();
    var self = this;
    window.setTimeout(function cv_hideBannerTimeout() {
      self.setBannerStatus(false);
    }, 4000);
  },

  setBannerStatus: function BV_setBannerStatus(visible) {
    if (visible) {
      this.bannerCountdown.classList.add('visible');
    } else {
      this.bannerCountdown.classList.remove('visible');
    }
  },

  showBannerStatus: function BV_showBannerStatus() {
    this.setBannerStatus(true);
  },

  hideBannerStatus: function BV_hideBannerStatus() {
    this.setBannerStatus(false);
  }
};

var AlarmList = {

  alarmList: [],
  refreshingAlarms: [],
  _previousAlarmCount: 0,

  get alarms() {
    delete this.alarms;
    return this.alarms = document.getElementById('alarms');
  },

  get title() {
    delete this.title;
    return this.title = document.getElementById('alarms-title');
  },

  get newAlarmButton() {
    delete this.newAlarmButton;
    return this.newAlarmButton = document.getElementById('alarm-new');
  },

  handleEvent: function al_handleEvent(evt) {

    var link = evt.target;
    if (!link)
      return;

    if (link === this.newAlarmButton) {
      ClockView.hide();
      this.alarmEditView();
    } else if (link.classList.contains('input-enable')) {
      this.toggleAlarmEnableState(link.checked,
        this.getAlarmFromList(parseInt(link.dataset.id, 10)));
    } else if (link.classList.contains('alarm-item')) {
      ClockView.hide();
      this.alarmEditView(this.getAlarmFromList(
        parseInt(link.dataset.id, 10)));
    }
  },

  alarmEditView: function(alarm) {
    LazyLoader.load('js/alarm_edit.js', function() {
      AlarmEdit.load(alarm);
    });
  },

  init: function al_init() {
    this.newAlarmButton.addEventListener('click', this);
    this.alarms.addEventListener('click', this);
    this.refresh();
    AlarmManager.regUpdateAlarmEnableState(this.refreshItem.bind(this));
  },

  refresh: function al_refresh() {
    var self = this;
    AlarmManager.getAlarmList(function al_gotAlarmList(list) {
      self.fillList(list);
    });
  },

  buildAlarmContent: function al_buildAlarmContent(alarm) {
    var summaryRepeat =
      (alarm.repeat === '0000000') ? '' : summarizeDaysOfWeek(alarm.repeat);
    var isChecked = alarm.enabled ? ' checked="true"' : '';
    var d = new Date();
    d.setHours(alarm.hour);
    d.setMinutes(alarm.minute);
    var time = getLocaleTime(d);
    var label = (alarm.label === '') ? _('alarm') : escapeHTML(alarm.label);
    return '<label class="alarmList alarmEnable">' +
           '  <input class="input-enable"' +
                 '" data-id="' + alarm.id +
                 '" type="checkbox"' + isChecked + '>' +
           '  <span></span>' +
           '</label>' +
           '<a href="#alarm" class="alarm-item" data-id="' + alarm.id + '">' +
           '  <span class="time">' +
                time.t + '<span class="period">' + time.p + '</span>' +
           '  </span>' +
           '  <span class="label">' + label + '</span>' +
           '  <span class="repeat">' + summaryRepeat + '</span>' +
           '</a>';
  },


  refreshItem: function al_refreshItem(alarm) {
    this.setAlarmFromList(alarm.id, alarm);
    var id = 'a[data-id="' + alarm.id + '"]';
    var alarmItem = this.alarms.querySelector(id);
    alarmItem.parentNode.innerHTML = this.buildAlarmContent(alarm);
    // clear the refreshing alarm's flag
    var index = this.refreshingAlarms.indexOf(alarm.id);
    this.refreshingAlarms.splice(index, 1);
  },

  fillList: function al_fillList(alarmDataList) {
    this.alarmList = alarmDataList;
    var content = '';

    this.alarms.innerHTML = '';
    alarmDataList.forEach(function al_fillEachList(alarm) {
      var li = document.createElement('li');
      li.className = 'alarm-cell';
      li.innerHTML = this.buildAlarmContent(alarm);
      this.alarms.appendChild(li);
    }.bind(this));

    if (this._previousAlarmCount !== this.getAlarmCount()) {
      this._previousAlarmCount = this.getAlarmCount();
      ClockView.resizeAnalogClock();
    }

  },

  getAlarmFromList: function al_getAlarmFromList(id) {
    for (var i = 0; i < this.alarmList.length; i++) {
      if (this.alarmList[i].id === id)
        return this.alarmList[i];
    }
    return null;
  },

  setAlarmFromList: function al_setAlarmFromList(id, alarm) {
    for (var i = 0; i < this.alarmList.length; i++) {
      if (this.alarmList[i].id === id) {
        this.alarmList[i] = alarm;
        return;
      }
    }
  },

  getAlarmCount: function al_getAlarmCount() {
    return this.alarmList.length;
  },

  toggleAlarmEnableState: function al_toggleAlarmEnableState(enabled, alarm) {
    if (this.refreshingAlarms.indexOf(alarm.id) !== -1) {
      return;
    }

    if (alarm.enabled === enabled)
      return;

    alarm.enabled = enabled;
    this.refreshingAlarms.push(alarm.id);

    var self = this;
    AlarmManager.putAlarm(alarm, function al_putAlarm(alarm) {
      if (!alarm.enabled && !alarm.normalAlarmId && !alarm.snoozeAlarmId) {
        self.refreshItem(alarm);
      } else {
        AlarmManager.toggleAlarm(alarm, alarm.enabled);
      }
    });
  },

  deleteCurrent: function al_deleteCurrent(id) {
    var alarm = this.getAlarmFromList(id);
    var self = this;
    AlarmManager.delete(alarm, function al_deleted() {
      self.refresh();
    });
  }

};

var ActiveAlarmController = {
/*
 * We maintain an alarm's life cycle immediately when the alarm goes off.
 * If user click the snooze button when the alarm goes off,
 * we request a snooze alarm with snoozeAlarmId immediately.
 *
 * If multiple alarms goes off in a period of time(even if in the same time),
 * we always stop the previous notification and handle it by its setting.
 * Such as following case:
 *   An once alarm should be turned off.
 *   A repeat alarm should be requested its next alarm.
 *   A snooze alarm should be turned off.
 */

  _onFireAlarm: {},
  _onFireChildWindow: null,

  init: function am_init() {
    var self = this;
    navigator.mozSetMessageHandler('alarm', function gotMessage(message) {
      self.onAlarmFiredHandler(message);
    });
    AlarmManager.updateAlarmStatusBar();
  },

  onAlarmFiredHandler: function aac_onAlarmFiredHandler(message) {
    // We have to ensure the CPU doesn't sleep during the process of
    // handling alarm message, so that it can be handled on time.
    var cpuWakeLock = navigator.requestWakeLock('cpu');

    // Set a watchdog to avoid locking the CPU wake lock too long,
    // because it'd exhaust the battery quickly which is very bad.
    // This could probably happen if the app failed to launch or
    // handle the alarm message due to any unexpected reasons.
    var unlockCpuWakeLock = function unlockCpuWakeLock() {
      if (cpuWakeLock) {
        cpuWakeLock.unlock();
        cpuWakeLock = null;
      }
    };
    setTimeout(unlockCpuWakeLock, 30000);

    // receive and parse the alarm id from the message
    var id = message.data.id;
    var type = message.data.type;
    // clear the requested id of went off alarm to DB
    var clearAlarmRequestId = function clearAlarmRequestId(alarm, callback) {
      if (type === 'normal') {
        alarm.normalAlarmId = '';
      } else {
        alarm.snoozeAlarmId = '';
      }

      AlarmManager.putAlarm(alarm, function aac_putAlarm(alarmFromDB) {
        // Set the next repeat alarm when nornal alarm goes off.
        if (type === 'normal' && alarmFromDB.repeat !== '0000000' && callback) {
          alarmFromDB.enabled = false;
          callback(alarmFromDB);
        } else {
          // Except repeat alarm, the active alarm should be turned off.
          if (!alarmFromDB.normalAlarmId)
            AlarmList.toggleAlarmEnableState(false, alarmFromDB);
        }
      });
    };

    // set the next repeat alarm
    var setRepeatAlarm = function setRepeatAlarm(alarm) {
      AlarmList.toggleAlarmEnableState(true, alarm);
    };

    // use the alarm id to query db
    // find out which alarm is being fired.
    var self = this;
    AlarmManager.getAlarmById(id, function aac_gotAlarm(alarm) {
      if (!alarm) {
        unlockCpuWakeLock();
        return;
      }
      // clear the requested id of went off alarm to DB
      clearAlarmRequestId(alarm, setRepeatAlarm);

      // If previous active alarm is showing,
      // turn it off and stop its notification
      if (self._onFireChildWindow !== null &&
        typeof self._onFireChildWindow !== 'undefined' &&
        !self._onFireChildWindow.closed) {
          if (self._onFireChildWindow.RingView) {
            self._onFireChildWindow.RingView.stopAlarmNotification();
          }
        }

      // prepare to pop out attention screen, ring the ringtone, vibrate
      self._onFireAlarm = alarm;
      var protocol = window.location.protocol;
      var host = window.location.host;
      self._onFireChildWindow =
        window.open(protocol + '//' + host + '/onring.html',
                    'ring_screen', 'attention');
      self._onFireChildWindow.onload = function childWindowLoaded() {
        unlockCpuWakeLock();
      };

    });
    AlarmManager.updateAlarmStatusBar();
  },

  snoozeHandler: function aac_snoozeHandler() {
    var id = this._onFireAlarm.id;
    AlarmManager.getAlarmById(id, function aac_gotAlarm(alarm) {
      alarm.enabled = true;
      AlarmManager.putAlarm(alarm, function aac_putAlarm(alarm) {
        AlarmManager.set(alarm, true);  // set a snooze alarm
      });
    });
  },

  getOnFireAlarm: function aac_getOnFireAlarm() {
    return this._onFireAlarm;
  }

};
