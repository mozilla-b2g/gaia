Calendar.ns('Views').ModifyEvent = (function() {

  var InputParser = Calendar.Utils.InputParser;

  function ModifyEvent(options) {
    this.deleteRecord = this.deleteRecord.bind(this);
    this._toggleAllDay = this._toggleAllDay.bind(this);
    Calendar.Views.EventBase.apply(this, arguments);
  }

  ModifyEvent.prototype = {
    __proto__: Calendar.Views.EventBase.prototype,

    ERROR_PREFIX: 'event-error-',

    formats: {
      date: 'dateTimeFormat_%x',
      time: 'shortTimeFormat'
    },

    selectors: {
      element: '#modify-event-view',
      alarmList: '#modify-event-view .alarms',
      form: '#modify-event-view form',
      status: '#modify-event-view section[role="status"]',
      errors: '#modify-event-view .errors',
      primaryButton: '#modify-event-view .save',
      deleteButton: '#modify-event-view .delete-record',
      cancelButton: '#modify-event-view .cancel'
    },

    uiSelector: '[name="%"]',

    _initEvents: function() {
      Calendar.Views.EventBase.prototype._initEvents.apply(this, arguments);

      var calendars = this.app.store('Calendar');

      calendars.on('add', this._addCalendarId.bind(this));
      calendars.on('preRemove', this._removeCalendarId.bind(this));
      calendars.on('remove', this._removeCalendarId.bind(this));
      calendars.on('update', this._updateCalendarId.bind(this));

      this.deleteButton.addEventListener('click', this.deleteRecord);
      this.form.addEventListener('click', this.focusHandler);
      this.form.addEventListener('submit', this.primary);

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

    /**
     * Called when any alarm is changed
     */
    _changeAlarm: function(e) {
      var template = Calendar.Templates.Alarm;
      if (e.target.value == 'none') {
        var parent = e.target.parentNode;
        parent.parentNode.removeChild(parent);
        return;
      }

      // Append a new alarm select only if we don't have an empty one
      var allAlarms = this.element.querySelectorAll('[name="alarm[]"]');
      for (var i = 0, alarmEl; alarmEl = allAlarms[i]; i++) {
        if (alarmEl.value == 'none') {
          return;
        }
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
        return !!this.provider;
    },

    /**
     * Build the initial list of calendar ids.
     */
    onfirstseen: function() {
      var calendarStore = this.app.store('Calendar');
      calendarStore.all(function(err, calendars) {
        if (err) {
          console.log('Could not build list of calendars');
          return;
        }

        var pending = 0;
        var self = this;

        function next() {
          if (!--pending) {
            if (self.onafteronfirstseen) {
              self.onafteronfirstseen();
            }
          }
        }

        for (var id in calendars) {
          pending++;
          this._addCalendarId(id, calendars[id], next);
        }

      }.bind(this));
    },

    /**
     * Updates a calendar id option.
     *
     * @param {String} id calendar id.
     * @param {Calendar.Model.Calendar} calendar model.
     */
    _updateCalendarId: function(id, calendar) {
      var element = this.getEl('calendarId');
      var option = element.querySelector('[value="' + id + '"]');
      var store = this.app.store('Calendar');

      store.providerFor(calendar, function(err, provider) {
        var caps = provider.calendarCapabilities(
          calendar
        );

        if (!caps.canCreateEvent) {
          this._removeCalendarId(id);
          return;
        }

        if (option) {
          option.text = calendar.remote.name;
        }


        if (this.oncalendarupdate) {
          this.oncalendarupdate(calendar);
        }
      }.bind(this));
    },

    /**
     * Add a single calendar id.
     *
     * @param {String} id calendar id.
     * @param {Calendar.Model.Calendar} calendar calendar to add.
     */
    _addCalendarId: function(id, calendar, callback) {
      var store = this.app.store('Calendar');
      store.providerFor(calendar, function(err, provider) {
        var caps = provider.calendarCapabilities(
          calendar
        );

        if (!caps.canCreateEvent) {
          if (callback) {
            Calendar.nextTick(callback);
          }
          return;
        }

        var option;
        var element = this.getEl('calendarId');

        option = document.createElement('option');
        option.text = calendar.remote.name;
        option.value = id;
        element.add(option);

        if (callback) {
          Calendar.nextTick(callback);
        }

        if (this.onaddcalendar) {
          this.onaddcalendar(calendar);
        }
      }.bind(this));
    },

    /**
     * Remove a single calendar id.
     *
     * @param {String} id to remove.
     */
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
    _persistEvent: function(method, capability) {
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
      if (!data.calendarId)
        return;

      var self = this;
      var provider;

      this.store.providerFor(this.event, fetchProvider);

      function fetchProvider(err, result) {
        provider = result;
        provider.eventCapabilities(
          self.event.data,
          verifyCaps
        );
      }

      function verifyCaps(err, caps) {
        if (err) {
          console.log('Error fetching capabilities for', self.event);
          return;
        }

        // safe-guard but should not ever happen.
        if (caps[capability]) {
          persistEvent();
        }
      }

      function persistEvent() {
        var list = self.element.classList;
        var redirectTo;

        // mark view as 'in progress' so we can style
        // it via css during that time period
        list.add(self.PROGRESS);

        var moveDate = self.event.startDate;

        provider[method](self.event.data, function(err) {
          list.remove(self.PROGRESS);

          if (err) {
            self.showErrors(err);
            return;
          }

          // move the position in the calendar to the added/edited day
          self.app.timeController.move(moveDate);
          // order is important the above method triggers the building
          // of the dom elements so selectedDay must come after.
          self.app.timeController.selectedDay = moveDate;

          if (method === 'updateEvent') {
            // If we edit a view our history stack looks like:
            //   /week -> /event/view -> /event/save -> /event/view
            // We need to return all the way to the top of the stack
            // We can remove this once we have a history stack
            self.app.view('ViewEvent', function(view) {
              self.app.go(view.returnTop());
            });

            return;
          }

          self.app.go(self.returnTo());
        });
      }
    },

    /**
     * Deletes current record if provider is present and has the capability.
     */
    deleteRecord: function(event) {
      if (event) {
        event.preventDefault();
      }

      if (this.isSaved()) {
        var self = this;
        function handleDelete() {
          self.provider.deleteEvent(self.event.data, function(err) {
            if (err) {
              self.showErrors(err);
              return;
            }

            // If we edit a view our history stack looks like:
            //   /week -> /event/view -> /event/save -> /event/view
            // We need to return all the way to the top of the stack
            // We can remove this once we have a history stack
            self.app.view('ViewEvent', function(view) {
              self.app.go(view.returnTop());
            });
          });
        }

        this.provider.eventCapabilities(this.event.data, function(err, caps) {
          if (err) {
            console.log('Error fetching event capabilities', this.event);
            return;
          }

          if (caps.canDelete) {
            handleDelete();
          }
        });
      }
    },

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
        this._persistEvent('updateEvent', 'canUpdate');
      } else {
        this._persistEvent('createEvent', 'canCreate');
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

      var alarms = this.element.querySelectorAll('[name="alarm[]"]');
      fields.alarms = [];
      for (var i = 0, alarm; alarm = alarms[i]; i++) {
        if (alarm.value == 'none') { continue; }

        fields.alarms.push({
          action: 'DISPLAY',
          trigger: parseInt(alarm.value, 10)
        });

      }

      return fields;
    },

    enablePrimary: function() {
      this.primaryButton.removeAttribute('aria-disabled');
    },

    disablePrimary: function() {
      this.primaryButton.setAttribute('aria-disabled', 'true');
    },

    /**
     * Re-enable the primary button when we show errors
     */
    showErrors: function() {
      this.enablePrimary();
      Calendar.Views.EventBase.prototype.showErrors.apply(this, arguments);
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

      // Parse the urlparams.
      var params = Calendar.QueryString.parse(search);
      for (var field in params) {
        var value = params[field];
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
      for (var field in ModifyEvent.OverrideableField) {
        var value = ModifyEvent.OverrideableField[field];
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

      // update the allday status of the view
      var allday = this.getEl('allday');
      if (allday && (allday.checked = model.isAllDay)) {
        this._toggleAllDay();
        endDate = this.formatEndDate(endDate);
      }

      this.getEl('startDate').value = InputParser.exportDate(startDate);
      this._setupDateTimeSync(
        'date', 'startDate', 'start-date-locale', startDate);

      this.getEl('endDate').value = InputParser.exportDate(endDate);
      this._setupDateTimeSync(
        'date', 'endDate', 'end-date-locale', endDate);

      this.getEl('startTime').value = InputParser.exportTime(startDate);
      this._setupDateTimeSync(
        'time', 'startTime', 'start-time-locale', startDate);

      this.getEl('endTime').value = InputParser.exportTime(endDate);
      this._setupDateTimeSync(
        'time', 'endTime', 'end-time-locale', endDate);

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
    },

    /**
     * Handling a layer over <input> to have localized
     * date/time
     */
    _setupDateTimeSync: function(type, src, target, value) {
      var targetElement = document.getElementById(target);
      if (!targetElement) {
        return;
      }
      this._renderDateTimeLocale(type, targetElement, value);

      var callback = type === 'date' ?
        this._updateDateLocaleOnInput : this._updateTimeLocaleOnInput;

      this.getEl(src)
        .addEventListener('input', callback.bind(this, targetElement));
    },

    _renderDateTimeLocale: function(type, targetElement, value) {
      // we inject the targetElement to make it easier to test
      var localeFormat = Calendar.App.dateFormat.localeFormat;
      var format = navigator.mozL10n.get(this.formats[type]);
      targetElement.textContent = localeFormat(value, format);
    },

    _updateDateLocaleOnInput: function(targetElement, e) {
      var selected = InputParser.importDate(e.target.value);
      // use date constructor to avoid issues, see Bug 966516
      var date = new Date(selected.year, selected.month, selected.date);
      this._renderDateTimeLocale('date', targetElement, date);
    },

    _updateTimeLocaleOnInput: function(targetElement, e) {
      var selected = InputParser.importTime(e.target.value);
      var date = new Date();
      date.setHours(selected.hours);
      date.setMinutes(selected.minutes);
      date.setSeconds(0);
      this._renderDateTimeLocale('time', targetElement, date);
    },

    /**
     * Called on render or when toggling an all-day event
     */
    updateAlarms: function(isAllDay, callback) {
      var template = Calendar.Templates.Alarm;
      var alarms = [];

      // Used to make sure we don't duplicate alarms
      var alarmMap = {};

      if (this.event.alarms) {
        for (var i = 0, alarm; alarm = this.event.alarms[i]; i++) {
          alarmMap[alarm.trigger] = true;
          alarm.layout = isAllDay ? 'allday' : 'standard';
          alarms.push(alarm);
        }
      }

      var settings = this.app.store('Setting');
      var layout = isAllDay ? 'allday' : 'standard';
      settings.getValue(layout + 'AlarmDefault', next.bind(this));

      function next(err, value) {
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

        if (callback) {
          callback();
        }
      }
    },

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
      this.provider = null;
      this.event = null;
      this.busytime = null;

      this.alarmList.innerHTML = '';

      this.form.reset();
    },

    oninactive: function() {
      Calendar.Views.EventBase.prototype.oninactive.apply(this, arguments);
      this.reset();
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

  return ModifyEvent;

}());
