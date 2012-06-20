'use strict';

const DAYSOFWEEK_DEF = '0000000';
var DaysOfWeek = DAYSOFWEEK_DEF;

const SOUNDDEF = 'classic.wav';
var Sound = SOUNDDEF;

const SNOOZEDEF = '5';
var Snooze = SNOOZEDEF;

const COLORDEF = 'Darkorange';
var Color = COLORDEF;

var Clock = {

  get time() {
    delete this.time;
    return this.time = document.getElementById('clock-time');
  },

  get hourState() {
    delete this.hourState;
    return this.hourState = document.getElementById('clock-hour24-state');
  },

  get daydate() {
    delete this.daydate;
    return this.daydate = document.getElementById('clock-day-date');
  },

  init: function cl_init() {
    this.updateTime();
  },

  updateTime: function cl_updateTime() {
    var d = new Date();

    // XXX: respect clock format in Settings
    var hour = d.toLocaleFormat('%I'); //24h by $H
    hour = hour.substr(0, 1) == '0' ? hour.slice(1) : hour;
    var min = d.toLocaleFormat('%M');
    this.time.textContent = hour + ':' + min;
    this.hourState.textContent = d.toLocaleFormat('%p');
    var day = d.toLocaleFormat('%A');
    var date = d.toLocaleFormat('%B');
    var month = d.toLocaleFormat('%e');
    this.daydate.textContent = day + ', ' + date + ' ' + month;

    var self = this;
    window.setTimeout(function cl_clockTimeout() {
      self.updateTime();
    }, (59 - d.getSeconds()) * 1000);
  }
};

var AlarmList = {

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
        this._timeout = window.setTimeout(function(id) {
          this.deleteCurrent(id);
          // XXX: to be replaced by long-press context menu
        }.bind(this, link.getAttribute('data-id')), 1500);
        break;
      case 'mouseup':
        window.clearTimeout(this._timeout);
        // XXX: to be replaced by long-press context menu
        this._timeout = null;
        break;
      case 'click':
        switch (link.id) {
          case 'alarm-new':
            EditAlarm.load(EditAlarm.alarmDefault());
            break;
          case 'input-enable':
            EditAlarm.getCurrent(link.getAttribute('data-id'),
              this.updateAlarmEnableState.bind(this, link.checked));
            break;
          case 'alarm-item':
            EditAlarm.getCurrent(link.getAttribute('data-id'),
              EditAlarm.load.bind(EditAlarm));
        }
        break;
    }

  },

  init: function al_init() {
    this.refresh();
  },

  refresh: function al_refresh() {
    var self = this;
    AlarmsDB.getAlarmList(function al_gotAlarmList(list) {
      self.fillList(list);
    });
  },

  fillList: function al_fillList(alarmDataList) {
    if (this.alarms.hasChildNodes()) {
      while (this.alarms.childNodes.length >= 1) {
        this.alarms.removeChild(this.alarms.firstChild);
      }
    }

    var content = '';

    alarmDataList.forEach(function(alarm) {

      var summaryRepeat = summarizeDaysOfWeek(alarm.repeat);
      var isSingleLine = summaryRepeat == 'Never' ? 'singleLine' : '';
      var hiddenSummary = summaryRepeat == 'Never' ? 'hiddenSummary' : '';
      var isChecked = alarm.enable == true ? ' checked="true"' : '';

      content += '<li>' +
                 '  <label class="alarmList">' +
                 '    <input id="input-enable" data-id="' +
                        escapeHTML(alarm.id) +
                        '" type="checkbox"' + isChecked + '>' +
                 '    <span></span>' +
                 '  </label>' +
                 '  <a href="#alarm" id="alarm-item" data-id="' +
                      escapeHTML(alarm.id) + '">' +
                 '    <div class="description">' +
                 '      <div class="alarmList-time">' +
                 '        <span class="time">' + escapeHTML(alarm.hour) +
                            ':' + escapeHTML(alarm.minute) + '</span>' +
                 '        <span class="hour24-state">' + 'AM' + '</span>' +
                 '      </div>' +
                 '      <div class="alarmList-detail">' +
                 '        <div class="label ' + isSingleLine + '">' +
                            escapeHTML(alarm.label, true) + '</div>' +
                 '        <div class="repeat ' + hiddenSummary + '">' +
                            summaryRepeat + '</div>' +
                 '      </div>' +
                 '      <div class="alarmList-direction"> >' +
                 '      </div>' +
                 '    </div>' +
                 '  </a>' +
                 '</li>';
    }.bind(this));

    this.alarms.innerHTML = content;
    this.alarms.addEventListener('click', AlarmList);
    this.alarms.addEventListener('mousedown', AlarmList);
    this.alarms.addEventListener('mouseup', AlarmList);
  },

  updateAlarmEnableState: function al_updateAlarmEnableState(enable, alarm) {
    if (alarm.enable != enable) {
      alarm.enable = enable;

      var self = this;
      AlarmsDB.putAlarm(alarm, function al_putAlarmList() {
        self.refresh();
      });
      if (enable) {
        AlarmManager.set(alarm);
      } else {
        AlarmManager.cancel(alarm);
      }
    }
  },

  deleteCurrent: function al_deleteCurrent(alarmID) {
    if (alarmID != '') {
      var id = parseInt(alarmID);
      var self = this;
      AlarmsDB.deleteAlarm(id, function al_deletedAlarm() {
        self.refresh();
      });
    }
  }

};

