Calendar.App = (function(window) {

  /**
   * Focal point for state management
   * within calendar application.
   *
   * Contains tools for routing and central
   * location to reference database.
   */
  var App = {

    /**
     * Entry point for application
     * must be called at least once before
     * using other methods.
     */
    configure: function(db, router) {
      this.db = db;
      this.router = router;

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

    _routes: function() {
      var self = this;

      function tempView(selector) {
        self._views[selector] = new Calendar.View(selector);
        return selector;
      }

      function setPath(data, next) {
        document.body.setAttribute('data-path', data.canonicalPath);
        next();
      }

      /* routes */
      this.state('/week/', setPath, 'Week');
      this.state('/day/', setPath, 'Day');
      this.state('/month/', setPath, 'Month', 'MonthsDay');
      this.modifier('/settings/', setPath, 'Settings', { clear: false });
      this.modifier(
        '/advanced-settings/', setPath, 'AdvancedSettings'
      );

      this.state('/alarm-display/:id', 'ModifyEvent');

      this.state('/add/', setPath, 'ModifyEvent');
      this.state('/event/:id', setPath, 'ModifyEvent');

      this.modifier('/select-preset/', setPath, 'CreateAccount');
      this.modifier('/create-account/:preset', setPath, 'ModifyAccount');
      this.modifier('/update-account/:id', setPath, 'ModifyAccount');

      this.router.start();

      var pathname = window.location.pathname;
      // default view
      if (pathname === '/index.html' || pathname === '/') {
        this.go('/month/');
      }

    },

    _init: function() {
      var self = this;
      // quick hack for today button
      var today = document.querySelector('#view-selector .today');

      today.addEventListener('click', function(e) {
        var date = new Date();
        self.timeController.move(date);
        self.timeController.selectedDay = date;

        e.preventDefault();
      });

      this.dateFormat = navigator.mozL10n.DateTimeFormat();

      this.syncController.observe();
      this.timeController.observe();
      this.alarmController.observe();

      // turn on the auto queue this means that when
      // alarms are added to the database we manage them
      // transparently. Defaults to off for tests.
      this.store('Alarm').autoQueue = true;

      this.timeController.move(new Date());

      var header = this.view('TimeHeader');
      var colors = this.view('CalendarColors');

      colors.render();
      header.render();

      document.body.classList.remove('loading');
      this._routes();
    },

    /**
     * Primary code for app can go here.
     */
    init: function() {
      var self = this;
      var pending = 2;

      function next() {
        pending--;
        if (!pending) {
          self._init();
        }
      }

      if (!this.db) {
        this.configure(
          new Calendar.Db('b2g-calendar'),
          new Calendar.Router(page)
        );
      }

      // start the workers
      this.serviceController.start(false);

      // localize && pre-initialize the database
      if (navigator.mozL10n && navigator.mozL10n.readyState == 'complete') {
        // document is already localized
        next();
      } else {
        // waiting for the document to be localized (= standard case)
        window.addEventListener('localized', function() {
          next();
        });
      }

      this.db.load(function() {
        next();
      });
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
     * time the same view is returned.
     *
     *    // for example if you have
     *    // a calendar view Foo
     *
     *    Calendar.Views.Foo = Klass;
     *
     *    var view = app.view('Foo');
     *    (view instanceof Calendar.Views.Foo) === true
     *
     * @param {String} name view name.
     */
    view: function(name) {

      if (!(name in this._views)) {
        this._views[name] = new Calendar.Views[name]({
          app: this
        });
      }

      return this._views[name];
    },

    /**
     * Re-usable (via bind) function
     * to create view callbacks.
     */
    _routeCallback: function(object, ctx, next) {

      if (typeof(object) === 'string') {
        object = this.view(object);
      }

      this.router.mangeObject(object, ctx);
      next();
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
    },

    /**
     * Wraps a view object in a function
     * so it can be used with a router.
     *
     * Caches results so to not create
     * duplicate functions.
     */
    _wrapViewObject: function(name) {
      var self = this;

      if (!(name in this._routeViewFn)) {
        var routeViewCallback = this._routeCallback.bind(this, name);
        this._routeViewFn[name] = routeViewCallback;
      }

      return this._routeViewFn[name];
    },

    _mapRoutes: function(args) {
      args = Array.prototype.slice.call(args);

      var path = args.shift();
      var self = this;

      var list = args.map(function(value) {
        var type = typeof(value);

        if (type === 'string') {
          return self._wrapViewObject(value);
        } else if (type === 'object') {
          return self._routeCallback.bind(self, value);
        }
        return value;
      });

      list.unshift(path);

      return list;
    },

    resetState: function() {
      if (!this.currentPath) {
        this.currentPath = '/month/';
      }

      this.go(this.currentPath);
    },

    state: function() {
      var self = this;
      this.router.state.apply(
        this.router,
        this._mapRoutes(arguments).concat([
          // HACK: Sets current path in app.
          function(ctx, next) {
            self.currentPath = ctx.canonicalPath;
            next();
          }
        ])
      );
    },

    modifier: function() {
      this.router.modifier.apply(
        this.router,
        this._mapRoutes(arguments)
      );
    }
  };

  return App;

}(this));

window.addEventListener('load', function onLoad() {
  window.removeEventListener('load', onLoad);

  Calendar.App.init();
});

