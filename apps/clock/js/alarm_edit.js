var AlarmEdit = {

  alarm: {},
  timePicker: {
    hour: null,
    minute: null,
    hour24State: null,
    is12hFormat: false
  },
  previewRingtonePlayer: null,

  get element() {
    delete this.element;
    return this.element = document.getElementById('alarm');
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
    navigator.mozL10n.translate(this.element);
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
        if (!this.save()) {
          evt.preventDefault();
          return;
        }
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

  getDefaultAlarm: function aev_getDefaultAlarm() {
    // Reset the required message with default value
    var now = new Date();
    return {
      id: '', // for Alarm APP indexedDB id
      normalAlarmId: '', // for request AlarmAPI id (once, repeat)
      snoozeAlarmId: '', // for request AlarmAPI id (snooze)
      label: '',
      hour: now.getHours(), // use current hour
      minute: now.getMinutes(), // use current minute
      enabled: true,
      repeat: '0000000', // flags for days of week, init to false
      sound: 'ac_classic_clock_alarm.opus',
      vibrate: 1,
      snooze: 5,
      color: 'Darkorange'
    };
  },

  load: function aev_load(alarm) {
    if (this.element.classList.contains('hidden')) {
      this.element.classList.remove('hidden');
      this.init();
    }

    // scroll to top of form list
    this.scrollList.scrollTop = 0;

    window.location.hash = 'alarm';

    if (!alarm) {
      this.element.classList.add('new');
      this.alarmTitle.textContent = _('newAlarm');
      alarm = this.getDefaultAlarm();
    } else {
      this.element.classList.remove('new');
      this.alarmTitle.textContent = _('editAlarm');
    }
    this.alarm = alarm;

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
  },

  initTimeSelect: function aev_initTimeSelect() {
    // The format of input type="time" should be in HH:MM
    this.timeSelect.value = (this.alarm.hour < 10 ? '0' : '') +
                            this.alarm.hour + ':' + this.alarm.minute;
  },

  getTimeSelect: function aev_getTimeSelect() {
    return parseTime(this.timeSelect.value);
  },

  refreshTimeMenu: function aev_refreshTimeMenu(time) {
    if (!time) {
      time = this.alarm;
    }
    this.timeMenu.textContent = formatTime(time.hour, time.minute);
  },

  initRepeatSelect: function aev_initRepeatSelect() {
    var daysOfWeek = this.alarm.repeat;
    var options = this.repeatSelect.options;
    for (var i = 0; i < options.length; i++) {
      options[i].selected = (daysOfWeek.substr(i, 1) === '1') ? true : false;
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

  refreshRepeatMenu: function aev_refreshRepeatMenu(repeatOpts) {
    var daysOfWeek = (repeatOpts) ? repeatOpts : this.alarm.repeat;
    this.repeatMenu.textContent = summarizeDaysOfWeek(daysOfWeek);
  },

  initSoundSelect: function aev_initSoundSelect() {
    changeSelectByValue(this.soundSelect, this.alarm.sound);
  },

  getSoundSelect: function aev_getSoundSelect() {
    return getSelectedValue(this.soundSelect);
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
    changeSelectByValue(this.vibrateSelect, this.alarm.vibrate);
  },

  getVibrateSelect: function aev_getVibrateSelect() {
    return getSelectedValue(this.vibrateSelect);
  },

  refreshVibrateMenu: function aev_refreshVibrateMenu(vibrate) {
    vibrate = (vibrate !== undefined) ? vibrate : this.alarm.vibrate;
    // vibrate could be either string or int, so test for both
    this.vibrateMenu.textContent = (vibrate === 0 || vibrate === '0') ?
                                 _('vibrateOff') :
                                 _('vibrateOn');
  },

  initSnoozeSelect: function aev_initSnoozeSelect() {
    changeSelectByValue(this.snoozeSelect, this.alarm.snooze);
  },

  getSnoozeSelect: function aev_getSnoozeSelect() {
    return getSelectedValue(this.snoozeSelect);
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
    this.alarm.enabled = true;

    var time = this.getTimeSelect();
    this.alarm.hour = time.hour;
    this.alarm.minute = time.minute;
    this.alarm.repeat = this.getRepeatSelect();
    this.alarm.sound = this.getSoundSelect();
    this.alarm.vibrate = this.getVibrateSelect();
    this.alarm.snooze = parseInt(this.getSnoozeSelect(), 10);

    if (!error) {
      AlarmManager.putAlarm(this.alarm, function al_putAlarmList(alarm) {
        AlarmManager.toggleAlarm(alarm, alarm.enabled);
        AlarmList.refresh();
        callback && callback(alarm);
      });
    }

    return !error;
  },

  delete: function aev_delete(callback) {
    if (!this.element.dataset.id)
      return;

    var alarm = this.alarm;
    AlarmManager.delete(alarm, function aev_delete() {
      AlarmList.refresh();
      callback && callback(alarm);
    });
  }

};