var AlarmManager = {
  // Need Maintain timeout object for multiple alarm
  set: function am_set(alarm) {
    var date = new Date();
    var alarmDate = new Date(date.getFullYear(), date.getMonth(),
                    date.getDate(), alarm.hour, alarm.minute, 0, 0);
    var remaining = alarmDate.getTime() - Date.now();

    // Fake alarm is prepared for demo only since AlarmAPI not ready yet
    this._fakeAlarmTimeout = window.setTimeout(function() {

      var ringtonePlayer = new Audio();
      ringtonePlayer.loop = true;
      var selectedAlarmSound = 'style/ringtones/classic.wav';
      ringtonePlayer.src = selectedAlarmSound;

      var power = navigator.mozPower;
      navigator.mozApps.getSelf().onsuccess = function(e) {
        var app = e.target.result;
        app.launch();
        if (power) {
          power.screenEnabled = true;
          var preferredBrightness = 0.8;
          power.screenBrightness = preferredBrightness;
        }
        if ('mozVibrate' in navigator) {
          var vibrateInterval = 0;
          vibrateInterval = window.setInterval(function vibrate() {
            if ('mozVibrate' in navigator) {
              navigator.mozVibrate([200]);
            }
          }, 600);
          window.setTimeout(function clearVibration() {
            window.clearInterval(vibrateInterval);
          }, 3000);
        }
        ringtonePlayer.play();
        window.setTimeout(function pauseRingtone() {
          ringtonePlayer.pause();
        }, 2000);
      };
    }, remaining);
  },

  cancel: function am_cancel(alarm) {
    window.clearTimeout(this._fakeAlarmTimeout);
    this._fakeAlarmTimeout = null;
  }
};

