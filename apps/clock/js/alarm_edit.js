define(function(require) {

var Alarm = require('alarm');
var AlarmList = require('alarm_list');
var AlarmManager = require('alarm_manager');
var ClockView = require('clock_view');
var Utils = require('utils');
var constants = require('constants');
var mozL10n = require('l10n');
var _ = mozL10n.get;

var AlarmEdit = {

  alarm: null,
  alarmRef: null,
  timePicker: {
    hour: null,
    minute: null,
    hour24State: null,
    is12hFormat: false
  },
  previewRingtonePlayer: null,

  get element() {
    delete this.element;
    return this.element = document.getElementById('alarm-edit-panel');
  },

  get scrollList() {
    delete this.scrollList;
    return this.scrollList = document.getElementById('edit-alarm');
  },

  get labelInput() {
    delete this.labelInput;
    return this.labelInput =
      document.querySelector('input[name="alarm.label"]');
  },

  get timeSelect() {
    delete this.timeSelect;
    return this.timeSelect = document.getElementById('time-select');
  },

  get timeMenu() {
    delete this.timeMenu;
    return this.timeMenu = document.getElementById('time-menu');
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

  get vibrateMenu() {
    delete this.vibrateMenu;
    return this.vibrateMenu = document.getElementById('vibrate-menu');
  },

  get vibrateSelect() {
    delete this.vibrateSelect;
    return this.vibrateSelect = document.getElementById('vibrate-select');
  },

  get snoozeMenu() {
    delete this.snoozeMenu;
    return this.snoozeMenu = document.getElementById('snooze-menu');
  },

  get snoozeSelect() {
    delete this.snoozeSelect;
    return this.snoozeSelect = document.getElementById('snooze-select');
  },

  get deleteButton() {
    delete this.deleteButton;
    return this.deleteButton = document.getElementById('alarm-delete');
  },

  get backButton() {
    delete this.backElement;
    return this.backElement = document.getElementById('alarm-close');
  },

  get doneButton() {
    delete this.doneButton;
    return this.doneButton = document.getElementById('alarm-done');
  },

  init: function aev_init() {
    mozL10n.translate(this.element);
    this.backButton.addEventListener('click', this);
    this.doneButton.addEventListener('click', this);
    this.timeMenu.addEventListener('click', this);
    this.timeSelect.addEventListener('blur', this);
    this.repeatMenu.addEventListener('click', this);
    this.repeatSelect.addEventListener('blur', this);
    this.soundMenu.addEventListener('click', this);
    this.soundSelect.addEventListener('change', this);
    this.soundSelect.addEventListener('blur', this);
    this.vibrateMenu.addEventListener('click', this);
    this.vibrateSelect.addEventListener('blur', this);
    this.snoozeMenu.addEventListener('click', this);
    this.snoozeSelect.addEventListener('blur', this);
    this.deleteButton.addEventListener('click', this);
    this.init = function() {};
  },

  handleEvent: function aev_handleEvent(evt) {
    evt.preventDefault();
    var input = evt.target;
    if (!input)
      return;

    switch (input) {
      case this.backButton:
        ClockView.show();
        break;
      case this.doneButton:
        ClockView.show();
        this.save(function aev_saveCallback(err, alarm) {
          if (err) {
            return;
          }
          AlarmList.refreshItem(alarm);
        });
        break;
      case this.timeMenu:
        this.focusMenu(this.timeSelect);
        break;
      case this.timeSelect:
        this.refreshTimeMenu(this.getTimeSelect());
        break;
      case this.repeatMenu:
        this.focusMenu(this.repeatSelect);
        break;
      case this.repeatSelect:
        this.refreshRepeatMenu(this.getRepeatSelect());
        break;
      case this.soundMenu:
        this.focusMenu(this.soundSelect);
        break;
      case this.soundSelect:
        switch (evt.type) {
          case 'change':
            this.refreshSoundMenu(this.getSoundSelect());
            this.previewSound();
            break;
          case 'blur':
            this.stopPreviewSound();
            break;
        }
        break;
      case this.vibrateMenu:
        this.focusMenu(this.vibrateSelect);
        break;
      case this.vibrateSelect:
        this.refreshVibrateMenu(this.getVibrateSelect());
        break;
      case this.snoozeMenu:
        this.focusMenu(this.snoozeSelect);
        break;
      case this.snoozeSelect:
        this.refreshSnoozeMenu(this.getSnoozeSelect());
        break;
      case this.deleteButton:
        ClockView.show();
        this.delete();
        break;
    }
  },

  focusMenu: function aev_focusMenu(menu) {
    setTimeout(function() { menu.focus(); }, 10);
  },

  load: function aev_load(alarm) {
    this.init();
    // scroll to top of form list
    this.scrollList.scrollTop = 0;

    if (!alarm) {
      this.element.classList.add('new');
      this.alarmTitle.textContent = _('newAlarm');
      alarm = new Alarm();
    } else {
      this.element.classList.remove('new');
      this.alarmTitle.textContent = _('editAlarm');
    }
    this.alarm = new Alarm(alarm);

    this.element.dataset.id = alarm.id;
    this.labelInput.value = alarm.label;

    // Init time, repeat, sound, snooze selection menu.
    this.initTimeSelect();
    this.refreshTimeMenu();
    this.initRepeatSelect();
    this.refreshRepeatMenu();
    this.initSoundSelect();
    this.refreshSoundMenu();
    this.initVibrateSelect();
    this.refreshVibrateMenu();
    this.initSnoozeSelect();
    this.refreshSnoozeMenu();
    location.hash = '#alarm-edit-panel';
  },

  initTimeSelect: function aev_initTimeSelect() {
    // The format of input type="time" should be in HH:MM
    this.timeSelect.value = (this.alarm.hour < 10 ? '0' : '') +
                            this.alarm.hour + ':' +
                            (this.alarm.minute < 10 ? '0' : '') +
                            this.alarm.minute;
  },

  getTimeSelect: function aev_getTimeSelect() {
    return Utils.parseTime(this.timeSelect.value);
  },

  refreshTimeMenu: function aev_refreshTimeMenu(time) {
    if (!time) {
      time = this.alarm;
    }
    this.timeMenu.textContent = Utils.format.time(time.hour, time.minute);
  },

  initRepeatSelect: function aev_initRepeatSelect() {
    var daysOfWeek = this.alarm.repeat;
    var options = this.repeatSelect.options;
    for (var i = 0; i < options.length; i++) {
      options[i].selected = daysOfWeek[constants.DAYS[i]] === true;
    }
    this.refreshRepeatMenu(null);
  },

  getRepeatSelect: function aev_getRepeatSelect() {
    var daysOfWeek = {};
    var options = this.repeatSelect.options;
    for (var i = 0; i < options.length; i++) {
      if (options[i].selected) {
        daysOfWeek[constants.DAYS[i]] = true;
      }
    }
    return daysOfWeek;
  },

  refreshRepeatMenu: function aev_refreshRepeatMenu(repeatOpts) {
    var daysOfWeek;
    if (repeatOpts) {
      this.alarm.repeat = this.getRepeatSelect();
    }
    daysOfWeek = this.alarm.repeat;
    this.repeatMenu.textContent = this.alarm.summarizeDaysOfWeek(daysOfWeek);
  },

  initSoundSelect: function aev_initSoundSelect() {
    Utils.changeSelectByValue(this.soundSelect, this.alarm.sound);
  },

  getSoundSelect: function aev_getSoundSelect() {
    return Utils.getSelectedValue(this.soundSelect);
  },

  refreshSoundMenu: function aev_refreshSoundMenu(sound) {
    // Refresh and parse the name of sound file for sound menu.
    sound = (sound !== undefined) ? sound : this.alarm.sound;
    // sound could either be string or int, so test for both
    this.soundMenu.textContent = (sound === 0 || sound === '0') ?
                               _('noSound') :
                               _(sound.replace('.', '_'));
  },

  previewSound: function aev_previewSound() {
    var ringtonePlayer = this.previewRingtonePlayer;
    if (!ringtonePlayer) {
      this.previewRingtonePlayer = new Audio();
      ringtonePlayer = this.previewRingtonePlayer;
    } else {
      ringtonePlayer.pause();
    }

    var ringtoneName = this.getSoundSelect();
    var previewRingtone = 'shared/resources/media/alarms/' + ringtoneName;
    ringtonePlayer.mozAudioChannelType = 'alarm';
    ringtonePlayer.src = previewRingtone;
    ringtonePlayer.play();
  },

  stopPreviewSound: function aev_stopPreviewSound() {
    if (this.previewRingtonePlayer)
      this.previewRingtonePlayer.pause();
  },

  initVibrateSelect: function aev_initVibrateSelect() {
    Utils.changeSelectByValue(this.vibrateSelect, this.alarm.vibrate);
  },

  getVibrateSelect: function aev_getVibrateSelect() {
    return Utils.getSelectedValue(this.vibrateSelect);
  },

  refreshVibrateMenu: function aev_refreshVibrateMenu(vibrate) {
    vibrate = (vibrate !== undefined) ? vibrate : this.alarm.vibrate;
    // vibrate could be either string or int, so test for both
    this.vibrateMenu.textContent = (vibrate === 0 || vibrate === '0') ?
                                 _('vibrateOff') :
                                 _('vibrateOn');
  },

  initSnoozeSelect: function aev_initSnoozeSelect() {
    Utils.changeSelectByValue(this.snoozeSelect, this.alarm.snooze);
  },

  getSnoozeSelect: function aev_getSnoozeSelect() {
    return Utils.getSelectedValue(this.snoozeSelect);
  },

  refreshSnoozeMenu: function aev_refreshSnoozeMenu(snooze) {
    snooze = (snooze) ? this.getSnoozeSelect() : this.alarm.snooze;
    this.snoozeMenu.textContent = _('nMinutes', {n: snooze});
  },

  save: function aev_save(callback) {
    if (this.element.dataset.id !== '') {
      this.alarm.id = parseInt(this.element.dataset.id, 10);
    } else {
      delete this.alarm.id;
    }
    var error = false;

    this.alarm.label = this.labelInput.value;

    var time = this.getTimeSelect();
    this.alarm.time = [time.hour, time.minute];
    this.alarm.repeat = this.getRepeatSelect();
    this.alarm.sound = this.getSoundSelect();
    this.alarm.vibrate = this.getVibrateSelect();
    this.alarm.snooze = parseInt(this.getSnoozeSelect(), 10);

    if (!error) {
      this.alarm.cancel();
      this.alarm.setEnabled(true, function(err, alarm) {
        if (err) {
          callback && callback(err, alarm);
          return;
        }
        AlarmList.refreshItem(alarm);
        AlarmList.banner.show(alarm.getNextAlarmFireTime());
        AlarmManager.updateAlarmStatusBar();
        callback && callback(null, alarm);
      });
    } else {
      // error
      if (callback) {
        callback(error);
      }
    }

    return !error;
  },

  delete: function aev_delete(callback) {
    if (!this.alarm.id) {
      setTimeout(callback.bind(null, new Error('no alarm id')), 0);
      return;
    }

    this.alarm.delete(function aev_delete(err, alarm) {
      AlarmList.refresh();
      AlarmManager.updateAlarmStatusBar();
      callback && callback(err, alarm);
    });
  }

};

return AlarmEdit;
});
