define(function(require) {
'use strict';

var Banner = require('banner');
var AlarmsDB = require('alarmsdb');
var AlarmManager = require('alarm_manager');
var Utils = require('utils');
var Template = require('shared/js/template');
var mozL10n = require('l10n');
var _ = mozL10n.get;

var AlarmList = {

  alarmList: [],

  // Lookup table mapping alarm IDs to the number "toggle" operations currently
  // in progress.
  toggleOperations: {},
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
      evt.preventDefault();
    } else if (link.classList.contains('input-enable')) {
      this.toggleAlarmEnableState(link.checked,
        this.getAlarmFromList(parseInt(link.dataset.id, 10)));
    } else if (link.classList.contains('alarm-item')) {
      this.alarmEditView(this.getAlarmFromList(
        parseInt(link.dataset.id, 10)));
      evt.preventDefault();
    }
  },

  alarmEditView: function(alarm) {
    require(['alarm_edit'], function(AlarmEdit) {
      AlarmEdit.load(alarm);
    });
  },

  init: function al_init() {
    this.template = new Template('alarm-list-item-tmpl');
    this.newAlarmButton.addEventListener('click', this);
    this.alarms.addEventListener('click', this);
    this.banner = new Banner('banner-countdown', 'banner-tmpl');
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
    var withRepeat = alarm.isRepeating() ? ' with-repeat' : '';
    // Because `0` is a valid value for these attributes, check for their
    // presence with the `in` operator.
    var isActive = 'normal' in alarm.registeredAlarms ||
      'snooze' in alarm.registeredAlarms;
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
      withRepeat: withRepeat,
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
        // TODO: Address this circular dependency
        require(['clock_view'], function(ClockView) {
        ClockView.resizeAnalogClock();
        });
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
      if (id in this.toggleOperations) {
        delete this.toggleOperations[id];
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
    var changed = false;
    var toggleOps = this.toggleOperations;
    // has a snooze active
    if (alarm.registeredAlarms.snooze !== undefined) {
      if (!enabled) {
        alarm.cancel('snooze');
        changed = true;
      }
    }
    // normal state needs to change
    if (alarm.enabled !== enabled) {
      toggleOps[alarm.id] = (toggleOps[alarm.id] || 0) + 1;
      // setEnabled saves to database
      alarm.setEnabled(!alarm.enabled, function al_putAlarm(err, alarm) {
        toggleOps[alarm.id]--;

        // If there are any pending toggle operations, the current state of
        // the alarm is volatile, so do not update the DOM.
        if (toggleOps[alarm.id] > 0) {
          return;
        }
        delete toggleOps[alarm.id];

        if (alarm.enabled) {
          this.banner.show(alarm.getNextAlarmFireTime());
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

return AlarmList;
});