var EditAlarm = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('alarm');
  },

  get labelInput() {
    delete this.labelInput;
    return this.labelInput =
      document.querySelector('input[name=\'alarm.label\']');
  },

  get hourInput() {
    delete this.hourInput;
    return this.hourInput =
      document.querySelector('input[name=\'alarm.hour\']');
  },

  get minuteInput() {
    delete this.minuteInput;
    return this.minuteInput =
      document.querySelector('input[name=\'alarm.minute\']');
  },

  get enableInput() {
    delete this.enableInput;
    return this.enableInput =
      document.querySelector('input[name=\'alarm.enable\']');
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

  handleEvent: function ea_handleEvent(evt) {
    if (evt.type != 'click')
      return;

    var input = evt.target;
    if (!input)
      return;

    switch (input.id) {
      case 'alarm-save':
        if (!this.updateCurrent()) {
          evt.preventDefault();
          return false;
        }
        break;
      case 'repeat-menu':
        PickRepeat.load(DaysOfWeek);
        break;
      case 'sound-menu':
        PickSound.load(Sound);
        break;
      case 'snooze-menu':
        PickSnooze.load(Snooze);
        break;
      case 'color-menu':
        PickColor.load(Color);
        break;
      case 'alarm-del':
        this.deleteCurrent();
        break;
    }
  },

  alarmDefault: function ea_alarmDefault() {
    var alarm = {};

    // Reset the required message with default value
    alarm.id = '';
    alarm.label = 'Alarm';
    alarm.hour = '10';
    alarm.minute = '00';
    alarm.enable = true;
    alarm.repeat = DAYSOFWEEK_DEF;
    alarm.sound = SOUNDDEF;
    alarm.snooze = SNOOZEDEF;
    alarm.color = COLORDEF;

    return alarm;
  },

  load: function ea_load(alarm) {
    this.element.dataset.id = alarm.id;
    this.labelInput.value = alarm.label;
    this.hourInput.value = alarm.hour;
    this.minuteInput.value = alarm.minute;
    this.enableInput.checked = alarm.enable;

    if (alarm.id) {
      this.alarmTitle.innerHTML = 'Edit Alarm';
      this.deleteElement.style.display = 'block';
      this.refreshRepeatMenu(alarm.repeat);
      this.refreshSoundMenu(alarm.sound);
      this.refreshSnoozeMenu(alarm.snooze);
      this.refreshColorMenu(alarm.color);
    } else {
      this.alarmTitle.innerHTML = 'New Alarm';
      this.deleteElement.style.display = 'none';
      this.refreshRepeatMenu();
      this.refreshSoundMenu();
      this.refreshSnoozeMenu();
      this.refreshColorMenu();
    }
  },

  refreshRepeatMenu: function ea_refreshRepeatMenu(daysOfWeek) {
    if (!daysOfWeek) {
      var daysOfWeek = DAYSOFWEEK_DEF;
    }
    DaysOfWeek = daysOfWeek;
    this.repeatMenu.innerHTML = summarizeDaysOfWeek(DaysOfWeek);
  },

  refreshSoundMenu: function ea_refreshSoundMenu(sound) {
    if (!sound) {
      var sound = SOUNDDEF;
    }
    Sound = sound;
    this.soundMenu.innerHTML = Sound.slice(0, Sound.lastIndexOf('.'));
  },

  refreshSnoozeMenu: function ea_refreshSnoozeMenu(snooze) {
    if (!snooze) {
      var snooze = SNOOZEDEF;
    }
    Snooze = snooze;
    this.snoozeMenu.innerHTML = Snooze + ' ' + 'minutes';
  },

  refreshColorMenu: function ea_refreshColorMenu(color) {
    if (!color) {
      var color = COLORDEF;
    }
    Color = color;
    this.colorMenu.innerHTML = Color;
    var newColor = '"Color: ' + Color + ';"';
  },

  updateCurrent: function ea_updateCurrent() {

    var alarm = {};
    if (this.element.dataset.id != 'undefined' &&
        this.element.dataset.id != '') {
      alarm.id = parseInt(this.element.dataset.id);
    }

    var error = false;

    alarm.label = this.labelInput.value;
    alarm.hour = this.hourInput.value;
    alarm.minute = this.minuteInput.value;
    alarm.enable = this.enableInput.checked;
    alarm.repeat = DaysOfWeek;
    alarm.sound = Sound;
    alarm.snooze = Snooze;
    alarm.color = Color;

    if (!alarm.label) {
      this.labelInput.nextElementSibling.textContent = 'Required';
      error = true;
    }

    if (alarm.hour > 24 || (alarm.hour == 24 && alarm.minute != 0)) {
      this.hourInput.nextElementSibling.textContent = 'Invalid';
      error = true;
    }

    if (!error) {
      AlarmsDB.putAlarm(alarm, function al_putAlarmList() {
        AlarmList.refresh();
      });
      if (alarm.enable) {
        AlarmManager.set(alarm);
      } else {
        AlarmManager.cancel(alarm);
      }
    }

    return !error;
  },

  getCurrent: function ea_getCurrent(alarmID, getSuccessHandler) {
    if (alarmID != '') {
      var id = parseInt(alarmID);
      AlarmsDB.getAlarm(id, getSuccessHandler);
    }
  },

  deleteCurrent: function ea_deleteCurrent() {
    if (this.element.dataset.id != '') {
      var id = parseInt(this.element.dataset.id);
      AlarmsDB.deleteAlarm(id, function al_deletedAlarm() {
        AlarmList.refresh();
      });
    }
  }

};

