Calendar.ns('Views').ModifyEvent = (function() {

  var InputParser = Calendar.InputParser;

  function ModifyEvent(options) {
    Calendar.View.apply(this, arguments);

    this.store = this.app.store('Event');
    this._changeToken = 0;
    this._fields = Object.create(null);
    this.save = this.save.bind(this);

    this._initEvents();
  }

  ModifyEvent.prototype = {
    __proto__: Calendar.View.prototype,

    READONLY: 'readonly',
    CREATE: 'create',
    UPDATE: 'update',
    PROGRESS: 'in-progress',

    selectors: {
      element: '#modify-event-view',
      form: '#modify-event-view form',
      saveButton: '#modify-event-view .save'
    },

    _initEvents: function() {
      var calendars = this.app.store('Calendar');

      calendars.on('add', this._addCalendarId.bind(this));
      calendars.on('remove', this._removeCalendarId.bind(this));
      calendars.on('update', this._updateCalendarId.bind(this));

      this.saveButton.addEventListener('click', this.save);
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

      if (!provider.canCreateEvent)
        return;

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

    _create: function() {
      // create model data
      var data = this.formData();
      for (var field in data) {
        this.model[field] = data[field];
      }

      // can't create without a calendar id
      // because of defaults this should be impossible.
      if (!data.calendarId)
        return;

      // now that the model has a calendar id we can find the model
      var provider = this.store.providerFor(this.model);

      // safe-guard but should not ever happen.
      if (provider.canCreateEvent) {
        var list = this.element.classList;
        var self = this;
        var redirectTo;

        // setup redirect point once we create the
        // event we want to display it I would think.
        if (this._returnTo && this._returnTo.path) {
          redirectTo = this._returnTo.path;
        } else {
          redirectTo = '/month/';
        }

        // mark view as 'in progress' so we can style
        // it via css during that time period
        list.add(this.PROGRESS);

        provider.createEvent(this.model.data, function() {
          list.remove(self.PROGRESS);
          self.app.go(redirectTo);
        });
      }
    },

    /**
     * Persist current model.
     */
    save: function() {
      if (this.provider && this.provider.canEditEvent) {
        // handle edit
      } else {
        this._create();
      }
    },

    useModel: function(record) {
      this.provider = this.store.providerFor(record);
      this.model = new Calendar.Models.Event(record);
      this._displayModel();
    },

    /**
     * Loads event and triggers form update.
     * Gracefully will handle race conditions
     * if rapidly switching between events.
     *
     * @param {String} id event id.
     */
    _loadModel: function(id) {
      var self = this;
      var token = ++this._changeToken;
      this.store.findByIds([id], function(err, list) {
        var keys = Object.keys(list);
        if (id in list && token === self._changeToken) {
          self.useModel(list[id]);
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

      fields.startDate = InputParser.formatInputDate(
        this.getField('startDate').value,
        this.getField('startTime').value
      );

      fields.endDate = InputParser.formatInputDate(
        this.getField('endDate').value,
        this.getField('endTime').value
      );

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
      var model = this.model;

      this.form.reset();

      this.getField('title').value = model.title;

      this.getField('location').value = model.location;

      this.getField('startDate').value =
        InputParser.exportDate(model.startDate);

      this.getField('endDate').value =
        InputParser.exportDate(model.endDate);

      this.getField('startTime').value =
        InputParser.exportTime(model.startDate);

      this.getField('endTime').value =
          InputParser.exportTime(model.endDate);

      this.getField('description').textContent =
        model.description;
    },

    _displayModel: function() {
      var model = this.model;
      var calendar = this.store.calendarFor(model);

      if (!this.provider.canEditEvent) {
        this._markReadonly(true);
        this.element.classList.add(this.READONLY);
      }

      this._updateForm();

      this.getField('calendarId').value =
        model.calendarId;

      var currentCalendar = this.getField('currentCalendar');

      currentCalendar.value = calendar.name;
      currentCalendar.readOnly = true;
    },

    reset: function() {
      var list = this.element.classList;

      list.remove(this.UPDATE);
      list.remove(this.CREATE);
      list.remove(this.READONLY);

      this._returnTo = null;
      this._markReadonly(false);
      this.provider = null;
      this.model = null;
      this.form.reset();
    },

    oninactive: function() {
      Calendar.View.prototype.oninactive.apply(this, arguments);
      this.reset();
    },

    dispatch: function(data) {
      var id = data.params.id;
      var classList = this.element.classList;

      this._returnTo = this.app.router.last;

      if (id) {
        this._loadModel(id);
        classList.add(this.UPDATE);
      } else {
        classList.add(this.CREATE);
        this.model = new Calendar.Models.Event();
        this._updateForm();
      }
    },

    onfirstseen: function() {
      this._buildCalendarIds();
    }

  };

  return ModifyEvent;

}());
