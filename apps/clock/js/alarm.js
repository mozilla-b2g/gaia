'use strict';

const DAYSOFWEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday',
                    'Friday', 'Saturday', 'Sunday'];
const DAYSOFWEEK_DEFOBJ = {
  picked: [7],
  summary: 'Never'
};
var DaysOfWeek = DAYSOFWEEK_DEFOBJ;

const SOUNDDEF = 'classic.wav';
var Sound = SOUNDDEF;

const SNOOZEDEF = '5';
var Snooze = SNOOZEDEF;

const COLORDEF = 'Darkorange';
var Color = COLORDEF;

var AlarmList = {

  get alarms() {
    delete this.alarms;
    return this.alarms = document.getElementById('alarms');
  },

  get title() {
    delete this.title;
    return this.title = document.getElementById('alarms-title');
  },

  handleEvent: function(evt) {
    var link = evt.target;
    if (!link)
      return;

    switch (evt.type) {
      case 'mousedown':
        this._timeout = window.setTimeout(function(id) {
          this.deleteCurrent(id);
        }.bind(this, evt.currentTarget.dataset.id), 1500);
        break;
      case 'mouseup':
        window.clearTimeout(this._timeout);
        this._timeout = null;
        break;
      case 'click':
        switch (link.id) {
          case 'alarm-new':
            EditAlarm.load(EditAlarm.alarmDefault());
            break;
          case 'input-enable':
            EditAlarm.getCurrent(evt.currentTarget.dataset.id,
              this.updateAlarmEnableState.bind(this, link.checked));
            break;
          default:
            EditAlarm.getCurrent(evt.currentTarget.dataset.id,
              EditAlarm.load.bind(EditAlarm));
        }
        break;
      default:
        break;
    }

  },

  init: function() {
    AlarmsDB.load();
  },

  refresh: function() {
    if (this.alarms.hasChildNodes()) {
      while (this.alarms.childNodes.length >= 1) {
        this.alarms.removeChild(this.alarms.firstChild);
      }
    }

    AlarmsDB.load();
  },

  fill: function(alarmDataList) {

    alarmDataList.forEach(function(alarm) {

      var li = document.createElement('li');
      var a = document.createElement('a');
      a.dataset.id = alarm.id;
      a.dataset.label = alarm.label;
      a.dataset.hour = alarm.hour;
      a.dataset.minute = alarm.minute;
      a.dataset.enable = alarm.enable;
      a.href = '#alarm';
      li.appendChild(a);

      var label = document.createElement('label');
      label.setAttribute('class', 'alarmList');

      var enableInput = document.createElement('input');
      enableInput.setAttribute('type', 'checkbox');
      enableInput.setAttribute('id', 'input-enable');
      enableInput.checked = alarm.enable;
      var enableSpan = document.createElement('span');
      label.appendChild(enableInput);
      label.appendChild(enableSpan);

      var alarmDescription = document.createElement('div');
      alarmDescription.setAttribute('class', 'description');

      var alarmTimeSpan = document.createElement('div');
      alarmTimeSpan.setAttribute('class', 'time');
      alarmTimeSpan.textContent = alarm.hour + ':' + alarm.minute;

      var labelSpan = document.createElement('div');
      labelSpan.classList.add('label');
      labelSpan.textContent = alarm.label;

      var colorSpan = document.createElement('div');
      colorSpan.classList.add('label');
      colorSpan.textContent = alarm.color;

      alarmDescription.appendChild(alarmTimeSpan);
      alarmDescription.appendChild(labelSpan);
      alarmDescription.appendChild(colorSpan);
      a.appendChild(alarmDescription);
      a.appendChild(label);

      a.addEventListener('click', AlarmList);
      a.addEventListener('mousedown', AlarmList);
      a.addEventListener('mouseup', AlarmList);

      this.alarms.appendChild(li);
    }.bind(this));

  },

  updateAlarmEnableState: function(enable, alarm) {
    if (alarm.enable != enable) {
      alarm.enable = enable;
      AlarmsDB.put(alarm);
      if (enable) {
        AlarmManager.set(alarm);
      } else {
        AlarmManager.cancel(alarm);
      }
    }
  },

  deleteCurrent: function(alarmID) {
    if (alarmID != '') {
      var id = parseInt(alarmID);
      AlarmsDB.delete(id);
    }
  }

};