var PickRepeat = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('repeat');
  },

  get MonInput() {
    delete this.MonInput;
    return this.MonInput =
      document.querySelector('input[name=\'repeat.Monday\']');
  },

  get TueInput() {
    delete this.TueInput;
    return this.TueInput =
      document.querySelector('input[name=\'repeat.Tuesday\']');
  },

  get WedInput() {
    delete this.WedInput;
    return this.WedInput =
      document.querySelector('input[name=\'repeat.Wednesday\']');
  },

  get ThuInput() {
    delete this.ThuInput;
    return this.ThuInput =
      document.querySelector('input[name=\'repeat.Thursday\']');
  },

  get FriInput() {
    delete this.FriInput;
    return this.FriInput =
      document.querySelector('input[name=\'repeat.Friday\']');
  },

  get SatInput() {
    delete this.SatInput;
    return this.SatInput =
      document.querySelector('input[name=\'repeat.Saturday\']');
  },

  get SunInput() {
    delete this.SunInput;
    return this.SunInput =
      document.querySelector('input[name=\'repeat.Sunday\']');
  },

  handleEvent: function pr_handleEvent(evt) {
    if (evt.type != 'click')
      return;

    var input = evt.target;
    if (!input)
      return;

    switch (input.id) {
      case 'repeat-back':
        this.saveRepeatSelection();
        break;
    }
  },

  load: function pr_load(daysOfWeek) {
    this.MonInput.checked = daysOfWeek.substr(0, 1) == '1' ? true : false;
    this.TueInput.checked = daysOfWeek.substr(1, 1) == '1' ? true : false;
    this.WedInput.checked = daysOfWeek.substr(2, 1) == '1' ? true : false;
    this.ThuInput.checked = daysOfWeek.substr(3, 1) == '1' ? true : false;
    this.FriInput.checked = daysOfWeek.substr(4, 1) == '1' ? true : false;
    this.SatInput.checked = daysOfWeek.substr(5, 1) == '1' ? true : false;
    this.SunInput.checked = daysOfWeek.substr(6, 1) == '1' ? true : false;
  },

  saveRepeatSelection: function pr_saveRepeatSelection() {
    var daysOfWeek = '';
    daysOfWeek += this.MonInput.checked ? '1' : '0';
    daysOfWeek += this.TueInput.checked ? '1' : '0';
    daysOfWeek += this.WedInput.checked ? '1' : '0';
    daysOfWeek += this.ThuInput.checked ? '1' : '0';
    daysOfWeek += this.FriInput.checked ? '1' : '0';
    daysOfWeek += this.SatInput.checked ? '1' : '0';
    daysOfWeek += this.SunInput.checked ? '1' : '0';
    DaysOfWeek = daysOfWeek;
    EditAlarm.refreshRepeatMenu(DaysOfWeek);
  }

};

var PickSound = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('sound');
  },

  handleEvent: function pso_handleEvent(evt) {
    var input = evt.target;
    if (!input)
      return;

    switch (evt.type) {
      case 'click':
        if (input.id == 'sound-back') {
          this.saveSoundMenu();
        }
        break;
    }
  },

  load: function pso_load(sound) {
    var radios = document.querySelectorAll('input[name="sound"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        radio.checked = sound == radio.value ? true : false;
      })(radios[i]);
    }
  },

  saveSoundMenu: function pso_saveSoundMenu() {
    var radios = document.querySelectorAll('input[name="sound"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        if (radio.checked) {
          EditAlarm.refreshSoundMenu(radio.value);
          return;
        }
      })(radios[i]);
    }
  }

};

