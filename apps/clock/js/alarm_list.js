'use strict';

var _ = navigator.mozL10n.get;

var AlarmList = {

  alarmList: [],
  refreshingAlarms: [],
  count: 0,

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

  template: null,

  handleEvent: function al_handleEvent(evt) {

    var link = evt.target;
    if (!link)
      return;

    if (link === this.newAlarmButton) {

      this.alarmEditView();
    } else if (link.classList.contains('input-enable')) {
      this.toggleAlarmEnableState(link.checked,
        this.getAlarmFromList(parseInt(link.dataset.id, 10)));
    } else if (link.classList.contains('alarm-item')) {

      this.alarmEditView(this.getAlarmFromList(
        parseInt(link.dataset.id, 10)));
    }
  },

  alarmEditView: function(alarm) {
    LazyLoader.load(
      [
        document.getElementById('alarm'),
        'js/alarm_edit.js',
        'shared/style/input_areas.css',
        'shared/style/buttons.css',
        'shared/style/edit_mode.css'
      ],
      function() {
        AlarmEdit.load(alarm);
    });
  },

  init: function al_init() {
    this.template = new Template('alarm-list-item-tmpl');
    this.newAlarmButton.addEventListener('click', this);
    this.alarms.addEventListener('click', this);
    this.refresh();
    AlarmManager.regUpdateAlarmEnableState(this.refreshItem.bind(this));
  },

  refresh: function al_refresh() {
    AlarmsDB.getAlarmList(function al_gotAlarmList(err, list) {
      if (!err) {
        this.fillList(list);
      } else {
        console.error(err);
      }
    }.bind(this));
  },

  render: function al_render(alarm) {
    var repeat = alarm.isRepeating() ?
      alarm.summarizeDaysOfWeek() : '';
    var isActive = alarm.registeredAlarms.normal ||
      alarm.registeredAlarms.snooze;
    var checked = !!isActive ? 'checked=true' : '';

    var d = new Date();
    d.setHours(alarm.hour);
    d.setMinutes(alarm.minute);

    var id = alarm.id + '';
    var time = Utils.getLocaleTime(d);
    var label = alarm.label ? alarm.label : _('alarm');

    return this.template.interpolate({
      id: id,
      checked: checked,
      label: label,
      meridian: time.p,
      repeat: repeat,
      time: time.t
    });
  },

  createItem: function al_createItem(alarm, prependTarget) {
    /**
     * createItem
     *
     * Render and then prepend an alarm to the DOM element
     * prependTarget
     *
     */
    var count = this.getAlarmCount();
    var li = document.createElement('li');
    li.className = 'alarm-cell';
    li.id = 'alarm-' + alarm.id;
    li.innerHTML = this.render(alarm);

    if (prependTarget) {
      prependTarget.insertBefore(li, prependTarget.firstChild);

      if (this.count !== count) {
        this.count = count;
        ClockView.resizeAnalogClock();
      }
    }
    return li;
  },

  refreshItem: function al_refreshItem(alarm) {
    var li, index;
    var id = alarm.id;

    if (!this.getAlarmFromList(id)) {
      this.alarmList.push(alarm);
      this.alarmList.sort(function(a, b) {
        return a.id - b.id;
      });
      this.createItem(alarm, this.alarms);
    } else {
      this.setAlarmFromList(id, alarm);
      li = this.alarms.querySelector('#alarm-' + id);
      li.innerHTML = this.render(alarm);

      // clear the refreshing alarm's flag
      index = this.refreshingAlarms.indexOf(id);

      if (index !== -1) {
        this.refreshingAlarms.splice(index, 1);
      }
    }
  },

  fillList: function al_fillList(alarmList) {
    /**
     * fillList
     *
     * Render all alarms in alarmList to the DOM in
     * decreasing order
     *
     */
    this.alarms.innerHTML = '';
    this.alarmList = alarmList;

    alarmList.sort(function(a, b) {
      return a.id - b.id;
    }).forEach(function al_fillEachList(alarm) {
      // prepend the rendered alarm to the alarm list
      this.createItem(alarm, this.alarms);
    }.bind(this));
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
    // Todo: queue actions instead of dropping them
    if (this.refreshingAlarms.indexOf(alarm.id) !== -1) {
      return;
    }
    var changed = false;
    // has a snooze active
    if (alarm.registeredAlarms.snooze !== undefined) {
      if (!enabled) {
        alarm.cancel('snooze');
        changed = true;
      }
    }
    // normal state needs to change
    if (alarm.enabled !== enabled) {
      this.refreshingAlarms.push(alarm.id);
      // setEnabled saves to database
      alarm.setEnabled(!alarm.enabled, function al_putAlarm(err, alarm) {
        if (alarm.enabled) {
          AlarmManager.renderBannerBar(alarm.getNextAlarmFireTime());
        }
        this.refreshItem(alarm);
        AlarmManager.updateAlarmStatusBar();
      }.bind(this));
    } else {
      if (changed) {
        alarm.save();
      }
      AlarmManager.updateAlarmStatusBar();
    }
  }

};
