'use strict';

var _ = navigator.mozL10n.get;

var ClockView = {

  _clockMode: '', /* digital or analog */

  _analogGestureDetector: null,
  _digitalGestureDetector: null,

  get clockView() {
    delete this.clockView;
    return this.clockView = document.getElementById('clock-view');
  },

  get digitalClock() {
    delete this.digitalClock;
    return this.digitalClock = document.getElementById('digital-clock');
  },

  get analogClock() {
    delete this.analogClock;
    return this.analogClock = document.getElementById('analog-clock');
  },

  get analogClockSVGBody() {
    delete this.analogClockSVGBody;
    return this.analogClockSVGBody =
      document.getElementById('analog-clock-svg-body');
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
    this.updateDaydate();
    this.updateAnalogClock();

    this._clockMode = 'analog';
    this.resizeAnalogClock();
    this.analogClock.classList.add('visible'); /* analog clock is default */
    this.digitalClock.classList.remove('visible');
    this.digitalClockBackground.classList.remove('visible');
    document.addEventListener('mozvisibilitychange', this);

    this._analogGestureDetector = new GestureDetector(this.analogClock);
    this._analogGestureDetector.startDetecting();
    this.analogClock.addEventListener('tap', this);

    this._digitalGestureDetector = new GestureDetector(this.digitalClock);
    this.digitalClock.addEventListener('tap', this);
  },

  updateDaydate: function cv_updateDaydate() {
    var d = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var format = navigator.mozL10n.get('dateFormat');
    this.dayDate.textContent = f.localeFormat(d, format);

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
    this.setTransform('secondhand', sec * 6); // 6 degrees per second
    // Inverse angle 180 degrees for rect hands
    this.setTransform('minutehand', min * 6 - 180); // 6 degrees per minute
    this.setTransform('hourhand', hour * 30 - 180); // 30 degrees per hour

    // Update the clock again in 1 minute
    var self = this;
    this._updateAnalogClockTimeout =
    window.setTimeout(function cv_updateAnalogClockTimeout() {
      self.updateAnalogClock();
    }, (1000 - now.getMilliseconds()));
  },

  setTransform: function cv_setTransform(id, angle) {
    // Get SVG elements for the hands of the clock
    var hand = document.getElementById(id);
    // Set an SVG attribute on them to move them around the clock face
    hand.setAttribute('transform', 'rotate(' + angle + ',0,0)');
  },

  handleEvent: function cv_handleEvent(evt) {
    switch (evt.type) {
      case 'mozvisibilitychange':
        if (document.mozHidden) {
          window.clearTimeout(this._updateDaydateTimeout);
          window.clearTimeout(this._updateDigitalClockTimeout);
          window.clearTimeout(this._updateAnalogClockTimeout);
          return;
        } else if (!document.mozHidden) {
          // Refresh the view when app return to foreground.
          this.updateDaydate();
          if (this._clockMode == 'digital') {
            this.updateDigitalClock();
          } else if (this._clockMode == 'analog') {
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
            window.clearTimeout(this._updateDigitalClockTimeout);
            this.digitalClock.classList.remove('visible');
            this.digitalClockBackground.classList.remove('visible');
            this.updateAnalogClock();
            this._clockMode = 'analog';
            this.analogClock.classList.add('visible');
            this._analogGestureDetector.startDetecting();
            this._digitalGestureDetector.stopDetecting();
            break;

          case 'analog-clock-svg':
            window.clearTimeout(this._updateAnalogClockTimeout);
            this.analogClock.classList.remove('visible');
            this.updateDigitalClock();
            this._clockMode = 'digital';
            this.digitalClock.classList.add('visible');
            this.digitalClockBackground.classList.add('visible');
            this._digitalGestureDetector.startDetecting();
            this._analogGestureDetector.stopDetecting();
            break;
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
    this.resizeAnalogClockBackground();
    // Remove previous style
    for (var i = 1; i <= 4; i++) {
      var oldStyle = 'alarm' + i;
      if (this.analogClockSVGBody.classList.contains(oldStyle))
        this.analogClockSVGBody.classList.remove(oldStyle);
    }
    var type = this.calAnalogClockType(AlarmList.getAlarmCount());
    var newStyle = 'alarm' + type;
    this.analogClockSVGBody.classList.add(newStyle);
  },

  resizeAnalogClockBackground: function cv_resizeAnalogClockBackground() {
    // Disable previous background
    for (var i = 1; i <= 4; i++) {
      var id = 'analog-clock-background-cache' + i;
      var element = document.getElementById(id);
      if (element.classList.contains('visible'))
        element.classList.remove('visible');
    }
    var type = this.calAnalogClockType(AlarmList.getAlarmCount());
    var id = 'analog-clock-background-cache' + type;
    document.getElementById(id).classList.add('visible');
  },

  showHideAlarmSetIndicator: function cv_showHideAlarmSetIndicator(enabled) {
    if (enabled) {
      this.hourState.classList.add('alarm-set-indicator');
    } else {
      this.hourState.classList.remove('alarm-set-indicator');
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
    if (this._remainHours == 0) {
      innerHTML = _('countdown-lessThanAnHour', {
        minutes: _('nMinutes', { n: this._remainMinutes })
      });
    } else {
      innerHTML = _('countdown-moreThanAnHour', {
        hours: _('nRemainHours', { n: this._remainHours }),
        minutes: _('nRemainMinutes', { n: this._remainMinutes })
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
  refreshing: false,
  _previousAlarmCount: 0,

  get alarms() {
    delete this.alarms;
    return this.alarms = document.getElementById('alarms');
  },

  get title() {
    delete this.title;
    return this.title = document.getElementById('alarms-title');
  },

  handleEvent: function al_handleEvent(evt) {
    var link = evt.target;
    var currentTarget = evt.currentTarget;
    if (!link)
      return;

    switch (evt.type) {
      case 'click':
        switch (link.id) {
          case 'alarm-new':
            AlarmEditView.load();
            break;

          case 'input-enable':
            this.updateAlarmEnableState(link.checked,
              this.getAlarmFromList(parseInt(link.dataset.id)));
            break;

          case 'alarm-item':
            AlarmEditView.load(this.getAlarmFromList(
              parseInt(link.dataset.id)));
        }
        break;
    }

  },

  init: function al_init() {
    document.getElementById('alarm-new').addEventListener('click', this);
    this.alarms.addEventListener('click', this);
    this.refresh();
  },

  refresh: function al_refresh() {
    var self = this;
    AlarmsDB.getAlarmList(function al_gotAlarmList(list) {
      self.fillList(list);
    });
  },

  fillList: function al_fillList(alarmDataList) {
    this.alarmList = alarmDataList;
    var content = '';

    alarmDataList.forEach(function al_fillEachList(alarm) {
      var summaryRepeat = summarizeDaysOfWeek(alarm.repeat);
      var paddingTop = (summaryRepeat == 'Never') ? 'paddingTop' : '';
      var hiddenSummary = (summaryRepeat == 'Never') ? 'hiddenSummary' : '';
      var isChecked = alarm.enabled ? ' checked="true"' : '';
      var d = new Date();
      d.setHours(alarm.hour);
      d.setMinutes(alarm.minute);
      var time = getLocaleTime(d);
      content += '<li>' +
                 '  <label class="alarmList">' +
                 '    <input id="input-enable" data-id="' + alarm.id +
                        '" type="checkbox"' + isChecked + '>' +
                 '    <span class="setEnabledBtn"' +
                        ' data-checked="' + _('on') +
                        '" data-unchecked="' + _('off') + '"></span>' +
                 '  </label>' +
                 '  <a href="#alarm" id="alarm-item" data-id="' +
                      alarm.id + '">' +
                 '    <div class="description">' +
                 '      <div class="alarmList-time">' +
                 '        <span class="time">' + time.t + '</span>' +
                 '        <span class="hour24-state">' + time.p + '</span>' +
                 '      </div>' +
                 '      <div class="alarmList-detail">' +
                 '        <div class="label ' + paddingTop + '">' +
                            escapeHTML(alarm.label) + '</div>' +
                 '        <div class="repeat ' + hiddenSummary + '">' +
                            summaryRepeat + '</div>' +
                 '      </div>' +
                 '    </div>' +
                 '  </a>' +
                 '</li>';
    });

    this.alarms.innerHTML = content;
    if (this._previousAlarmCount != this.getAlarmCount()) {
      this._previousAlarmCount = this.getAlarmCount();
      ClockView.resizeAnalogClock();
    }

    this.refreshing = false;
  },

  getAlarmFromList: function al_getAlarmFromList(id) {
    for (var i = 0; i < this.alarmList.length; i++) {
      if (this.alarmList[i].id == id)
        return this.alarmList[i];
    }
    return null;
  },

  getAlarmCount: function al_getAlarmCount() {
    return this.alarmList.length;
  },

  updateAlarmEnableState: function al_updateAlarmEnableState(enabled, alarm) {
    if (this.refreshing)
      return;

    if (alarm.enabled == enabled)
      return;

    alarm.enabled = enabled;
    this.refreshing = true;
    var self = this;
    AlarmsDB.putAlarm(alarm, function al_putAlarmList(alarm) {
      if (!alarm.enabled && !alarm.alarmId) {
        // No need to unset the alarm, just update state button only
        self.refresh();
      } else {
        AlarmManager.setEnabled(alarm, alarm.enabled);
      }
    });
  },

  deleteCurrent: function al_deleteCurrent(id) {
    var alarm = this.getAlarmFromList(id);
    if (alarm.alarmId)
      AlarmManager.setEnabled(alarm, false);

    var self = this;
    AlarmsDB.deleteAlarm(id, function al_deletedAlarm() {
      self.refresh();
    });
  }

};

var AlarmManager = {

  _onFireAlarm: {},

  init: function am_init() {
    var self = this;
    navigator.mozSetMessageHandler('alarm', function gotMessage(message) {
      self.onAlarmFiredHandler(message);
    });
    this.updateAlarmStatusBar();
  },

  setEnabled: function am_setEnabled(alarm, enabled) {
    if (enabled) {
      this.set(alarm);
    } else {
      this.unset(alarm);
    }
  },

  set: function am_set(alarm, bSnooze) {
    // Unset the requested alarm which does not goes off
    this.unset(alarm);

    var nextAlarmFireTime = null;
    if (bSnooze) {
      nextAlarmFireTime = new Date();
      nextAlarmFireTime.setMinutes(nextAlarmFireTime.getMinutes() +
                                   alarm.snooze);
    } else {
      nextAlarmFireTime = getNextAlarmFireTime(alarm);
    }
    var request = navigator.mozAlarms.add(nextAlarmFireTime, 'honorTimezone',
                  { id: alarm.id }); // give the alarm id for the request
    var self = this;
    request.onsuccess = function(e) {
      alarm.alarmId = e.target.result;
      // save the AlarmAPI's request id to DB
      AlarmsDB.putAlarm(alarm, function am_putAlarm(alarm) {
        AlarmList.refresh();
      });
      self.updateAlarmStatusBar();
      BannerView.setStatus(nextAlarmFireTime);
    };
    request.onerror = function(e) {
      var logInfo = bSnooze ? ' snooze' : '';
      console.log('set' + logInfo + ' alarm fail');
    };
  },

  unset: function am_unset(alarm) {
    if (alarm.alarmId) {
      navigator.mozAlarms.remove(alarm.alarmId);
      alarm.alarmId = '';
      // clear the AlarmAPI's request id to DB
      AlarmsDB.putAlarm(alarm, function am_putAlarm(alarm) {
        AlarmList.refresh();
      });
      this.updateAlarmStatusBar();
    }
  },

  onAlarmFiredHandler: function am_onAlarmFiredHandler(message) {
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

    // XXX receive and paser the alarm id from the message
    var id = message.data.id;
    // use the alarm id to query db
    // find out which alarm is being fired.
    var self = this;
    AlarmsDB.getAlarm(id, function am_gotAlarm(alarm) {
      if (!alarm) {
        unlockCpuWakeLock();
        return;
      }
      // clear the requested id of went off alarm to DB
      alarm.alarmId = '';
      AlarmsDB.putAlarm(alarm, function am_putAlarm(alarm) {
        AlarmList.refresh();
      });
      // prepare to pop out attention screen, ring the ringtone, vibrate
      self._onFireAlarm = alarm;
      var protocol = window.location.protocol;
      var host = window.location.host;
      var childWindow = window.open(protocol + '//' + host + '/onring.html',
                                    'ring_screen', 'attention');
      childWindow.onload = function childWindowLoaded() {
        unlockCpuWakeLock();
      };
    });
    this.updateAlarmStatusBar();
  },

  snoozeHandler: function am_snoozeHandler() {
    this.set(this._onFireAlarm, true);
  },

  cancelHandler: function am_cancelHandler() {
    // Check the property of repeat
    if (this._onFireAlarm.repeat == '0000000') { // disable alarm
      AlarmList.updateAlarmEnableState(false, this._onFireAlarm);
    } else { // set the alarm again for next repeat date
      this.set(this._onFireAlarm);
    }
  },

  updateAlarmStatusBar: function am_updateAlarmStatusBar() {
    if (!('mozSettings' in navigator))
      return;

    var request = navigator.mozAlarms.getAll();
    request.onsuccess = function(e) {
      var hasAlarmEnabled = !!e.target.result.length;
      navigator.mozSettings.createLock().set({'alarm.enabled':
          hasAlarmEnabled});
      ClockView.showHideAlarmSetIndicator(hasAlarmEnabled);
    };
    request.onerror = function(e) {
      console.log('get all alarm fail');
    };
  },

  getAlarmLabel: function am_getAlarmLabel() {
    return this._onFireAlarm.label;
  },

  getAlarmSound: function am_getAlarmSound() {
    return this._onFireAlarm.sound;
  }

};

var AlarmEditView = {

  alarm: {},
  timePicker: {
    hour: null,
    minute: null,
    hour24State: null,
    is12hFormat: false
  },

  get element() {
    delete this.element;
    return this.element = document.getElementById('alarm');
  },

  get labelInput() {
    delete this.labelInput;
    return this.labelInput =
      document.querySelector('input[name="alarm.label"]');
  },

  get hourSelector() {
    delete this.hourSelector;
    return this.hourSelector =
      document.getElementById('value-picker-hours');
  },

  get minuteSelector() {
    delete this.minuteSelector;
    return this.minuteSelector =
      document.getElementById('value-picker-minutes');
  },

  get hour24StateSelector() {
    delete this.hour24StateSelector;
    return this.hour24StateSelector =
      document.getElementById('value-picker-hour24-state');
  },

  get alarmTitle() {
    delete this.alarmTitle;
    return this.alarmTitle = document.getElementById('alarm-title');
  },

  get repeatMenu() {
    delete this.repeatMenu;
    return this.repeatMenu = document.getElementById('repeat-menu');
  },

  get repeatSelect() {
    delete this.repeatSelect;
    return this.repeatSelect = document.getElementById('repeat-select');
  },

  get soundMenu() {
    delete this.soundMenu;
    return this.soundMenu = document.getElementById('sound-menu');
  },

  get soundSelect() {
    delete this.soundSelect;
    return this.soundSelect = document.getElementById('sound-select');
  },

  get snoozeMenu() {
    delete this.snoozeMenu;
    return this.snoozeMenu = document.getElementById('snooze-menu');
  },

  get snoozeSelect() {
    delete this.snoozeSelect;
    return this.snoozeSelect = document.getElementById('snooze-select');
  },

  get deleteElement() {
    delete this.deleteElement;
    return this.deleteElement = document.getElementById('alarm-delete');
  },

  get deleteButton() {
    delete this.deleteElement;
    return this.deleteElement = document.getElementById('alarm-delete-button');
  },

  init: function aev_init() {
    document.getElementById('alarm-done').addEventListener('click', this);
    this.repeatMenu.addEventListener('click', this);
    this.repeatSelect.addEventListener('change', this);
    this.soundMenu.addEventListener('click', this);
    this.soundSelect.addEventListener('change', this);
    this.snoozeMenu.addEventListener('click', this);
    this.snoozeSelect.addEventListener('change', this);
    this.deleteButton.addEventListener('click', this);
  },

  initTimePicker: function aev_initTimePicker() {
    var is12h = is12hFormat();
    this.timePicker.is12hFormat = is12h;
    this.setTimePickerStyle();
    var startHour = is12h ? 1 : 0;
    var endHour = is12h ? (startHour + 12) : (startHour + 12 * 2);
    var unitClassName = 'picker-unit';
    var hourDisplayedText = [];
    for (var i = startHour; i < endHour; i++) {
      var value = i;
      hourDisplayedText.push(value);
    }
    var hourUnitStyle = {
      valueDisplayedText: hourDisplayedText,
      className: unitClassName
    };
    this.timePicker.hour = new ValuePicker(this.hourSelector, hourUnitStyle);

    var minuteDisplayedText = [];
    for (var i = 0; i < 60; i++) {
      var value = (i < 10) ? '0' + i : i;
      minuteDisplayedText.push(value);
    }
    var minuteUnitStyle = {
      valueDisplayedText: minuteDisplayedText,
      className: unitClassName
    };
    this.timePicker.minute =
      new ValuePicker(this.minuteSelector, minuteUnitStyle);

    if (is12h) {
      var hour24StateUnitStyle = {
        valueDisplayedText: ['AM', 'PM'],
        className: unitClassName
      };
      this.timePicker.hour24State =
        new ValuePicker(this.hour24StateSelector, hour24StateUnitStyle);
    }
  },

  setTimePickerStyle: function aev_setTimePickerStyle() {
    var style = (this.timePicker.is12hFormat) ? 'format12h' : 'format24h';
    document.getElementById('picker-bar').classList.add(style);
  },

  handleEvent: function aev_handleEvent(evt) {
    var input = evt.target;
    if (!input)
      return;

    switch (input.id) {
      case 'alarm-done':
        if (!this.save()) {
          evt.preventDefault();
          return false;
        }
        break;
      case 'repeat-menu':
        this.repeatSelect.focus();
        break;
      case 'repeat-select':
        switch (evt.type) {
          case 'change':
            this.refreshRepeatMenu(this.getRepeatSelect());
            break;
        }
        break;
      case 'sound-menu':
        this.soundSelect.focus();
        break;
      case 'sound-select':
        switch (evt.type) {
          case 'change':
            this.refreshSoundMenu(this.getSoundSelect());
            break;
        }
        break;
      case 'snooze-menu':
        this.snoozeSelect.focus();
        break;
      case 'snooze-select':
        switch (evt.type) {
          case 'change':
            this.refreshSnoozeMenu(this.getSnoozeSelect());
            break;
        }
        break;
      case 'alarm-delete':
        this.delete();
        break;
    }
  },

  getDefaultAlarm: function aev_getDefaultAlarm() {
    // Reset the required message with default value
    var now = new Date();
    return {
      id: '', // for Alarm APP indexedDB id
      alarmId: '', // for request AlarmAPI id
      label: 'Alarm',
      hour: now.getHours(), // use current hour
      minute: now.getMinutes(), // use current minute
      enabled: true,
      repeat: '0000000',
      sound: 'classic_buzz.ogg',
      snooze: 5,
      color: 'Darkorange'
    };
  },

  load: function aev_load(alarm) {
    if (this.timePicker.hour == null)
      this.initTimePicker();

    if (!alarm) {
      this.alarmTitle.textContent = _('newAlarm');
      alarm = this.getDefaultAlarm();
    } else {
      this.alarmTitle.textContent = _('editAlarm');
    }

    this.alarm = alarm;

    this.element.dataset.id = alarm.id;
    this.labelInput.value = alarm.label;
    // Set the value of time picker according to alarm time.
    if (this.timePicker.is12hFormat) {
      var hour = (alarm.hour % 12);
      hour = (hour == 0) ? 12 : hour;
      // 24-hour state value selector: AM = 0, PM = 1
      var hour24State = (alarm.hour >= 12) ? 1 : 0;
      this.timePicker.hour.setSelectedIndexByDisplayedText(hour);
      this.timePicker.hour24State.setSelectedIndex(hour24State);
    } else {
      this.timePicker.hour.setSelectedIndex(alarm.hour);
    }
    this.timePicker.minute.setSelectedIndex(alarm.minute);
    // Init repeat, sound, snooze selection menu.
    this.initRepeatSelect();
    this.refreshRepeatMenu();
    this.initSoundSelect();
    this.refreshSoundMenu();
    this.initSnoozeSelect();
    this.refreshSnoozeMenu();
    this.deleteButton.hidden = (alarm.id) ? false : true;
  },

  initRepeatSelect: function aev_initRepeatSelect() {
    var daysOfWeek = this.alarm.repeat;
    var options = this.repeatSelect.options;
    for (var i = 0; i < options.length; i++) {
      options[i].selected = (daysOfWeek.substr(i, 1) == '1') ? true : false;
    }
  },

  getRepeatSelect: function aev_getRepeatSelect() {
    var daysOfWeek = '';
    var options = this.repeatSelect.options;
    for (var i = 0; i < options.length; i++) {
      daysOfWeek += (options[i].selected) ? '1' : '0';
    }
    return daysOfWeek;
  },

  refreshRepeatMenu: function aev_refreshRepeatMenu(repeat) {
    var daysOfWeek = (repeat) ? this.getRepeatSelect() : this.alarm.repeat;
    this.repeatMenu.innerHTML = summarizeDaysOfWeek(daysOfWeek);
  },

  initSoundSelect: function aev_initSoundSelect() {
    changeSelectByValue(this.soundSelect, this.alarm.sound);
  },

  getSoundSelect: function aev_getSoundSelect() {
    return getSelectedValue(this.soundSelect);
  },

  refreshSoundMenu: function aev_refreshSoundMenu(sound) {
    // XXX: Refresh and paser the name of sound file for sound menu.
    var sound = (sound) ? this.getSoundSelect() : this.alarm.sound;
    this.soundMenu.innerHTML = _(sound.slice(0, sound.lastIndexOf('.')));
  },

  initSnoozeSelect: function aev_initSnoozeSelect() {
    changeSelectByValue(this.snoozeSelect, this.alarm.snooze);
  },

  getSnoozeSelect: function aev_getSnoozeSelect() {
    return getSelectedValue(this.snoozeSelect);
  },

  refreshSnoozeMenu: function aev_refreshSnoozeMenu(snooze) {
    var snooze = (snooze) ? this.getSnoozeSelect() : this.alarm.snooze;
    this.snoozeMenu.textContent = _('nMinutes', {n: snooze});
  },

  save: function aev_save() {
    if (this.element.dataset.id != '') {
      this.alarm.id = parseInt(this.element.dataset.id);
    } else {
      delete this.alarm.id;
    }
    var error = false;

    var label = this.labelInput.value;
    this.alarm.label = (label) ? label : 'Alarm';
    this.alarm.enabled = true;
    // Get alarm time from time picker.
    if (this.timePicker.is12hFormat) {
      var hour24Offset = 12 * this.timePicker.hour24State.getSelectedIndex();
      var hour = this.timePicker.hour.getSelectedDisplayedText();
      hour = (hour == 12) ? 0 : hour;
      hour = hour + hour24Offset;
      this.alarm.hour = hour;
    } else {
      this.alarm.hour = this.timePicker.hour.getSelectedIndex();
    }
    this.alarm.minute = this.timePicker.minute.getSelectedDisplayedText();
    this.alarm.repeat = this.getRepeatSelect();
    this.alarm.sound = this.getSoundSelect();
    this.alarm.snooze = parseInt(this.getSnoozeSelect());

    if (!error) {
      AlarmsDB.putAlarm(this.alarm, function al_putAlarmList(alarm) {
        AlarmManager.setEnabled(alarm, alarm.enabled);
        AlarmList.refresh();
      });
    }

    return !error;
  },

  delete: function aev_delete() {
    if (!this.element.dataset.id)
      return;

    var alarm = this.alarm;
    if (alarm.alarmId)
      AlarmManager.setEnabled(alarm, false);

    var id = parseInt(this.element.dataset.id);
    AlarmsDB.deleteAlarm(id, function al_deletedAlarm() {
      AlarmList.refresh();
    });
  }

};

window.addEventListener('keyup', function goBack(evt) {
  if (document.location.hash != '#root' &&
      evt.keyCode === evt.DOM_VK_ESCAPE) {

    evt.preventDefault();
    evt.stopPropagation();

    document.location.hash = 'root';
  }
});

window.addEventListener('localized', function showBody() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
  ClockView.init();
  AlarmList.init();
  AlarmEditView.init();
  AlarmManager.init();
});

