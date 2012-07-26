'use strict';

var _ = navigator.mozL10n.get;

var ClockView = {

  _clockMode: '', /* digital or analog */

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

  get time() {
    delete this.time;
    return this.time = document.getElementById('clock-time');
  },

  get hourState() {
    delete this.hourState;
    return this.hourState = document.getElementById('clock-hour24-state');
  },

  get day() {
    delete this.day;
    return this.day = document.getElementById('clock-day');
  },

  get date() {
    delete this.date;
    return this.date = document.getElementById('clock-date');
  },

  get alarmNewBtn() {
    delete this.alarmNewBtn;
    return this.alarmNewBtn = document.getElementById('alarm-new');
  },

  get digitalClockBG() {
    delete this.digitalClockBG;
    return this.digitalClockBG = document.getElementById('digital-clock-bg');
  },

  init: function cv_init() {
    this.updateDaydate();
    this.updateDigitalClock();
    this._clockMode = 'digital';
    this.digitalClock.classList.add('visible'); /* digital clock is default */
    this.digitalClockBG.classList.add('visible');
    this.analogClock.classList.remove('visible');
    document.addEventListener('mozvisibilitychange', this);
    this.digitalClock.addEventListener('click', this);
  },

  updateDaydate: function cv_updateDaydate() {
    var d = new Date();
    this.day.textContent = d.toLocaleFormat('%A ');
    var format = navigator.mozL10n.get('dateFormat');
    this.date.textContent = d.toLocaleFormat(format);

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

    // XXX: respect clock format in Settings
    var hour = d.getHours() % 12;
    if (!hour)
      hour = 12;
    this.time.textContent = hour + d.toLocaleFormat(':%M');
    this.hourState.textContent = d.toLocaleFormat('%p');

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
    var secangle = sec * 6; // 6 degrees per second
    var minangle = min * 6; // 6 degrees per minute
    var hourangle = hour * 30; // 30 degrees per hour

    // Get SVG elements for the hands of the clock
    var sechand = document.getElementById('secondhand');
    var minhand = document.getElementById('minutehand');
    var hourhand = document.getElementById('hourhand');

    // Set an SVG attribute on them to move them around the clock face
    sechand.setAttribute('transform', 'rotate(' + secangle + ',50,50)');
    minhand.setAttribute('transform', 'rotate(' + minangle + ',50,50)');
    hourhand.setAttribute('transform', 'rotate(' + hourangle + ',50,50)');

    // Update the clock again in 1 minute
    var self = this;
    this._updateAnalogClockTimeout =
    window.setTimeout(function cv_updateAnalogClockTimeout() {
      self.updateAnalogClock();
    }, (1000 - now.getMilliseconds()));
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

      case 'click':
        var input = evt.target;
          if (!input)
            return;

        switch (input.id) {
          case 'digital-clock-display':
            window.clearTimeout(this._updateDigitalClockTimeout);
            this.digitalClock.removeEventListener('click', this);
            this.digitalClock.classList.remove('visible');
            this.digitalClockBG.classList.remove('visible');
            this.updateAnalogClock();
            this._clockMode = 'analog';
            this.analogClock.classList.add('visible');
            this.analogClock.addEventListener('click', this);
            break;

          case 'analog-clock':
            window.clearTimeout(this._updateAnalogClockTimeout);
            this.analogClock.removeEventListener('click', this);
            this.analogClock.classList.remove('visible');
            this.updateDigitalClock();
            this._clockMode = 'digital';
            this.digitalClock.classList.add('visible');
            this.digitalClockBG.classList.add('visible');
            this.digitalClock.addEventListener('click', this);
            break;
        }
        break;
    }
  },

  resizeAnalogClock: function cv_resizeAnalogClock() {
    var height = this.clockView.offsetHeight -
                 this.date.offsetHeight -
                 this.alarmNewBtn.offsetTop -
                 this.alarmNewBtn.offsetHeight -
                 AlarmList.alarms.offsetHeight;
    this.analogClock.style.height = height + 'px';
  }

};

