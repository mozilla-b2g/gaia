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
    },

    /**
     * Build the initial list of calendar ids.
     */
    _buildCalendarIds: function() {
      var calendars = this.app.store('Calendar');
      var list = calendars.findWithCapability('createEvent');
      var element = this.getEl('calendarId');
      var option;
      var cal;
      var len = list.length;
      var i = 0;

      for (; i < len; i++) {
        cal = list[i];
        option = document.createElement('option');
        option.value = cal._id;
        option.text = cal.name;
        element.add(option);
      }
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
      var provider = store.providerFor(calendar);
      var caps = provider.calendarCapabilities(
        calendar
      );

      if (!caps.canCreateEvent) {
        this._removeCalendarId(id);
        return;
      }

      if (option) {
        option.text = calendar.name;
      }
    },

    /**
     * Add a single calendar id.
     *
     * @param {String} id calendar id.
     * @param {Calendar.Model.Calendar} calendar calendar to add.
     */
    _addCalendarId: function(id, calendar) {
      var store = this.app.store('Calendar');
      var provider = store.providerFor(calendar);
      var caps = provider.calendarCapabilities(
        calendar
      );

      var option;
      var element = this.getEl('calendarId');

      option = document.createElement('option');
      option.text = calendar.name;
      option.value = id;
      element.add(option);
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
     * Ask the provider to an event:
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

      // now that the model has a calendar id we can find the model
      var provider = this.store.providerFor(this.event);
      var eventCaps = provider.eventCapabilities(this.event.data);

      // safe-guard but should not ever happen.
      if (eventCaps[capability]) {
        var list = this.element.classList;
        var self = this;
        var redirectTo;

        // mark view as 'in progress' so we can style
        // it via css during that time period
        list.add(this.PROGRESS);

        var moveDate = this.event.startDate;

        provider[method](this.event.data, function(err) {
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
        var caps = this.provider.eventCapabilities(this.event.data);
        // XXX: unlike the save we don't wait for the transaction
        // to complete before moving on. Providers (should) take
        // action to remove the event from the display instantly
        // then queue a async action to actually remove the whole event.
        if (caps.canDelete) {
          var self = this;
          this.provider.deleteEvent(this.event.data, function(err) {
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
      var input = e.target.querySelector('input');
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

      var calendar = this.store.calendarFor(model);
      if (calendar) {
        currentCalendar.value = calendar.name;
        currentCalendar.readOnly = true;
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

      this.form.reset();
    },

    oninactive: function() {
      Calendar.Views.EventBase.prototype.oninactive.apply(this, arguments);
      this.reset();
    },

    onfirstseen: function() {
      this._buildCalendarIds();
    }

  };

  return ModifyEvent;

}());
