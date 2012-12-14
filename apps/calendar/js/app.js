Calendar.App = (function(window) {

  /**
   * Focal point for state management
   * within calendar application.
   *
   * Contains tools for routing and central
   * location to reference database.
   */
  var App = {

    // Dependency map for loading
    dependencies: {
      StoreLoad: {
        Busytime: [
          {type: 'StoreLoad', name: 'Calendar'}
        ],
        Calendar: [
        ]
      },
      Style: {},
      Templates: {},
      Utils: {},
      Views: {
        AdvancedSettings: [
          {type: 'StoreLoad', name: 'Account'},
          {type: 'StoreLoad', name: 'Setting'},
          {type: 'Templates', name: 'Account'}
        ],
        CalendarColors: [
          {type: 'StoreLoad', name: 'Calendar'}
        ],
        CreateAccount: [
         {type: 'Utils', name: 'AccountCreation'},
         {type: 'StoreLoad', name: 'Account'},
         {type: 'Style', name: 'ModifyAccountView'},
         {type: 'Templates', name: 'Account'}
        ],
        ModifyAccount: [
          {type: 'Utils', name: 'AccountCreation'},
          {type: 'Style', name: 'ModifyAccountView'}
        ],
        Day: [
          {type: 'Views', name: 'DayChild'},
          {type: 'Views', name: 'TimeParent'}
        ],
        DayBased: [
          {type: 'Utils', name: 'OrderedMap'}
        ],
        DayChild: [
          {type: 'Templates', name: 'Day'},
          {type: 'Utils', name: 'OrderedMap'},
          {type: 'Utils', name: 'Overlap'},
          {type: 'Views', name: 'DayBased'}
        ],
        ModifyAccount: [
          {type: 'StoreLoad', name: 'Account'}
        ],
        ModifyEvent: [
          {type: 'StoreLoad', name: 'Account'},
          {type: 'StoreLoad', name: 'Calendar'},
          {type: 'Style', name: 'ModifyEventView'},
          {type: 'Utils', name: 'InputParser'}
        ],
        Month: [
          {type: 'StoreLoad', name: 'Calendar'},
          {type: 'Templates', name: 'Month'},
          {type: 'Views', name: 'MonthChild'},
          {type: 'Views', name: 'TimeParent'}
        ],
        MonthChild: [
          {type: 'Templates', name: 'Month'}
        ],
        MonthsDay: [
          {type: 'Views', name: 'DayChild'}
        ],
        Settings: [
          {type: 'StoreLoad', name: 'Calendar'},
          {type: 'Style', name: 'Settings'},
          {type: 'Templates', name: 'Calendar'}
        ],
        TimeParent: [
          {type: 'Utils', name: 'OrderedMap'}
        ],
        Week: [
          {type: 'Style', name: 'WeekView'},
          {type: 'Templates', name: 'Week'},
          {type: 'Views', name: 'Day'},
          {type: 'Views', name: 'WeekChild'}
        ],
        WeekChild: [
          {type: 'Templates', name: 'Week'},
          {type: 'Utils', name: 'OrderedMap'},
          {type: 'Views', name: 'DayBased'}
        ]
      }
    },

    /**
     * Entry point for application
     * must be called at least once before
     * using other methods.
     */
    configure: function(db, router, loader) {
      this.db = db;
      this.router = router;
      this.loader = loader;

      this._providers = Object.create(null);
      this._views = Object.create(null);
      this._routeViewFn = Object.create(null);

      this.timeController = new Calendar.Controllers.Time(this);
      this.syncController = new Calendar.Controllers.Sync(this);
      this.serviceController = new Calendar.Controllers.Service(this);
      this.alarmController = new Calendar.Controllers.Alarm(this);
    },

    /**
     * Navigates app to a new location.
     *
     * @param {String} url new view url.
     */
    go: function(url) {
      this.router.show(url);
    },

    /**
     * Shortcut for app.router.state
     */
    state: function() {
      this.router.state.apply(this.router, arguments);
    },

    /**
     * Shortcut for app.router.modifier
     */
    modifier: function() {
      this.router.modifier.apply(this.router, arguments);
    },

    /**
     * Shortcut for app.router.resetState
     */
    resetState: function() {
      this.router.resetState();
    },

    _routes: function() {

      /* routes */
      this.state('/week/', 'Week');
      this.state('/day/', 'Day');
      this.state('/month/', ['Month', 'MonthsDay']);
      this.modifier('/settings/', 'Settings', { clear: false });
      this.modifier('/advanced-settings/', 'AdvancedSettings');

      this.state('/alarm-display/:id', 'ModifyEvent', { path: false });

      this.state('/add/', 'ModifyEvent');
      this.state('/event/:id', 'ModifyEvent');

      this.modifier('/select-preset/', 'CreateAccount');
      this.modifier('/create-account/:preset', 'ModifyAccount');
      this.modifier('/update-account/:id', 'ModifyAccount');

      this.router.start();

      var pathname = window.location.pathname;
      // default view
      if (pathname === '/index.html' || pathname === '/') {
        this.go('/month/');
      }

    },

    /**
     * Primary code for app can go here.
     */
    init: function() {
      var self = this;

      if (!this.db) {
        this.configure(
          new Calendar.Db('b2g-calendar'),
          new Calendar.Router(page),
          new Calendar.Loader(this.dependencies)
        );
      }

      // start the workers
      this.serviceController.start(false);

      // localize
      this.loader.onLocalized(function() {
        self.dateFormat = navigator.mozL10n.DateTimeFormat();
      });

      // quick hack for today button
      var today = document.querySelector('#view-selector .today');

      today.addEventListener('click', function(e) {
        var date = new Date();
        self.timeController.move(date);
        self.timeController.selectedDay = date;

        e.preventDefault();
      });

      this.timeController.observe();
      this.alarmController.observe();

      // turn on the auto queue this means that when
      // alarms are added to the database we manage them
      // transparently. Defaults to off for tests.
      this.store('Alarm').autoQueue = true;

      this._routes();

      this.db.open(function() {
        self.timeController.move(new Date());

        self.view('TimeHeader', function(header) {
          header.render();
        });

        self.view('CalendarColors', function(colors) {
          colors.render();
        });
      });
    },

    /**
     * Shortcut for app.loader.load
     */
    loadResource: function(type, name, cb) {
      this.loader.load({type: type, name: name}, cb);
    },

    /**
     * Initializes a provider.
     */
    provider: function(name) {
      if (!(name in this._providers)) {
        this._providers[name] = new Calendar.Provider[name]({
          app: this
        });
      }

      return this._providers[name];
    },

    /**
     * Initializes a view and stores
     * a internal reference so when
     * view is called a second
     * time the same view is used.
     *
     * Makes an asynchronous call to
     * load the script if we do not
     * have the view cached.
     *
     *    // for example if you have
     *    // a calendar view Foo
     *
     *    Calendar.Views.Foo = Klass;
     *
     *    app.view('Foo', function(view) {
     *      (view instanceof Calendar.Views.Foo) === true
     *    });
     *
     * @param {String} name view name.
     * @param {Function} view loaded callback.
     */
    view: function(name, cb) {

      var self = this;

      function loadAsync() {
        self.loadResource('Views', name, function() {
          self._views[name] = new Calendar.Views[name]({
            app: self
          });
          self.loader.onRenderReady(function() {
            cb.call(self, self._views[name]);
          });
        });
      }

      if (!(name in this._views)) {
        loadAsync();
      } else {
          cb.call(this, this._views[name]);
      }
    },


    /**
     * Pure convenience function for
     * referencing a object store.
     *
     * @param {String} name store name. (e.g events).
     * @return {Calendar.Store.Abstact} store.
     */
    store: function(name) {
      return this.db.getStore(name);
    }
  };

  return App;

}(this));

window.addEventListener('load', function onLoad() {
  window.removeEventListener('load', onLoad);

  Calendar.App.init();
});