var AlarmList = {

  alarmList: [],

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
      case 'mousedown':
        this._timeout = window.setTimeout(function longpress(id) {
          this.deleteCurrent(id);
          // XXX: to be replaced by long-press context menu
        }.bind(this, parseInt(link.getAttribute('data-id'))), 1500);
        break;

      case 'mouseup':
        window.clearTimeout(this._timeout);
        // XXX: to be replaced by long-press context menu
        this._timeout = null;
        break;

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
    this.alarms.addEventListener('mousedown', this);
    this.alarms.addEventListener('mouseup', this);
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
      var hour = (alarm.hour > 12) ? alarm.hour - 12 : alarm.hour;
      var hour12state = (alarm.hour > 12) ? 'PM' : 'AM';

      content += '<li>' +
                 '  <label class="alarmList">' +
                 '    <input id="input-enable" data-id="' + alarm.id +
                        '" type="checkbox"' + isChecked + '>' +
                 '    <span class="setEnabledBtn"></span>' +
                 '  </label>' +
                 '  <a href="#alarm" id="alarm-item" data-id="' +
                      alarm.id + '">' +
                 '    <div class="description">' +
                 '      <div class="alarmList-time">' +
                 '        <span class="time">' + hour +
                            ':' + alarm.minute + '</span>' +
                 '        <span class="hour24-state">' +
                            hour12state + '</span>' +
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
    ClockView.resizeAnalogClock();
  },

  getAlarmFromList: function al_getAlarmFromList(id) {
    for (var i = 0; i < this.alarmList.length; i++) {
      if (this.alarmList[i].id == id)
        return this.alarmList[i];
    }
    return null;
  },

  updateAlarmEnableState: function al_updateAlarmEnableState(enabled, alarm) {
    if (alarm.enabled == enabled)
      return;

    alarm.enabled = enabled;

    var self = this;
    AlarmsDB.putAlarm(alarm, function al_putAlarmList(alarm) {
      AlarmManager.setEnabled(alarm, alarm.enabled);
      self.refresh();
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
  },

  setEnabled: function am_setEnabled(alarm, enabled) {
    if (enabled) {
      this.set(alarm);
    } else {
      this.unset(alarm);
    }
  },

  set: function am_set(alarm, bSnooze) {
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
    };
    request.onerror = function(e) {
      var logInfo = bSnooze ? ' snooze' : '';
      console.log('set' + logInfo + ' alarm fail');
    };
  },

  unset: function am_unset(alarm) {
    if (alarm.alarmId) {
      navigator.mozAlarms.remove(alarm.alarmId);
      this.updateAlarmStatusBar();
    }
  },

  onAlarmFiredHandler: function am_onAlarmFiredHandler(message) {
    // XXX receive and paser the alarm id from the message
    var id = message.data.id;
    // use the alarm id to query db
    // find out which alarm is being fired.
    var self = this;
    AlarmsDB.getAlarm(id, function am_gotAlarm(alarm) {
      // prepare to pop out attention screen, ring the ringtone, vibrate
      self._onFireAlarm = alarm;
      var protocol = window.location.protocol;
      var host = window.location.host;
      window.open(protocol + '//' + host + '/onring.html',
                  'ring_screen', 'attention');
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
      navigator.mozSettings.getLock().set({'alarm.enabled': hasAlarmEnabled});
    };
    request.onerror = function(e) {
      console.log('get all alarm fail');
    };
  }

};

var AlarmEditView = {

  alarm: {},

  get element() {
    delete this.element;
    return this.element = document.getElementById('alarm');
  },

  get labelInput() {
    delete this.labelInput;
    return this.labelInput =
      document.querySelector('input[name="alarm.label"]');
  },

  get hourInput() {
    delete this.hourInput;
    return this.hourInput =
      document.querySelector('input[name="alarm.hour"]');
  },

  get minuteInput() {
    delete this.minuteInput;
    return this.minuteInput =
      document.querySelector('input[name="alarm.minute"]');
  },

  get enableInput() {
    delete this.enableInput;
    return this.enableInput =
      document.querySelector('input[name="alarm.enable"]');
  },

  get alarmTitle() {
    delete this.alarmTitle;
    return this.alarmTitle = document.getElementById('alarm-title');
  },

  get repeatMenu() {
    delete this.repeatMenu;
    return this.repeatMenu = document.getElementById('repeat-menu');
  },

  get soundMenu() {
    delete this.soundMenu;
    return this.soundMenu = document.getElementById('sound-menu');
  },

  get snoozeMenu() {
    delete this.snoozeMenu;
    return this.snoozeMenu = document.getElementById('snooze-menu');
  },

  get colorMenu() {
    delete this.colorMenu;
    return this.colorMenu = document.getElementById('color-menu');
  },

  get deleteElement() {
    delete this.deleteElement;
    return this.deleteElement = document.querySelector('li.delete');
  },

  init: function aev_init() {
    document.getElementById('alarm-done').addEventListener('click', this);
    document.getElementById('alarm-del').addEventListener('click', this);
    document.getElementById('repeat-menu').addEventListener('click', this);
    document.getElementById('sound-menu').addEventListener('click', this);
    document.getElementById('snooze-menu').addEventListener('click', this);
    document.getElementById('color-menu').addEventListener('click', this);
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
        RepeatPickerView.load(this.alarm.repeat);
        break;
      case 'sound-menu':
        SoundPickerView.load(this.alarm.sound);
        break;
      case 'snooze-menu':
        SnoozePickerView.load(this.alarm.snooze);
        break;
      case 'color-menu':
        ColorPickerView.load(this.alarm.color);
        break;
      case 'alarm-del':
        this.delete();
        break;
    }
  },

  getDefaultAlarm: function aev_getDefaultAlarm() {
    // Reset the required message with default value
    return {
      id: '', // for Alarm APP indexedDB id
      alarmId: '', // for request AlarmAPI id
      label: 'Alarm',
      hour: '10',
      minute: '00',
      enabled: true,
      repeat: '0000000',
      sound: 'classic.wav',
      snooze: 5,
      color: 'Darkorange'
    };
  },

  load: function aev_load(alarm) {
    if (!alarm)
      alarm = this.getDefaultAlarm();

    this.alarm = alarm;

    this.element.dataset.id = alarm.id;
    this.labelInput.value = alarm.label;
    this.hourInput.value = alarm.hour;
    this.minuteInput.value = alarm.minute;
    this.enableInput.checked = alarm.enabled;

    if (alarm.id) {
      this.alarmTitle.innerHTML = _('editAlarm');
      this.deleteElement.hidden = false;
    } else {
      this.alarmTitle.innerHTML = _('newAlarm');
      this.deleteElement.hidden = true;
    }
    this.refreshRepeatMenu();
    this.refreshSoundMenu();
    this.refreshSnoozeMenu();
    this.refreshColorMenu();
  },

  refreshRepeatMenu: function aev_refreshRepeatMenu() {
    this.repeatMenu.innerHTML = summarizeDaysOfWeek(this.alarm.repeat);
  },

  refreshSoundMenu: function aev_refreshSoundMenu() {
    // XXX: Refresh and paser the name of sound file for sound menu.
    this.soundMenu.innerHTML =
      this.alarm.sound.slice(0, this.alarm.sound.lastIndexOf('.'));
  },

  refreshSnoozeMenu: function aev_refreshSnoozeMenu() {
    this.snoozeMenu.innerHTML = _('nMinutes', {n: this.alarm.snooze});
  },

  refreshColorMenu: function aev_refreshColorMenu() {
    // XXX: Exposing a CSS color name to the UI.
    this.colorMenu.innerHTML = this.alarm.color;
  },

  save: function aev_save() {
    if (this.element.dataset.id != '') {
      this.alarm.id = parseInt(this.element.dataset.id);
    } else {
      delete this.alarm.id;
    }
    var error = false;

    this.alarm.label = this.labelInput.value;
    this.alarm.hour = this.hourInput.value;
    this.alarm.minute = this.minuteInput.value;
    this.alarm.enabled = this.enableInput.checked;

    if (!this.alarm.label) {
      this.labelInput.nextElementSibling.textContent = _('required');
      error = true;
    }

    if (this.alarm.hour > 24 ||
      (this.alarm.hour == 24 && this.alarm.minute != 0)) {
      this.hourInput.nextElementSibling.textContent = _('invalid');
      error = true;
    }

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

var RepeatPickerView = {

  dayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday',
    'Friday', 'Saturday', 'Sunday'],

  get element() {
    delete this.element;
    return this.element = document.getElementById('repeat');
  },

  init: function rpv_init() {
    document.getElementById('repeat-back').addEventListener('click', this);
  },

  handleEvent: function rpv_handleEvent(evt) {
    var input = evt.target;
    if (!input)
      return;

    switch (input.id) {
      case 'repeat-back':
        this.save();
        break;
    }
  },

  load: function rpv_load(daysOfWeek) {
    this.dayNames.forEach(function rpv_setDayInput(day, index) {
      var id = 'input[name="repeat.' + day + '"]';
      document.querySelector(id).checked =
        (daysOfWeek.substr(index, 1) == '1') ? true : false;
    });
  },

  save: function ppv_save() {
    var daysOfWeek = '';
    this.dayNames.forEach(function rpv_getDayInput(day, index) {
      var id = 'input[name="repeat.' + day + '"]';
      daysOfWeek += (document.querySelector(id).checked) ? '1' : '0';
    });
    AlarmEditView.alarm.repeat = daysOfWeek;
    AlarmEditView.refreshRepeatMenu();
  }

};

var SoundPickerView = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('sound');
  },

  init: function sopv_init() {
    document.getElementById('sound-back').addEventListener('click', this);
  },

  handleEvent: function sopv_handleEvent(evt) {
    var input = evt.target;
    if (!input)
      return;

    switch (evt.type) {
      case 'click':
        if (input.id == 'sound-back') {
          this.save();
        }
        break;
    }
  },

  load: function sopv_load(sound) {
    var radios = document.querySelectorAll('input[name="sound"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = (sound == radios[i].value);
    }
  },

  save: function sopv_save() {
    var radios = document.querySelectorAll('input[name="sound"]');
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) {
        AlarmEditView.alarm.sound = radios[i].value;
        AlarmEditView.refreshSoundMenu();
        return;
      }
    }
  }

};

