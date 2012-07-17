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

      this._views = {};
      this._routeViewFn = {};

      this.timeController = new Calendar.Controller();
    },

    /**
     * Navigates app to a new location.
     *
     * @param {String} url new view url.
     */
    go: function(url) {
      this.router.show(url);
    },

    _init: function() {
      var self = this;
      /* HACKS */
      function setPath(data, next) {
        document.body.setAttribute('data-path', data.canonicalPath);
        next();
      }

      // quick hack for today button
      var today = document.querySelector('#view-selector .today');

      today.addEventListener('click', function() {
        self.view('Month').render();
        self.timeController.setSelectedDay(new Date());
      });


      function tempView(selector) {
        self._views[selector] = new Calendar.View(selector);
        return selector;
      }

      /* temp views */
      this.route('/day/', setPath, tempView('#day-view'));
      this.route('/week/', setPath, tempView('#week-view'));
      this.route('/add/', setPath, tempView('#add-event-view'));


      /* routes */

      this.route('/month/', setPath, 'Month', 'MonthsDay');
      this.route('/settings/', setPath, 'Settings', { clear: false });
      this.route('/advanced-settings/', setPath, 'AdvancedSettings');

      this.route('/select-preset/', setPath, 'CreateAccount');
      this.route('/create-account/:preset', setPath, 'ModifyAccount');
      this.route('/update-account/:id', setPath, 'ModifyAccount');

      // I am not sure where this logic really belongs...
      this.route('/remove-account/:id', function(data) {
        var store = self.store('Account');
        store.remove(data.params.id, function(id) {
          self.go('/advanced-settings/');
        });
      });

      // default view
      if (window.location.pathname === '/') {
        this.go('/month/');
      }

      var account = this.db.getStore('Account');

      // load the current set of accounts
      account.load(function(err, data) {
        // after finished start router.
        self.router.start();
      });
    },

    /**
     * Primary code for app can go here.
     */
    init: function() {
      var self = this;
      if (!this.db) {
        this.configure(
          new Calendar.Db('b2g-calendar'),
          new Calendar.Router(page)
        );
      }

      this.db.open(function() {
        self._init();
      });
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
    _routeViewCallback: function(name, ctx, next) {
      var view = this.view(name);
      this.router.mangeObject(view, ctx);

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
        var routeViewCallback = this._routeViewCallback.bind(this, name);
        this._routeViewFn[name] = routeViewCallback;
      }

      return this._routeViewFn[name];
    },

    /**
     * Adds a route to the application.
     * Accepts multiple arguments
     * of either string or function types.
     *
     * If the final argument is an object
     * it will be used as options.
     */
    route: function() {
      var args = Array.prototype.slice.call(arguments);
      var options;

      var path = args.shift();

      if (typeof(args[args.length - 1]) === 'object') {
        options = args.pop();
      }

      var self = this;
      var list = args.map(function(value) {
        if (typeof(value) === 'string') {
          return self._wrapViewObject(value);
        }
        return value;
      });

      list.unshift(path);

      if (options && options.clear === false) {
        this.router.modifier.apply(this.router, list);
      } else {
        this.router.state.apply(this.router, list);
      }
    }

  };

  return App;

}(this));