var AlarmManager = {
  // Need Maintain timeout object for multiple alarm
  set: function(alarm) {
    var date = new Date();
    var alarmDate = new Date(date.getFullYear(), date.getMonth(),
                    date.getDate(), alarm.hour, alarm.minute, 0, 0);
    var remaining = alarmDate.getTime() - Date.now();

    this._fakeAlarm = window.setTimeout(function() {
      //To do vibration
      navigator.mozVibrate([200, 200, 200, 200, 200]);
    }.bind(this), remaining);
  },

  cancel: function(alarm) {
    window.clearTimeout(this._timeout);
    this._timeout = null;
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

  handleEvent: function(evt) {
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
        PickRepeat.load(DaysOfWeek.picked);
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
      default:
        break;
    }
  },

  alarmDefault: function() {
    var alarm = {};

    // Reset the required message with default value
    alarm.id = '';
    alarm.label = 'Alarm';
    alarm.hour = '10';
    alarm.minute = '00';
    alarm.enable = true;
    alarm.repeat = DAYSOFWEEK_DEFOBJ;
    alarm.sound = SOUNDDEF;
    alarm.snooze = SNOOZEDEF;
    alarm.color = COLORDEF;

    return alarm;
  },

  load: function(alarm) {
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

  refreshRepeatMenu: function(daysOfWeek) {
    if (!daysOfWeek) {
      var daysOfWeek = DAYSOFWEEK_DEFOBJ;
      for (var i = 0; i < 7; i++) {
        daysOfWeek.picked[i] = false;
      }
    }

    DaysOfWeek = daysOfWeek;
    if (DaysOfWeek.summary == 'Specific') {
      var pickedDay = '';
      for (var i = 0; i < 7; i++) {
        if (DaysOfWeek.picked[i]) {
          pickedDay = pickedDay + DAYSOFWEEK[i] + ', ';
        }
      }
      this.repeatMenu.innerHTML = pickedDay.slice(0,
                                  pickedDay.lastIndexOf(','));
    } else {
      this.repeatMenu.innerHTML = DaysOfWeek.summary;
    }

  },

  refreshSoundMenu: function(sound) {
    if (!sound) {
      var sound = SOUNDDEF;
    }
    Sound = sound;
    this.soundMenu.innerHTML = Sound.slice(0, Sound.lastIndexOf('.'));
  },

  refreshSnoozeMenu: function(snooze) {
    if (!snooze) {
      var snooze = SNOOZEDEF;
    }
    Snooze = snooze;
    this.snoozeMenu.innerHTML = Snooze + ' ' + 'minutes';
  },

  refreshColorMenu: function(color) {
    if (!color) {
      var color = COLORDEF;
    }
    Color = color;
    this.colorMenu.innerHTML = Color;
    var newColor = '"Color: ' + Color + ';"';
  },

  updateCurrent: function() {

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
      AlarmsDB.put(alarm);
      if (alarm.enable) {
        AlarmManager.set(alarm);
      } else {
        AlarmManager.cancel(alarm);
      }
    }

    return !error;
  },

  getCurrent: function(alarmID, getSuccessHandler) {
    if (alarmID != '') {
      var id = parseInt(alarmID);
      AlarmsDB.get(id, getSuccessHandler);
    }
  },

  deleteCurrent: function() {
    if (this.element.dataset.id != '') {
      var id = parseInt(this.element.dataset.id);
      AlarmsDB.delete(id);
    }
  }

};