var SnoozePickerView = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('snooze');
  },

  init: function snpv_init() {
    document.getElementById('snooze-back').addEventListener('click', this);
  },

  handleEvent: function snpv_handleEvent(evt) {
    var input = evt.target;
    if (!input)
      return;

    switch (evt.type) {
      case 'click':
        if (input.id == 'snooze-back') {
          this.save();
        }
        break;
    }
  },

  load: function snpv_load(snooze) {
    var radios = document.querySelectorAll('input[name="snooze"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = (snooze == radios[i].value);
    }
  },

  save: function snpv_save() {
    var radios = document.querySelectorAll('input[name="snooze"]');
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) {
        AlarmEditView.alarm.snooze = radios[i].value;
        AlarmEditView.refreshSnoozeMenu();
        return;
      }
    }
  }

};

var ColorPickerView = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('color');
  },

  init: function cpv_init() {
    document.getElementById('color-back').addEventListener('click', this);
  },

  handleEvent: function cpv_handleEvent(evt) {
    var input = evt.target;
    if (!input)
      return;

    switch (evt.type) {
      case 'click':
        if (input.id == 'color-back') {
          this.save();
        }
        break;
    }
  },

  load: function cpv_load(color) {
    var radios = document.querySelectorAll('input[name="color"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = (color == radios[i].value);
    }
  },

  save: function cpv_save() {
    var radios = document.querySelectorAll('input[name="color"]');
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) {
        AlarmEditView.alarm.color = radios[i].value;
        AlarmEditView.refreshColorMenu();
        return;
      }
    }
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
  RepeatPickerView.init();
  SoundPickerView.init();
  SnoozePickerView.init();
  ColorPickerView.init();
  AlarmManager.init();
});
