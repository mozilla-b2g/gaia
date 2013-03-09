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
    _toggleAllDay: function() {
      var allday = this.getEl('allday').checked;

      if (allday) {
        // enable case
        this.element.classList.add(this.ALLDAY);
      } else {
        // disable case
        this.element.classList.remove(this.ALLDAY);
      }

      this.updateAlarms(allday);
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
      newAlarm.innerHTML = template.picker.render([]);
      this.alarmList.appendChild(newAlarm);
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
        option.parentNode.remove(option);
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

      for (var field in data) {
        this.event[field] = data[field];
      }

      var errors = this.event.validationErrors();
      if (errors) {
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

          // If we are updating an event, return to the event view
          if (method == 'updateEvent') {
            var busytimeId = self.store.busytimeIdFor(self.event);
            self._returnTo = '/event/show/' + busytimeId + '/';
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

      if (this.provider) {

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
      this.primaryButton.setAttribute('aria-disabled', 'true');

      if (this.provider) {
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

    /**
     * Re-enable the primary button when we show errors
     */
    showErrors: function() {
      this.primaryButton.removeAttribute('aria-disabled');
      Calendar.Views.EventBase.prototype.showErrors.apply(this, arguments);
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
      var model = this.event;

      this.form.reset();

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

      this.getEl('startDate').value =
        InputParser.exportDate(startDate);

      this.getEl('endDate').value =
        InputParser.exportDate(endDate);

      this.getEl('startTime').value =
        InputParser.exportTime(startDate);

      this.getEl('endTime').value =
        InputParser.exportTime(endDate);

      this.getEl('description').textContent =
        model.description;

      // update calendar id
      this.getEl('calendarId').value =
        model.calendarId;

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
     * Called on render or when toggling an all-day event
     */
    updateAlarms: function(isAllDay) {

      var template = Calendar.Templates.Alarm;
      var alarms = [];

      if (this.event.alarms) {
        for (var i = 0, alarm; alarm = this.event.alarms[i]; i++) {
          alarm.layout = isAllDay ? 'allday' : 'standard';
          alarms.push(alarm);
        }
      }

      alarms.push({
        layout: isAllDay ? 'allday' : 'standard'
      });
      this.alarmList.innerHTML = template.picker.renderEach(alarms).join('');
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

  return ModifyEvent;

}());
