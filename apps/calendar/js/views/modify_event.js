define(function(require, exports, module) {
'use strict';

var AlarmTemplate = require('templates/alarm');
var EventBase = require('./event_base');
var InputParser = require('shared/input_parser');
var QueryString = require('querystring');
var co = require('ext/co');
var core = require('core');
var dateFormat = require('date_format');
var getTimeL10nLabel = require('common/calc').getTimeL10nLabel;
var localCalendarId = require('common/constants').localCalendarId;
var router = require('router');
var viewFactory = require('./factory');

require('dom!modify-event-view');

function ModifyEvent(options) {
  this.deleteRecord = this.deleteRecord.bind(this);
  this._toggleAllDay = this._toggleAllDay.bind(this);
  EventBase.apply(this, arguments);
}
module.exports = ModifyEvent;

ModifyEvent.prototype = {
  __proto__: EventBase.prototype,

  ERROR_PREFIX: 'event-error-',

  MAX_ALARMS: 5,

  formats: {
    date: 'dateTimeFormat_%x',
    time: 'shortTimeFormat'
  },

  selectors: {
    element: '#modify-event-view',
    alarmList: '#modify-event-view .alarms',
    form: '#modify-event-view form',
    startTimeLocale: '#start-time-locale',
    endDateLocale: '#end-date-locale',
    endTimeLocale: '#end-time-locale',
    status: '#modify-event-view section[role="status"]',
    errors: '#modify-event-view .errors',
    primaryButton: '#modify-event-view .save',
    deleteButton: '#modify-event-view .delete-record',
    header: '#modify-event-header'
  },

  uiSelector: '[name="%"]',

  _duration: 0, // The duration between start and end dates.

  _initEvents: function() {
    EventBase.prototype._initEvents.apply(this, arguments);

    this.deleteButton.addEventListener('click', this.deleteRecord);
    this.form.addEventListener('click', this.focusHandler);
    this.form.addEventListener('submit', this.primary);
    this.form.addEventListener('input', this._toggleSave.bind(this));

    var allday = this.getEl('allday');
    allday.addEventListener('change', this._toggleAllDay);

    this.alarmList.addEventListener('change', this._changeAlarm.bind(this));
  },

  /**
   * Fired when the allday checkbox changes.
   */
  _toggleAllDay: function(e) {
    var allday = this.getEl('allday').checked;

    if (allday) {
      // enable case
      this.element.classList.add(this.ALLDAY);
    } else {
      // disable case
      this.element.classList.remove(this.ALLDAY);
      if (e) {
        // only reset the start/end time if coming from an user interaction
        this._resetDateTime();
      }
    }

    // because of race conditions it is theoretically possible
    // for the user to check/uncheck this value
    // when we don't actually have a model loaded.
    if (this.event) {
      this.event.isAllDay = !!allday;
    }

    // Reset alarms if we come from a user event
    if (e) {
      this.event.alarms = [];
      this.updateAlarms(allday);
    }
  },

  _resetDateTime: function() {
    // if start event was "all day" and switch to regular event start/end time
    // will be the same, so we reset to default start time, otherwise we keep
    // the previously selected value
    var startDateTime = this._getStartDateTime();
    if (startDateTime === this._getEndDateTime()) {
      var startDate = new Date(startDateTime);
      this._setDefaultHour(startDate);
      this.getEl('startTime').value = InputParser.exportTime(startDate);
      this._renderDateTimeLocale(
        this._findElement('startTimeLocale'), startDate);
      // default event duration is 1 hour
      this._duration = 60 * 60 * 1000;
      this._setEndDateTimeWithCurrentDuration();
    }
  },

  /**
   * Called when any alarm is changed
   */
  _changeAlarm: function(e) {
    var template = AlarmTemplate;
    if (e.target.value == 'none') {
      var parent = e.target.parentNode;
      parent.parentNode.removeChild(parent);
      return;
    }

    // Append a new alarm select only if we don't have an empty one or if we
    // didn't reach the maximum number of alarms
    var alarms = this.queryAlarms();
    if (alarms.length >= this.MAX_ALARMS ||
        alarms.some(el => el.value === 'none')) {
      return;
    }

    var newAlarm = document.createElement('div');
    newAlarm.innerHTML = template.picker.render({
      layout: this.event.isAllDay ? 'allday' : 'standard'
    });
    this.alarmList.appendChild(newAlarm);
  },

  /**
   * Check if current event has been stored in the database
   */
  isSaved: function() {
    return this.element.classList.contains(this.UPDATE);
  },

  /**
   * Build the initial list of calendar ids.
   */
  onfirstseen: function() {
    // we need to notify users (specially automation tests) somehow that the
    // options are still being loaded from DB, this is very important to
    // avoid race conditions (eg.  trying to set calendar before list is
    // built) notice that we also add the class to the markup because on some
    // really rare occasions "onfirstseen" is called after the EventBase
    // removed the "loading" class from the root element (seen it happen less
    // than 1% of the time)
    this.getEl('calendarId').classList.add(this.LOADING);
  },

  _renderCalendars: function(records) {
    // remove old calendars (this will be called every time we have a change on
    // any calendar)
    var select = this.getEl('calendarId');
    // remove all the options
    select.options.length = 0;
    select.classList.remove(this.LOADING);

    records
    .filter(r => r.capabilities.canCreateEvent)
    .forEach(record => {
      var id = record.calendar._id;
      var {name} = record.calendar.remote;
      var option = document.createElement('option');

      if (id === localCalendarId) {
        option.text = navigator.mozL10n.get('calendar-local');
        option.setAttribute('data-l10n-id', 'calendar-local');
      } else {
        option.text = name;
      }

      option.value = id;
      select.add(option);
    });
  },

  /**
   * Mark all field's readOnly flag.
   *
   * @param {Boolean} boolean true/false.
   */
  _markReadonly: function(boolean) {
    var i = 0;
    var fields = this.form.querySelectorAll('[name]');
    var len = fields.length;

    for (; i < len; i++) {
      fields[i].readOnly = boolean;
    }
  },

  queryAlarms: function() {
    return Array.from(document.querySelectorAll('[name="alarm[]"]'));
  },

  get alarmList() {
    return this._findElement('alarmList');
  },

  get form() {
    return this._findElement('form');
  },

  get deleteButton() {
    return this._findElement('deleteButton');
  },

  get fieldRoot() {
    return this.form;
  },

  /**
   * Ask the provider to persist an event:
   *
   *  1. update the model with form data
   *
   *  2. send it to the provider if it has the capability
   *
   *  3. set the position of the calendar to startDate of new/edited event.
   *
   *  4. redirect to last view.
   *
   * For now both update & create share the same
   * behaviour (redirect) in the future we may change this.
   */
  _persistEvent: co.wrap(function *(method) {
    // create model data
    var data = this.formData();
    var errors;

    // we check explicitly for true, because the alternative
    // is an error object.
    if ((errors = this.event.updateAttributes(data)) !== true) {
      this.showErrors(errors);
      return;
    }

    // can't create without a calendar id
    // because of defaults this should be impossible.
    if (!data.calendarId) {
      return;
    }

    // mark view as 'in progress' so we can style
    // it via css during that time period
    this.element.classList.add(this.PROGRESS);

    try {
      // need to store date before async operation (event might change)
      var moveDate = this.event.startDate;
      yield core.bridge[method](this.event);
      // move the position in the calendar to the added/edited day
      core.timeController.move(moveDate);
      // order is important the above method triggers the building
      // of the dom elements so selectedDay must come after.
      core.timeController.selectedDay = moveDate;
      this._navigateAfterPersist(method, moveDate);
    } catch(err) {
      this.showErrors(err);
    }

    this.element.classList.remove(this.PROGRESS);
  }),

  _navigateAfterPersist: function(method, moveDate) {
    // we pass the date so we are able to scroll to the event on the
    // day/week views
    var state = {
      eventStartHour: moveDate.getHours()
    };

    if (method === 'updateEvent') {
      // If we edit a view our history stack looks like:
      //   /week -> /event/view -> /event/save -> /event/view
      // We need to return all the way to the top of the stack
      // We can remove this once we have a history stack
      viewFactory.get('ViewEvent', v => router.go(v.returnTop(), state));
      return;
    }

    router.go(this.returnTo(), state);
  },

  /**
   * Deletes current record if provider is present and has the capability.
   */
  deleteRecord: co.wrap(function *(event) {
    if (event) {
      event.preventDefault();
    }

    if (!this.isSaved()) {
      return;
    }

    try {
      yield core.bridge.deleteEvent(this.event);
      // If we edit a view our history stack looks like:
      //   /week -> /event/view -> /event/save -> /event/view
      // We need to return all the way to the top of the stack
      // We can remove this once we have a history stack
      viewFactory.get('ViewEvent', view => {
        router.go(view.returnTop());
      });
    } catch(err) {
      this.showErrors(err);
    }
  }),

  /**
   * Persist current model.
   */
  primary: function(event) {
    if (event) {
      event.preventDefault();
    }

    // Disable the button on primary event to avoid race conditions
    this.disablePrimary();

    if (this.isSaved()) {
      this._persistEvent('updateEvent');
    } else {
      this._persistEvent('createEvent');
    }
  },

  /**
   * Enlarges focus areas for .button controls
   */
  focusHandler: function(e) {
    var input = e.target.querySelector('input, select');
    if (input && e.target.classList.contains('button')) {
      input.focus();
    }
  },

  /**
   * Export form information into a format
   * the model can understand.
   *
   * @return {Object} formatted data suitable
   *                  for use with Calendar.Model.Event.
   */
  formData: function() {
    var fields = {
      title: this.getEl('title').value,
      location: this.getEl('location').value,
      description: this.getEl('description').value,
      calendarId: this.getEl('calendarId').value
    };

    var startTime;
    var endTime;
    var allday = this.getEl('allday').checked;

    if (allday) {
      startTime = null;
      endTime = null;
    } else {
      startTime = this.getEl('startTime').value;
      endTime = this.getEl('endTime').value;
    }

    fields.startDate = InputParser.formatInputDate(
      this.getEl('startDate').value,
      startTime
    );

    fields.endDate = InputParser.formatInputDate(
      this.getEl('endDate').value,
      endTime
    );

    if (allday) {
      // when the event is all day we display the same
      // day that the entire event spans but we must actually
      // end the event at the first second, minute hour of the next
      // day. This will ensure the server handles it as an all day event.
      fields.endDate.setDate(
        fields.endDate.getDate() + 1
      );
    }

    fields.alarms = [];
    var triggers = ['none'];
    this.queryAlarms().forEach(alarm => {
      if (triggers.indexOf(alarm.value) !== -1) {
        return;
      }

      triggers.push(alarm.value);

      fields.alarms.push({
        action: 'DISPLAY',
        trigger: parseInt(alarm.value, 10)
      });
    });

    return fields;
  },

  enablePrimary: function() {
    var btn = this.primaryButton;
    btn.removeAttribute('aria-disabled');
    btn.removeAttribute('disabled');
  },

  disablePrimary: function() {
    var btn = this.primaryButton;
    btn.setAttribute('aria-disabled', 'true');
    btn.setAttribute('disabled', 'disabled');
  },

  /**
   * Re-enable the primary button when we show errors
   */
  showErrors: function() {
    this.enablePrimary();
    EventBase.prototype.showErrors.apply(this, arguments);
  },

  /**
   * Read the urlparams and override stuff on our event model.
   * @param {string} search Optional string of the form ?foo=bar&cat=dog.
   * @private
   */
  _overrideEvent: function(search) {
    search = search || window.location.search;
    if (!search || search.length === 0) {
      return;
    }

    // Remove the question mark that begins the search.
    if (search.substr(0, 1) === '?') {
      search = search.substr(1, search.length - 1);
    }

    var field, value;
    // Parse the urlparams.
    var params = QueryString.parse(search);
    for (field in params) {
      value = params[field];
      switch (field) {
        case ModifyEvent.OverrideableField.START_DATE:
        case ModifyEvent.OverrideableField.END_DATE:
          params[field] = new Date(value);
          break;
        default:
          params[field] = value;
          break;
      }
    }

    // Override fields on our event.
    var model = this.event;
    for (field in ModifyEvent.OverrideableField) {
      value = ModifyEvent.OverrideableField[field];
      model[value] = params[value] || model[value];
    }
  },

  /**
   * Updates form to use values from the current model.
   *
   * Does not handle readonly flags or calenarId associations.
   * Suitable for use in pre-populating values for both new and
   * existing events.
   *
   * Resets any value on the current form.
   */
  _updateUI: function() {
    this._overrideEvent();
    this.form.reset();

    var model = this.event;
    this.getEl('title').value = model.title;
    this.getEl('location').value = model.location;
    var dateSrc = model;
    if (model.remote.isRecurring && this.busytime) {
      dateSrc = this.busytime;
    }

    var startDate = dateSrc.startDate;
    var endDate = dateSrc.endDate;
    this._duration = endDate.getTime() - startDate.getTime();

    // update the allday status of the view
    var allday = this.getEl('allday');
    if (allday && (allday.checked = model.isAllDay)) {
      this._toggleAllDay();
      endDate = this.formatEndDate(endDate);
    }

    this.getEl('startDate').value = InputParser.exportDate(startDate);
    this._setupDateTimeSync('startDate', 'start-date-locale', startDate);

    this.getEl('endDate').value = InputParser.exportDate(endDate);
    this._setupDateTimeSync('endDate', 'end-date-locale', endDate);

    this.getEl('startTime').value = InputParser.exportTime(startDate);
    this._setupDateTimeSync('startTime', 'start-time-locale', startDate);

    this.getEl('endTime').value = InputParser.exportTime(endDate);
    this._setupDateTimeSync('endTime', 'end-time-locale', endDate);

    this.getEl('description').textContent = model.description;

    // update calendar id
    this.getEl('calendarId').value = model.calendarId;

    // calendar display
    var currentCalendar = this.getEl('currentCalendar');

    if (this.originalCalendar) {
      currentCalendar.value =
        this.originalCalendar.remote.name;

      currentCalendar.readOnly = true;
    }

    this.updateAlarms(model.isAllDay);
    this._toggleSave();
  },

  _toggleSave: function() {
    var enabled = this.getEl('title').value || this.getEl('location').value;
    if (enabled) {
      this.enablePrimary();
    } else {
      this.disablePrimary();
    }
  },

  /**
   * Handling a layer over <input> to have localized
   * date/time
   */
  _setupDateTimeSync: function(src, target, value) {
    var targetElement = document.getElementById(target);
    if (!targetElement) {
      return;
    }
    this._renderDateTimeLocale(targetElement, value);

    var type = targetElement.dataset.type;
    var callback = type === 'date' ?
      this._updateDateLocaleOnInput : this._updateTimeLocaleOnInput;

    this.getEl(src)
      .addEventListener('input', function(e) {
        callback.call(this, targetElement, e);

        // We only auto change the end date and end time
        // when user changes start date or start time,
        // or end datetime is NOT after start datetime
        // after changing end date or end time.
        // Otherwise, we don't auto change end date and end time.
        if (targetElement.id === 'start-date-locale' ||
            targetElement.id === 'start-time-locale') {
          this._setEndDateTimeWithCurrentDuration();
        } else if (this._getEndDateTime() <= this._getStartDateTime()) {
          this._setEndDateTimeWithCurrentDuration();
          this.showErrors({
            name: type === 'date' ?
              'start-date-after-end-date' :
              'start-time-after-end-time'
          });
        }

        this._duration = this._getEndDateTime() - this._getStartDateTime();
      }.bind(this));
  },

  _setEndDateTimeWithCurrentDuration: function() {
    var date = new Date(this._getStartDateTime() + this._duration);
    var endDateLocale = this._findElement('endDateLocale');
    var endTimeLocale = this._findElement('endTimeLocale');
    this.getEl('endDate').value = InputParser.exportDate(date);
    this.getEl('endTime').value = InputParser.exportTime(date);
    this._renderDateTimeLocale(endDateLocale, date);
    this._renderDateTimeLocale(endTimeLocale, date);
  },

  _getStartDateTime: function() {
    return new Date(this.getEl('startDate').value + 'T' +
      this.getEl('startTime').value).getTime();
  },

  _getEndDateTime: function() {
    return new Date(this.getEl('endDate').value + 'T' +
      this.getEl('endTime').value).getTime();
  },

  _renderDateTimeLocale: function(targetElement, value) {
    // we inject the targetElement to make it easier to test
    var type = targetElement.dataset.type;
    var localeFormat = dateFormat.localeFormat;
    var formatKey = this.formats[type];
    if (type === 'time') {
      formatKey = getTimeL10nLabel(formatKey);
    }
    var format = navigator.mozL10n.get(formatKey);
    targetElement.textContent = localeFormat(value, format);
    // we need to store the format and date for l10n
    targetElement.setAttribute('data-l10n-date-format', formatKey);
    targetElement.dataset.date = value;
  },

  _updateDateLocaleOnInput: function(targetElement, e) {
    var selected = InputParser.importDate(e.target.value);
    // use date constructor to avoid issues, see Bug 966516
    var date = new Date(selected.year, selected.month, selected.date);
    this._renderDateTimeLocale(targetElement, date);
  },

  _updateTimeLocaleOnInput: function(targetElement, e) {
    var selected = InputParser.importTime(e.target.value);
    var date = new Date();
    date.setHours(selected.hours);
    date.setMinutes(selected.minutes);
    date.setSeconds(0);
    this._renderDateTimeLocale(targetElement, date);
  },

  /**
   * Called on render or when toggling an all-day event
   */
  updateAlarms: co.wrap(function *(isAllDay) {
    var template = AlarmTemplate;
    var alarms = [];

    // Used to make sure we don't duplicate alarms
    var alarmMap = {};

    if (this.event.alarms) {
      //jshint boss:true
      for (var i = 0, alarm; alarm = this.event.alarms[i]; i++) {
        alarmMap[alarm.trigger] = true;
        alarm.layout = isAllDay ? 'allday' : 'standard';
        alarms.push(alarm);
      }
    }

    var layout = isAllDay ? 'allday' : 'standard';
    var value = yield core.bridge.getSetting(layout + 'AlarmDefault');

    if (!this.isSaved() && !alarmMap[value] && !this.event.alarms.length) {
      alarms.push({
        layout: layout,
        trigger: value
      });
    }

    // Bug_898242 to show an event when default is 'none',
    // we check if the event is not saved, if so, we push
    // the default alarm on to the list.
    if ((value === 'none' && this.isSaved()) || value !== 'none') {
      alarms.push({
        layout: layout
      });
    }

    this.alarmList.innerHTML = template.picker.renderEach(alarms).join('');
  }),

  reset: function() {
    var list = this.element.classList;

    list.remove(this.UPDATE);
    list.remove(this.CREATE);
    list.remove(this.READONLY);
    list.remove(this.ALLDAY);

    var allday = this.getEl('allday');

    if (allday) {
      allday.checked = false;
    }

    this._returnTo = null;
    this._markReadonly(false);
    this.event = null;
    this.busytime = null;

    this.alarmList.innerHTML = '';

    this.form.reset();
  },

  onactive: function() {
    EventBase.prototype.onactive.apply(this, arguments);
    this.calendarStream = core.bridge.observeCalendars();
    this.calendarStream.listen(this._renderCalendars.bind(this));
  },

  oninactive: function() {
    EventBase.prototype.oninactive.apply(this, arguments);
    this.reset();
    this.calendarStream && this.calendarStream.cancel();
  }
};

/**
 * The fields on our event model which urlparams may override.
 * @enum {string}
 */
ModifyEvent.OverrideableField = {
  CALENDAR_ID: 'calendarId',
  DESCRIPTION: 'description',
  END_DATE: 'endDate',
  IS_ALL_DAY: 'isAllDay',
  LOCATION: 'location',
  START_DATE: 'startDate',
  TITLE: 'title'
};

});