var PickRepeat = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('repeat');
  },

  get MondayInput() {
    delete this.MondayInput;
    return this.MondayInput =
      document.querySelector('input[name=\'repeat.Monday\']');
  },

  get TuesdayInput() {
    delete this.TuesdayInput;
    return this.TuesdayInput =
      document.querySelector('input[name=\'repeat.Tuesday\']');
  },

  get WednesdayInput() {
    delete this.WednesdayInput;
    return this.WednesdayInput =
      document.querySelector('input[name=\'repeat.Wednesday\']');
  },

  get ThursdayInput() {
    delete this.ThursdayInput;
    return this.ThursdayInput =
      document.querySelector('input[name=\'repeat.Thursday\']');
  },

  get FridayInput() {
    delete this.FridayInput;
    return this.FridayInput =
      document.querySelector('input[name=\'repeat.Friday\']');
  },

  get SaturdayInput() {
    delete this.SaturdayInput;
    return this.SaturdayInput =
      document.querySelector('input[name=\'repeat.Saturday\']');
  },

  get SundayInput() {
    delete this.SundayInput;
    return this.SundayInput =
      document.querySelector('input[name=\'repeat.Sunday\']');
  },

  handleEvent: function(evt) {
    if (evt.type != 'click')
      return;

    var input = evt.target;
    if (!input)
      return;

    switch (input.id) {
      case 'repeat-back':
        this.saveRepeatSelection();
        break;
      default:
        break;
    }
  },

  load: function(daysPicked) {
    this.MondayInput.checked = daysPicked[0];
    this.TuesdayInput.checked = daysPicked[1];
    this.WednesdayInput.checked = daysPicked[2];
    this.ThursdayInput.checked = daysPicked[3];
    this.FridayInput.checked = daysPicked[4];
    this.SaturdayInput.checked = daysPicked[5];
    this.SundayInput.checked = daysPicked[6];
  },

  saveRepeatSelection: function() {
    var daysOfWeek = DAYSOFWEEK_DEFOBJ;

    if (this.MondayInput.checked && this.TuesdayInput.checked &&
      this.WednesdayInput.checked && this.ThursdayInput.checked &&
      this.FridayInput.checked && this.SaturdayInput.checked &&
      this.SundayInput.checked) {
      DaysOfWeek.summary = 'Every Day';
      for (var i = 0; i < 7; i++) {
        DaysOfWeek.picked[i] = true;
      }
    } else if (!this.MondayInput.checked && !this.TuesdayInput.checked &&
      !this.WednesdayInput.checked && !this.ThursdayInput.checked &&
      !this.FridayInput.checked && !this.SaturdayInput.checked &&
      !this.SundayInput.checked) {
      DaysOfWeek.summary = 'Never';
      for (var i = 0; i < 7; i++) {
        DaysOfWeek.picked[i] = false;
      }
    } else {  // Could implement Weekend, Weekday if we need
      DaysOfWeek.summary = 'Specific';
      DaysOfWeek.picked[0] = this.MondayInput.checked;
      DaysOfWeek.picked[1] = this.TuesdayInput.checked;
      DaysOfWeek.picked[2] = this.WednesdayInput.checked;
      DaysOfWeek.picked[3] = this.ThursdayInput.checked;
      DaysOfWeek.picked[4] = this.FridayInput.checked;
      DaysOfWeek.picked[5] = this.SaturdayInput.checked;
      DaysOfWeek.picked[6] = this.SundayInput.checked;
    }
    EditAlarm.refreshRepeatMenu(DaysOfWeek);
  }

};

var PickSound = {

  get element() {
    delete this.element;
    return this.element = document.getElementById('sound');
  },

  handleEvent: function(evt) {
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

  load: function(sound) {
    var radios = document.querySelectorAll('input[name="sound"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        radio.checked = sound == radio.value ? true : false;
      })(radios[i]);
    }
  },

  saveSoundMenu: function() {
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

  handleEvent: function(evt) {
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

  load: function(snooze) {
    var radios = document.querySelectorAll('input[name="snooze"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        radio.checked = snooze == radio.value ? true : false;
      })(radios[i]);
    }
  },

  saveSnoozeMenu: function() {
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

  handleEvent: function(evt) {
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

  load: function(color) {
    var radios = document.querySelectorAll('input[name="color"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        radio.checked = color == radio.value ? true : false;
      })(radios[i]);
    }
  },

  saveColorMenu: function() {
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
  load: function() {
    AlarmsTestDB.query(this.DBNAME, this.STORENAME, AlarmsTestDB.load,
      this.loadSuccess);
  },

  put: function(alarm) {
    AlarmsTestDB.query(this.DBNAME, this.STORENAME, AlarmsTestDB.put,
      this.putSuccess, alarm);
  },

  get: function(key, getSuccessHandler) {
    AlarmsTestDB.query(this.DBNAME, this.STORENAME, AlarmsTestDB.get,
      getSuccessHandler, key);
  },

  delete: function(key) {
    AlarmsTestDB.query(this.DBNAME, this.STORENAME, AlarmsTestDB.delete,
      this.deleteSuccess, key);
  },

  putSuccess: function() {
    AlarmList.refresh();
  },

  loadSuccess: function(alarms) {
    AlarmList.fill(alarms);
  },

  deleteSuccess: function() {
    AlarmList.refresh();
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
