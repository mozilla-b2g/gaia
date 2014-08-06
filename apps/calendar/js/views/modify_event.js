/* global InputParser */
(function(exports) {
'use strict';

/**
 * Module dependencies
 */
var EventBase = Calendar.Views.EventBase,
    QueryString = Calendar.QueryString,
    View = Calendar.View,
    alarmTemplate = Calendar.Templates.Alarm,
    debug = Calendar.debug('ModifyEvent'),
    forEach = Calendar.Object.forEach,
    localeFormat = Calendar.App.dateFormat.localeFormat,
    map = Calendar.Object.map,
    provider = Calendar.Provider.provider,
    values = Calendar.Object.values;

function ModifyEvent(options) {
  this._addCalendarId = this._addCalendarId.bind(this);
  this._updateCalendarId = this._updateCalendarId.bind(this);
  this._removeCalendarId = this._removeCalendarId.bind(this);
  this.deleteRecord = this.deleteRecord.bind(this);
  this._toggleAllDay = this._toggleAllDay.bind(this);
  this._onRepeatChange = this._onRepeatChange.bind(this);
  this._changeAlarm = this._changeAlarm.bind(this);
  EventBase.apply(this, arguments);
}
exports.ModifyEvent = ModifyEvent;

ModifyEvent.prototype = {
  __proto__: EventBase.prototype,

  ERROR_PREFIX: 'event-error-',

  formats: { date: 'dateTimeFormat_%x', time: 'shortTimeFormat' },

  selectors: {
    element: '#modify-event-view',
    alarmList: '#modify-event-view .alarms',
    endDateLocale: '#end-date-locale',
    endTimeLocale: '#end-time-locale',
    repeatSelect: '#modify-event-view select[name="repeat"]',
    repeatUntilHeader: '#modify-event-view .repeat-until-header',
    repeatUntil: '#modify-event-view .repeat-until',
    repeatUntilSelect: '#modify-event-view select[name="repeat-until"]',
    numberOfEvents: '#modify-event-view .repeat-number-of-events',
    repeatCount: '#modify-event-view .repeat-number-of-events > input',
    repeatUntilDate: '#modify-event-view .repeat-until-date',
    repeatDate: '#modify-event-view .repeat-until-date > input',
    form: '#modify-event-view form',
    status: '#modify-event-view section[role="status"]',
    errors: '#modify-event-view .errors',
    primaryButton: '#modify-event-view .save',
    deleteButton: '#modify-event-view .delete-record',
    cancelButton: '#modify-event-view .cancel'
  },

  uiSelector: '[name="%"]',

  _duration: 0, // The duration between start and end dates.

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
   * Export form information into a format the model can understand.
   * @return {Object} formatted data suitable for Calendar.Model.Event.
   */
  formData: function() {
    var fields = {
      title: this.getEl('title').value,
      location: this.getEl('location').value,
      description: this.getEl('description').value,
      calendarId: this.getEl('calendarId').value,
    };

    var startTime, endTime;
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
      // end the event at the first second, minute, and hour of the next day.
      // This will ensure the server handles it as an all day event.
      fields.endDate.setDate(fields.endDate.getDate() + 1);
    }

    var freq = this._findElement('repeatSelect').value;
    debug('Found frequency: ', freq);
    if (freq !== 'never') {
      fields.freq = freq;
      var repititionType = this._findElement('repeatUntilSelect').value;
      debug('Found repititionType: ', repititionType);
      switch (repititionType) {
        case 'number-of-events':
          var count = this._findElement('repeatCount').value;
          debug('Found event count: ', count);
          fields.count = count;
          break;
        case 'until-date':
          var repeatDate = this._findElement('repeatDate').value;
          debug('Found repeat date: ', repeatDate);
          fields.until = repeatDate;
          break;
      }
    }

    fields.alarms = [];
    var alarms = this.element.querySelectorAll('[name="alarm[]"]');
    for (var i = 0; i < alarms.length; i++) {
      var value = alarms[i].value;
      if (value === 'none') {
        continue;
      }

      fields.alarms.push({ action: 'DISPLAY', trigger: parseInt(value, 10) });
    }

    return fields;
  },

  _initEvents: function() {
    EventBase.prototype._initEvents.apply(this, arguments);

    var calendarStore = this.app.store('Calendar');
    calendarStore.on('add', this._addCalendarId);
    calendarStore.on('update', this._updateCalendarId);
    calendarStore.on('preRemove', this._removeCalendarId);
    calendarStore.on('remove', this._removeCalendarId);

    this.deleteButton.addEventListener('click', this.deleteRecord);

    var form = this.form;
    form.addEventListener('click', this.focusHandler);
    form.addEventListener('submit', this.primary);

    var allday = this.getEl('allday');
    allday.addEventListener('change', this._toggleAllDay);

    var repeatSelect = this._findElement('repeatSelect');
    repeatSelect.addEventListener('change', this._onRepeatChange);
    var repeatUntilSelect = this._findElement('repeatUntilSelect');
    repeatUntilSelect.addEventListener('change', this._onRepeatChange);

    this.alarmList.addEventListener('change', this._ehangeAlarm);
  },

  onfirstseen: function() {
    // we need to notify users (specially automation tests) somehow that the
    // options are still being loaded from DB, this is very important to
    // avoid race conditions (eg. trying to set calendar before list is
    // built) notice that we also add the class to the markup because on some
    // really rare occasions "onfirstseen" is called after the EventBase
    // removed the "loading" class from the root element (seen it happen less
    // than 1% of the time)
    this.getEl('calendarId').classList.add(this.LOADING);
    var calendarStore = this.app.store('Calendar');
    calendarStore.all().then((calendars) => {
      debug('Loading calendars to persist event to...');
      return Promise.all(map(calendars, this._addCalendarId, this));
    })
    .then(() => {
      this.getEl('calendarId').classList.remove(this.LOADING);
      // What the hell does onafteronfirstseen mean?
      return this.onafterfirstseen && this.onafterfirstseen();
    })
    .catch((err) => {
      console.error('Could not build list of calendars!');
      throw err;
    });
  },

  oninactive: function() {
    EventBase.prototype.oninactive.apply(this, arguments);
    this.reset();
  },

  /**
   * Save button click.
   */
  primary: function(event) {
    if (event) {
      event.preventDefault();
    }

    // Disable the save button to avoid race conditions.
    this.disablePrimary();

    if (this.isSaved) {
      this._persistEvent('updateEvent', 'canUpdateEvent');
    } else {
      this._persistEvent('createEvent', 'canCreateEvent');
    }
  },

  enablePrimary: function() {
    this.primaryButton.removeAttribute('aria-disabled');
  },

  disablePrimary: function() {
    this.primaryButton.setAttribute('aria-disabled', 'true');
  },

  /**
   * Enlarges focus areas for .button controls
   */
  focusHandler: function(event) {
    var element = event.target;
    var input = element.querySelector('input, select');
    if (input && element.classList.contains('button')) {
      input.focus();
    }
  },

  /**
   * Re-enable the primary button when we show errors
   */
  showErrors: function() {
    EventBase.prototype.showErrors.apply(this, arguments);
    var args = Array.prototype.slice.call(arguments, 0);
    debug('Error: ', JSON.stringify(args));
    this.enablePrimary();
  },

  _addCalendarId: function(id, calendar) {
    // TODO(gareth): Why isn't this set by Store.Calendar#all?
    calendar.calendarId = id;
    debug('Checking to see if we can create events on ' + calendar._id);
    return provider.calendarCapabilities(calendar).then((capabilities) => {
      if (!capabilities.canCreateEvent) {
        debug('Cannot create events on ' + calendar._id);
        return Promise.resolve();
      }

      debug('Will add ' + calendar._id + ' to select options.');
      var option = document.createElement('option');
      option.value = id;
      if (provider.isLocal(calendar)) {
        var l10n = navigator.mozL10n;
        option.text = l10n.get('calendar-local');
        option.setAttribute('data-l10n-id', 'calendar-local');
      } else {
        option.text = calendar.remote.name;
      }

      var element = this.getEl('calendarId');
      element.add(option);

      if (this.onaddcalendar) {
        this.onaddcalendar(calendar);
      }
    });
  },

  _updateCalendarId: function(id, calendar) {
    return provider.calendarCapabilities(calendar).then((capabilities) => {
      if (!capabilities.canCreateEvent) {
        return this._removeCalendarId(id);
      }

      var element = this.getEl('calendarId');
      var option = element.querySelector('[value="' + id + '"]');
      if (option) {
        // Update name.
        option.text = calendar.remote.name;
      }

      if (this.oncalendarupdate) {
        this.oncalendarupdate(calendar);
      }
    });
  },

  _removeCalendarId: function(id) {
    var element = this.getEl('calendarId');
    var option = element.querySelector('[value="' + id + '"]');
    if (option) {
      element.removeChild(option);
    }

    if (this.onremovecalendar) {
      this.onremovecalendar(id);
    }
  },

  /**
   * Delete record if provider has permission.
   */
  deleteRecord: function(event) {
    if (event) {
      event.preventDefault();
    }

    var data = this.event.data;
    provider.eventCapabilities(data)
    .then((capabilities) => {
      if (!capabilities.canDelete) {
        return Promise.reject(
          new Error('User tried to delete event without permission?')
        );
      }

      return provider.deleteEvent(data);
    })
    .then(() => {
      this.returnTop();
    })
    .catch((err) => {
      return this.showErrors(err);
    });
  },

  _markReadonly: function(readOnly) {
    var fields = this.form.querySelectorAll('[name]');
    for (var i = 0; i < fields.length; i++) {
      fields[i].readOnly = readOnly;
    }
  },

  _persistEvent: function(method, capability) {
    var data = this.formData();
    var element = this.element;
    var event = this.event;

    var errors = event.updateAttributes(data);
    if (errors instanceof Error || (Array.isArray(errors) && errors.length)) {
      return this.showErrors(errors);
    }

    if (!data.calendarId) {
      throw new Error('Cannot persist event without calendarId.');
    }

    return provider.eventCapabilities(event.data)
    .then((capabilities) => {
      if (!capabilities[capability]) {
        throw new Error('We do not have the ' + capability + ' permission.');
      }

      debug('Will persist event with data', JSON.stringify(event.data));
      element.classList.add(this.PROGRESS);
      return provider[method](event.data);
    })
    .then(() => {
      // After persistence.
      var moveDate = event.startDate;
      // Move the position in the calendar to the added/edited day.
      this.app.timeController.move(moveDate);
      // Order is important the above method triggers the building
      // of the dom elements so selectedDay must come after.
      this.app.timeController.selectedDay = moveDate;

      if (method === 'updateEvent') {
        this.returnTop();
      } else {
        this.app.go(this.returnTo());
      }
    })
    .catch((err) => {
      element.classList.remove(this.progress);
      this.showErrors(err);
    });
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

    var event = this.event;
    var busytime = this.busytime;

    this.getEl('title').value = event.title;
    this.getEl('location').value = event.location;

    var dateSrc = (event.remote.isRecurring && busytime) || event;
    var startDate = dateSrc.startDate;
    var endDate = dateSrc.endDate;
    this._duration = endDate.getTime() - startDate.getTime();

    var allday = this.getEl('allday');
    if (allday && (allday.checked = event.isAllDay)) {
      this._toggleAllDay();
      endDate = this.formatEndDate(endDate);
    }

    this.getEl('calendarId').value = event.calendarId;
    this.getEl('description').textContent = event.description;

    this.getEl('startDate').value = InputParser.exportDate(startDate);
    this.localizeDateTime('date', 'startDate', 'start-date-locale', startDate);

    this.getEl('endDate').value = InputParser.exportDate(endDate);
    this.localizeDateTime('date', 'endDate', 'end-date-locale', endDate);

    this.getEl('startTime').value = InputParser.exportTime(startDate);
    this.localizeDateTime('time', 'startTime', 'start-time-locale', startDate);

    this.getEl('endTime').value = InputParser.exportTime(endDate);
    this.localizeDateTime('time', 'endTime', 'end-time-locale', endDate);

    var originalCalendar = this.originalCalendar;
    if (originalCalendar) {
      var calendar = this.getEl('currentCalendar');
      calendar.value = originalCalendar.remote.name;
      calendar.readOnly = true;
    }

    return this.updateAlarms(event.isAllDay);
  },

  /**
   * Read the urlparams and override stuff on our event model.
   * @param {string} search Optional string of the form ?foo=bar&cat=dog.
   */
  _overrideEvent: function(search) {
    search = search || window.location.search;
    if (!search || !search.length) {
      return;
    }
    if (search.charAt(0) === '?') {
      search = search.substr(1, search.length - 1);
    }

    var params = map(QueryString.parse(search), (key, value) => {
      switch (key) {
        case ModifyEvent.OverrideableField.START_DATE:
        case ModifyEvent.OverrideableField.END_DATE:
          return new Date(value);
        default:
          return value;
      }
    });

    forEach(ModifyEvent.OverrideableField, (key, value) => {
      if (value in params) {
        this.event[value] = params[value];
      }
    });
  },

  reset: function() {
    [
      this.ALLDAY,
      this.CREATE,
      this.READONLY,
      this.UPDATE
    ].forEach((className) => {
      this.element.classList.remove(className);
    });

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
    this.isSaved = false;
  },

  /**
   * If we edit a view our history stack looks like:
   * /week -> /event/view -> /event/save -> /event/view
   * We need to return all the way to the top of the stack
   * We can remove this once we have a history stack
   */
  returnTop: function() {
    this.app.view('ViewEvent', (view) => {
      this.app.go(view.returnTop());
    });
  },

  /**
   * Fired when the allday checkbox changes.
   */
  _toggleAllDay: function(evt) {
    var allday = this.getEl('allday').checked;
    this.element.classList[allday ? 'add' : 'remove'](this.ALLDAY);

    if (this.event) {
      this.event.isAllDay = !!allday;
    }

    // Reset alarms if we come from a user event
    if (evt) {
      this.event.alarms = [];
      return this.updateAlarms(allday);
    }
  },

  _onRepeatChange: function() {
    var repeat = this._findElement('repeatSelect').value;
    var repeatUntil = this._findElement('repeatUntil');
    var repeatUntilHeader = this._findElement('repeatUntilHeader');
    var numberOfEvents = this._findElement('numberOfEvents');
    var repeatUntilDate = this._findElement('repeatUntilDate');

    if (repeat === 'never') {
      debug('Hide all repeat options.');
      repeatUntil.classList.remove(View.ACTIVE);
      repeatUntilHeader.classList.remove(View.ACTIVE);
      numberOfEvents.classList.remove(View.ACTIVE);
      repeatUntilDate.classList.remove(View.ACTIVE);
      return;
    }

    repeatUntil.classList.add(View.ACTIVE);
    repeatUntilHeader.classList.add(View.ACTIVE);

    var repititionType = this._findElement('repeatUntilSelect').value;
    switch (repititionType) {
      case 'forever':
        debug('Hide both number of events and until date selectors.');
        numberOfEvents.classList.remove(View.ACTIVE);
        repeatUntilDate.classList.remove(View.ACTIVE);
        break;
      case 'number-of-events':
        debug('Show number of events selector. Hide until date selector.');
        numberOfEvents.classList.add(View.ACTIVE);
        repeatUntilDate.classList.remove(View.ACTIVE);
        break;
      case 'until-date':
        debug('Show until date selector. Hide number of events selector.');
        numberOfEvents.classList.remove(View.ACTIVE);
        repeatUntilDate.classList.add(View.ACTIVE);
        break;
    }
  },

  /**
   * Called on render or when toggling an all-day event
   */
  updateAlarms: function(isAllDay) {
    var event = this.event;
    var layout = isAllDay ? 'allday' : 'standard';

    var alarms = {};
    event.alarms = event.alarms || [];
    event.alarms.forEach((alarm) => {
      alarm.layout = layout;
      alarms[alarm.trigger] = alarm;
    });
    alarms = values(alarms);

    var settings = this.app.store('Setting');
    return settings.getValue(layout + 'AlarmDefault').then((value) => {
      if (!this.isSaved && !alarms.length) {
        // Add a default alarm if this isn't saved and we don't already
        // have an alarm.
        alarms.push({ layout: layout, trigger: value });
      }

      // TODO(gareth): This is really shady... from Bug 898242
      if (value !== 'none' || this.isSaved) {
        alarms.push({ layout: layout });
      }

      // TODO(gareth): We should abstract this into the template fn...
      this.alarmList.innerHTML =
        alarmTemplate.picker.renderEach(alarms).join('');
    });
  },

  /**
   * Called when any alarm is changed
   */
  _changeAlarm: function(event) {
    if (event.target.value === 'none') {
      var parent = event.target.parentNode;
      return parent.parentNode.removeChild(parent);
    }

    // Append a new alarm select if we don't have an empty one.
    var element = this.element;
    var alarms = element.querySelectorAll('[name="alarm[]"]');
    for (var i = 0; i < alarms.length; i++) {
      if (alarms[i].value === 'none') {
        return;
      }
    }

    var alarm = document.createElement('div');
    var layout = this.event.isAllDay ? 'allday' : 'standard';
    alarm.innerHTML = alarmTemplate.picker.render({ layout: layout });
    this.alarmList.appendChild(alarm);
  },

  /**
   * Handling a layer over <input> to have localized
   * date/time
   */
  localizeDateTime: function(type, src, target, value) {
    // Why not search only this view...?
    var element = document.getElementById(target);
    if (!element) {
      return;
    }

    this._renderDateTimeLocale(type, element, value);
    this.getEl(src).addEventListener('input', (event) => {
      if (type === 'date') {
        this._updateDateLocaleOnInput(element, event);
      } else {
        this._updateTimeLocaleOnInput(element, event);
      }

      // We only auto change the end date and end time when
      // (1) the user changes start date or start time or
      // (2) end datetime is before start datetime
      //     after changing end date or end time.
      if (target === 'start-date-locale' || target === 'start-time-locale') {
        this._setEndDateTimeWithCurrentDuration();
      } else if (this._getEndDateTime() <= this._getStartDateTime()) {
        this._setEndDateTimeWithCurrentDuration();
        var error = new Error();
        error.name = type === 'date' ?
          'start-after-end' :
          'start-and-end-on-same-date';
        this.showErrors(error);
      }

      this._duration = this._getEndDateTime() - this._getStartDateTime();
    });
  },

  _setEndDateTimeWithCurrentDuration: function() {
    var date = new Date(this._getStartDateTime() + this._duration);
    var endDateLocale = this._findElement('endDateLocale');
    var endTimeLocale = this._findElement('endTimeLocale');
    this.getEl('endDate').value = date.toLocaleFormat('%Y-%m-%d');
    this.getEl('endTime').value = date.toLocaleFormat('%H:%M:%S');
    this._renderDateTimeLocale('date', endDateLocale, date);
    this._renderDateTimeLocale('time', endTimeLocale, date);
  },

  _renderDateTimeLocale: function(type, targetElement, value) {
    var l10n = navigator.mozL10n;
    var formatKey = this.formats[type];
    var format = l10n.get(formatKey);
    targetElement.textContent = localeFormat(value, format);
    targetElement.setAttribute('data-l10n-date-format', formatKey);
    targetElement.dataset.date = value;
  },

  _updateDateLocaleOnInput: function(targetElement, event) {
    var selected = InputParser.importDate(event.target.value);
    // Use date constructor to avoid issues, see Bug 966516
    var date = new Date(selected.year, selected.month, selected.date);
    this._renderDateTimeLocale('date', targetElement, date);
  },

  _updateTimeLocaleOnInput: function(targetElement, event) {
    var selected = InputParser.importDate(event.target.value);
    var date = new Date();
    date.setHours(selected.hours);
    date.setMinutes(selected.minutes);
    date.setSeconds(0);
    this._renderDateTimeLocale('time', targetElement, date);
  },

  _getStartDateTime: function() {
    var startDate = this.getEl('startDate').value;
    var startTime = this.getEl('startTime').value;
    return new Date(startDate + 'T' + startTime).getTime();
  },

  _getEndDateTime: function() {
    var endDate = this.getEl('endDate').value;
    var endTime = this.getEl('endTime').value;
    return new Date(endDate + 'T' + endTime).getTime();
  }
};

ModifyEvent.OverrideableField = {
  CALENDAR_ID: 'calendarId',
  DESCRIPTION: 'description',
  END_DATE: 'endDate',
  IS_ALL_DAY: 'isAllDay',
  LOCATION: 'location',
  START_DATE: 'startDate',
  TITLE: 'title'
};

}(Calendar.ns('Views')));
