Calendar.ns('Views').ModifyEvent = (function() {

  var InputParser = Calendar.Utils.InputParser;

  function ModifyEvent(options) {
    Calendar.View.apply(this, arguments);

    this.store = this.app.store('Event');
    this._changeToken = 0;
    this._fields = Object.create(null);

    this.save = this.save.bind(this);
    this.deleteRecord = this.deleteRecord.bind(this);
    this.cancel = this.cancel.bind(this);
    this._toggleAllDay = this._toggleAllDay.bind(this);

    this._initEvents();
  }

  ModifyEvent.prototype = {
    __proto__: Calendar.View.prototype,

    READONLY: 'readonly',
    CREATE: 'create',
    UPDATE: 'update',
    PROGRESS: 'in-progress',
    ALLDAY: 'allday',

    DEFAULT_VIEW: '/month/',

    ERROR_PREFIX: 'event-error-',

    selectors: {
      element: '#modify-event-view',
      form: '#modify-event-view form',
      status: '#modify-event-view section[role="status"]',
      errors: '#modify-event-view .errors',
      saveButton: '#modify-event-view .save',
      deleteButton: '#modify-event-view .delete-record',
      cancelButton: '#modify-event-view .cancel'
    },

    _initEvents: function() {
      var calendars = this.app.store('Calendar');

      calendars.on('add', this._addCalendarId.bind(this));
      calendars.on('remove', this._removeCalendarId.bind(this));
      calendars.on('update', this._updateCalendarId.bind(this));

      this.saveButton.addEventListener('click', this.save);
      this.deleteButton.addEventListener('click', this.deleteRecord);
      this.cancelButton.addEventListener('click', this.cancel);
      this.form.addEventListener('submit', this.save);

      var allday = this.getField('allday');
      allday.addEventListener('change', this._toggleAllDay);
    },

    /**
     * Fired when the allday checkbox changes.
     */
    _toggleAllDay: function() {
      var allday = this.getField('allday').checked;

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
      var element = this.getField('calendarId');
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
      var element = this.getField('calendarId');
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
      var element = this.getField('calendarId');

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
      var element = this.getField('calendarId');

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

    get saveButton() {
      return this._findElement('saveButton');
    },

    get deleteButton() {
      return this._findElement('deleteButton');
    },

    get cancelButton() {
      return this._findElement('cancelButton');
    },

    /**
     * Gets form field by name
     */
    getField: function(name) {
      if (!(name in this._fields)) {
        var el = this.form.querySelector('[name="' + name + '"]');
        if (el) {
          this._fields[name] = el;
        }
      }
      return this._fields[name];
    },

    /**
     * Returns the url the view will "redirect" to
     * after completing the current add/edit/delete operation.
     *
     * @return {String} redirect url.
     */
    returnTo: function() {
      var path = this._returnTo || this.DEFAULT_VIEW;

      if (/^\/add\//.test(path)) {
        return this.DEFAULT_VIEW;
      }

      return path;
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
        var redirect = this.returnTo();

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
          self.app.go(redirect);
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
            self.app.go(self.returnTo());
          });
        }
      }
    },

    /**
     * Persist current model.
     */
    save: function(event) {
      if (event) {
        event.preventDefault();
      }

      if (this.provider) {
        this._persistEvent('updateEvent', 'canUpdate');
      } else {
        this._persistEvent('createEvent', 'canCreate');
      }
    },

    /**
     * Dismiss modification and go back to previous screen.
     */
    cancel: function() {
      window.back();
    },

    /**
     * Assigns and displays event & busytime information.
     *
     * @param {Object} busytime for view.
     * @param {Object} event for view.
     */
    useModel: function(busytime, event) {
      this.provider = this.store.providerFor(event);
      this.event = new Calendar.Models.Event(event);

      this.busytime = busytime;
      this._displayModel();
    },

    /**
     * Loads event and triggers form update.
     * Gracefully will handle race conditions
     * if rapidly switching between events.
     *
     * @param {String} id busytime id.
     */
    _loadModel: function(id) {
      var self = this;
      var token = ++this._changeToken;
      var time = this.app.timeController;

      time.findAssociated(id, function(err, list) {
        var records = list[0];
        if (token === self._changeToken) {
          self.useModel(records.busytime, records.event);
        }
      });
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
        title: this.getField('title').value,
        location: this.getField('location').value,
        description: this.getField('description').value,
        calendarId: this.getField('calendarId').value
      };

      var startTime;
      var endTime;
      var allday = this.getField('allday').checked;

      if (allday) {
        startTime = null;
        endTime = null;
      } else {
        startTime = this.getField('startTime').value;
        endTime = this.getField('endTime').value;
      }

      fields.startDate = InputParser.formatInputDate(
        this.getField('startDate').value,
        startTime
      );

      fields.endDate = InputParser.formatInputDate(
        this.getField('endDate').value,
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
     * Updates form to use values from the current model.
     *
     * Does not handle readonly flags or calenarId associations.
     * Suitable for use in pre-populating values for both new and
     * existing events.
     *
     * Resets any value on the current form.
     */
    _updateForm: function() {
      var model = this.event;

      this.form.reset();

      this.getField('title').value = model.title;

      this.getField('location').value = model.location;

      var dateSrc = model;
      if (model.remote.isRecurring && this.busytime) {
        dateSrc = this.busytime;
      }

      var startDate = dateSrc.startDate;
      var endDate = dateSrc.endDate;

      // update the allday status of the view
      var allday = this.getField('allday');
      if (allday && (allday.checked = model.isAllDay)) {
        this._toggleAllDay();

        // when the event is something like this:
        // 2012-01-02 and we detect this is an all day event
        // we want to display the end date like this 2012-01-02.
        if (
          endDate.getHours() === 0 &&
          endDate.getSeconds() === 0 &&
          endDate.getMinutes() === 0
        ) {
          // subtract the date to give the user a better
          // idea of which dates the event spans...
          endDate = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate() - 1
          );
        }
      }

      this.getField('startDate').value =
        InputParser.exportDate(startDate);

      this.getField('endDate').value =
        InputParser.exportDate(endDate);

      this.getField('startTime').value =
        InputParser.exportTime(startDate);

      this.getField('endTime').value =
        InputParser.exportTime(endDate);

      this.getField('description').textContent =
        model.description;
    },

    _displayModel: function() {
      var model = this.event;
      var calendar = this.store.calendarFor(model);
      var caps = this.provider.eventCapabilities(model.data);

      if (!caps.canUpdate) {
        this._markReadonly(true);
        this.element.classList.add(this.READONLY);
      }

      this._updateForm();

      // update calendar id
      this.getField('calendarId').value =
        model.calendarId;

      // calendar display
      var currentCalendar = this.getField('currentCalendar');

      currentCalendar.value = calendar.name;
      currentCalendar.readOnly = true;
    },

    /**
     * Builds and sets defaults for a new model.
     *
     * @return {Calendar.Models.Model} new model.
     */
    _createModel: function(time) {
      var now = new Date();

      if (time < now) {
        time = now;
        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
        now.setSeconds(0);
        now.setMilliseconds(0);
      }

      var model = new Calendar.Models.Event();
      model.startDate = time;

      var end = new Date(time.valueOf());
      end.setHours(end.getHours() + 1);

      model.endDate = end;

      return model;
    },

    reset: function() {
      var list = this.element.classList;

      list.remove(this.UPDATE);
      list.remove(this.CREATE);
      list.remove(this.READONLY);
      list.remove(this.ALLDAY);

      var allday = this.getField('allday');

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
      Calendar.View.prototype.oninactive.apply(this, arguments);
      this.reset();
    },

    /**
     * Handles the url parameters for when this view
     * comes into focus. When no id is used will
     * initialize the view with a new model.
     *
     * When the (busytime) id parameter is given the event will
     * be found via the time controller.
     */
    dispatch: function(data) {
      var id = data.params.id;
      var classList = this.element.classList;
      var last = this.app.router.last;

      if (last && last.path) {
        this._returnTo = last.path;
      }

      if (id) {
        this._loadModel(id);
        classList.add(this.UPDATE);
      } else {
        var controller = this.app.timeController;
        classList.add(this.CREATE);
        this.event = this._createModel(controller.mostRecentDay);
        this._updateForm();
      }
    },

    onfirstseen: function() {
      this._buildCalendarIds();
    }

  };

  return ModifyEvent;

}());
