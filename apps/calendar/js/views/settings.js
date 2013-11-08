(function(window) {
  var CALENDAR_PREFIX = 'calendar-';

  var template = Calendar.Templates.Calendar;
  var _super = Calendar.View.prototype;

  function Settings(options) {
    Calendar.View.apply(this, arguments);

    this._hideSettings = this._hideSettings.bind(this);
    this._updateTimeouts = Object.create(null);

    this._observeUI();
  }

  Settings.prototype = {
    __proto__: _super,

    waitBeforePersist: 600,

    /**
     * Local update is a flag
     * used to indicate that the incoming
     * update was made by this view and
     * should not fire the _update method.
     */
    _localUpdate: false,

    /**
     * Name of the class that will be applied to the
     * body element when sync is in progress.
     */
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

    _observeUI: function() {
      this.syncButton.addEventListener('click', this._onSyncClick.bind(this));

      this.calendars.addEventListener(
        'change', this._onCalendarDisplayToggle.bind(this)
      );
    },

    _observeAccountStore: function() {
      var store = this.app.store('Account');
      var handler = this._updateSyncButton.bind(this);

      store.on('add', handler);
      store.on('remove', handler);
    },

    _observeCalendarStore: function() {
      var store = this.app.store('Calendar');
      var self = this;

      function handle(method) {
        return function() {
          self[method].apply(self, arguments);
        }
      }

      // calendar store events
      store.on('update', handle('_update'));
      store.on('add', handle('_add'));
      store.on('remove', handle('_remove'));
    },

    _persistCalendarDisplay: function(id, displayed) {
      var store = this.app.store('Calendar');
      var self = this;

      // clear timeout id
      delete this._updateTimeouts[id];

      function persist(err, id, model) {
        if (err) {
          console.log('View.Setting cannot save calendar', err);
          return;
        }

        if (self.ondisplaypersist) {
          self.ondisplaypersist(model);
        }
      }

      function fetch(err, calendar) {
        if (err) {
          console.log('View.Setting cannot fetch calendar', id);
          return;
        }

        calendar.localDisplayed = displayed;
        store.persist(calendar, persist);
      }

      store.get(id, fetch);
    },

    _onCalendarDisplayToggle: function(e) {
      var input = e.target;
      var self = this;
      var id = input.value;
      var timeoutId = this._updateTimeouts[id];

      if (this._updateTimeouts[id]) {
        clearTimeout(this._updateTimeouts[id]);
      }

      this._updateTimeouts[id] = setTimeout(
        this._persistCalendarDisplay.bind(this, id, !!input.checked),
        this.waitBeforePersist
      );
    },

    _onSyncClick: function() {
      // trigger the sync the syncStart/complete events
      // will hide/show the button.
      this.app.syncController.all();
    },

    _update: function(id, model) {
      var el = document.getElementById(this.idForModel(CALENDAR_PREFIX, id));
      var check = el.querySelector('input[type="checkbox"]');

      if (el.classList.contains(Calendar.ERROR) && !model.error) {
        el.classList.remove(Calendar.ERROR);
      }

      if (model.error) {
        el.classList.add(Calendar.ERROR);
      }

      el.querySelector(this.selectors.calendarName).textContent = model.name;
      check.checked = model.localDisplayed;
    },

    _add: function(id, object) {
      var idx = this.calendars.children.length;

      var html = template.item.render(object);
      this.calendars.insertAdjacentHTML(
        'beforeend',
        html
      );

      if (object.error) {
        var el = this.calendars.children[
          idx
        ];

        el.classList.add(Calendar.ERROR);
      }
    },

    _remove: function(id) {
      var el = document.getElementById(this.idForModel(CALENDAR_PREFIX, id));
      if (el) {
        el.parentNode.removeChild(el);
      }
    },

    render: function() {
      var store = this.app.store('Calendar');

      store.all(function(err, calendars) {
        if (err) {
          console.log(
            'Error fetching calendars in View.Settings'
          );
          return;
        }

        // clear list of calendars
        this.calendars.innerHTML = '';

        // append each calendar
        var id;
        for (id in calendars) {
          this._add(id, calendars[id]);
        }

        // observe new calendar events
        this._observeCalendarStore();

        // observe accounts to hide sync button
        this._observeAccountStore();

        // show/hide sync button
        this._updateSyncButton(function() {
          if (this.onrender) {
            this.onrender();
          }
        }.bind(this));
      }.bind(this));
    },

    _updateSyncButton: function(callback) {
      var store = this.app.store('Account');
      var element = this.syncButton;
      var self = this;

      store.syncableAccounts(function(err, list) {
        if (err) return callback(err);

        if (list.length === 0) {
          element.classList.remove(Calendar.ACTIVE);
        } else {
          element.classList.add(Calendar.ACTIVE);
        }

        // test only event
        self.onupdatesyncbutton && self.onupdatesyncbutton();
        typeof callback === 'function' ? callback() : '';
      });
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