var PickSnooze = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('snooze');
  },

  handleEvent: function psn_handleEvent(evt) {
    var input = evt.target;
    if (!input)
      return;

    switch (evt.type) {
      case 'click':
        if (input.id == 'snooze-back') {
          this.saveSnoozeMenu();
        }
        break;
    }
  },

  load: function psn_load(snooze) {
    var radios = document.querySelectorAll('input[name="snooze"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        radio.checked = snooze == radio.value ? true : false;
      })(radios[i]);
    }
  },

  saveSnoozeMenu: function psn_saveSnoozeMenu() {
    var radios = document.querySelectorAll('input[name="snooze"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        if (radio.checked) {
          EditAlarm.refreshSnoozeMenu(radio.value);
          return;
        }
      })(radios[i]);
    }
  }

};

var PickColor = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('color');
  },

  handleEvent: function pc_handleEvent(evt) {
    var input = evt.target;
    if (!input)
      return;

    switch (evt.type) {
      case 'click':
        if (input.id == 'color-back') {
          this.saveColorMenu();
        }
        break;
    }
  },

  load: function pc_load(color) {
    var radios = document.querySelectorAll('input[name="color"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        radio.checked = color == radio.value ? true : false;
      })(radios[i]);
    }
  },

  saveColorMenu: function pc_saveColorMenu() {
    var radios = document.querySelectorAll('input[name="color"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        if (radio.checked) {
          EditAlarm.refreshColorMenu(radio.value);
          return;
        }
      })(radios[i]);
    }
  }

};

var AlarmsDB = {

  DBNAME: 'alarms',
  STORENAME: 'alarms',

  // Database methods
  getAlarmList: function ad_getAlarmList(gotAlarmListHandler) {
    AlarmsTestDB.query(this.DBNAME, this.STORENAME, AlarmsTestDB.load,
      gotAlarmListHandler);
  },

  putAlarm: function ad_putAlarm(alarm, putAlarmHandler) {
    AlarmsTestDB.query(this.DBNAME, this.STORENAME, AlarmsTestDB.put,
      putAlarmHandler, alarm);
  },

  getAlarm: function ad_getAlarm(key, getSuccessHandler) {
    AlarmsTestDB.query(this.DBNAME, this.STORENAME, AlarmsTestDB.get,
      getSuccessHandler, key);
  },

  deleteAlarm: function ad_deleteAlarm(key, deletedAlarmHandler) {
    AlarmsTestDB.query(this.DBNAME, this.STORENAME, AlarmsTestDB.delete,
      deletedAlarmHandler, key);
  }
};

window.addEventListener('DOMContentLoaded', function() {
  document.querySelector('#alarm-new').addEventListener('click', AlarmList);
  document.querySelector('#alarm-save').addEventListener('click', EditAlarm);
  document.querySelector('#alarm-del').addEventListener('click', EditAlarm);
  document.querySelector('#repeat-menu').addEventListener('click', EditAlarm);
  document.querySelector('#sound-menu').addEventListener('click', EditAlarm);
  document.querySelector('#snooze-menu').addEventListener('click', EditAlarm);
  document.querySelector('#color-menu').addEventListener('click', EditAlarm);
  document.querySelector('#repeat-back').addEventListener('click', PickRepeat);
  document.querySelector('#sound-back').addEventListener('click', PickSound);
  document.querySelector('#snooze-back').addEventListener('click', PickSnooze);
  document.querySelector('#color-back').addEventListener('click', PickColor);

  Clock.init();
  AlarmList.init();
});

window.addEventListener('keyup', function goBack(event) {
  if (document.location.hash != '#root' &&
      event.keyCode === event.DOM_VK_ESCAPE) {

    event.preventDefault();
    event.stopPropagation();

    document.location.hash = 'root';
  }
});
