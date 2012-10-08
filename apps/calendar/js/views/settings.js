(function(window) {

  var template = Calendar.Templates.Calendar;
  var _super = Calendar.View.prototype;

  function Settings(options) {
    Calendar.View.apply(this, arguments);

    this._initEvents();
    this._hideSettings = this._hideSettings.bind(this);
  }

  Settings.prototype = {
    __proto__: _super,

    /**
     * Local update is a flag
     * used to indicate that the incoming
     * update was made by this view and
     * should not fire the _update method.
     */
    _localUpdate: false,

    selectors: {
      element: '#settings',
      calendars: '#settings .calendars',
      calendarName: '.name',
      syncButton: '#settings .sync',
      timeViews: '#time-views'
    },

    get calendars() {
      return this._findElement('calendars');
    },

    get syncButton() {
      return this._findElement('syncButton');
    },

    get timeViews() {
      return this._findElement('timeViews');
    },

    _initEvents: function() {
      var store = this.app.store('Calendar');

      store.on('update', this._update.bind(this));
      store.on('add', this._add.bind(this));
      store.on('remove', this._remove.bind(this));

      this.syncButton.addEventListener('click', this._onSyncClick.bind(this));
      this.calendars.addEventListener(
        'change', this._onCalendarDisplayToggle.bind(this)
      );

      var el = document.getElementById('time-views');
    },

    _onCalendarDisplayToggle: function(e) {
      // Possible race conditions on save
      // 1. get calendar
      var input = e.target;
      var store = Calendar.App.store('Calendar');
      var model = store.cached[input.value];
      var self = this;

      model.localDisplayed = !!input.checked;
      store.persist(model, function() {
        // OK to avoid race conditions
        // and unnecessary update calls we mark
        // the view as _localUpdate and make our changes.
        // we also add a once event for 'persist' to later
        // turn this back off after all events have triggered.
        self._localUpdate = true;
        store.once('persist', function() {
          self._localUpdate = false;
        });
      });
    },

    _onSyncClick: function() {
      var self = this;
      var syncController = this.app.syncController;
      var button = this.syncButton;

      button.classList.add(this.activeClass);

      syncController.sync(function() {
        button.classList.remove(self.activeClass);
      });
    },

    _update: function(id, model) {
      if (this._localUpdate)
        return;

      var htmlId = 'calendar-' + id;
      var el = document.getElementById(htmlId);
      var check = el.querySelector('input[type="checkbox"]');

      el.querySelector(this.selectors.calendarName).textContent = model.name;
      check.checked = model.localDisplayed;
    },

    _add: function(id, object) {
      var html = template.item.render(object);
      this.calendars.insertAdjacentHTML(
        'beforeend',
        html
      );
    },

    _remove: function(id) {
      var htmlId = 'calendar-' + id;
      var el = document.getElementById(htmlId);
      if (el) {
        el.parentNode.removeChild(el);
      }
    },

    render: function() {
      var list = this.calendars;
      var store = this.app.store('Calendar');
      var key;
      var html = '';

      for (key in store.cached) {
        html += template.item.render(
          store.cached[key]
        );
      }

      list.innerHTML = html;
    },

    /**
     * navigate away from settings.
     * Designed for use when tapping away
     * from the settings tray.
     */
    _hideSettings: function() {
      this.app.resetState();
    },

    onactive: function() {
      _super.onactive.apply(this, arguments);
      this.timeViews.addEventListener('click', this._hideSettings);
    },

    oninactive: function() {
      _super.oninactive.apply(this, arguments);
      this.timeViews.removeEventListener('click', this._hideSettings);
    }

  };

  Settings.prototype.onfirstseen = Settings.prototype.render;
  Calendar.ns('Views').Settings = Settings;

}(this));
