Calendar.ns('Views').ModifyEvent = (function() {

  function ModifyEvent(options) {
    Calendar.View.apply(this, arguments);

    //XXX: Maybe this should live on app?
    this.dateFormat = navigator.mozL10n.DateTimeFormat();

    this.store = this.app.store('Event');
    this._changeToken = 0;
    this._fields = Object.create(null);
  }

  ModifyEvent.prototype = {
    __proto__: Calendar.View.prototype,

    selectors: {
      element: '#modify-event-view',
      form: '#modify-event-view form'
    },

    get form() {
      return this._findElement('form');
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
          self.model = list[id];
          self._updateForm();
        }
      });
    },

    _updateForm: function() {
      var model = this.model;
      var remote = model.remote;
      var fmt = this.dateFormat;

      var startDate = remote.startDate;
      var endDate = remote.endDate;

      this.form.reset();

      this.getField('title').value = remote.title;
      this.getField('location').value = remote.location;

      this.getField('startDate').value =
        fmt.localeDateString(startDate);

      this.getField('endDate').value =
        fmt.localeDateString(endDate);

      this.getField('startTime').value =
        fmt.localeTimeString(startDate);

      this.getField('endTime').value =
          fmt.localeTimeString(endDate);

      this.getField('description').textContent =
        remote.description;
    },

    oninactive: function() {
      Calendar.View.prototype.oninactive.apply(this, arguments);
      this.form.reset();
    },

    dispatch: function(data) {
      var id = data.params.id;

      if (id)
        this._loadModel(id);
    }

  };

  return ModifyEvent;

}());
