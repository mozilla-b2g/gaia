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
    cssBase: '/style/',
    jsBase: '/js/',
    dependencies: {
      Store: {},
      Style: {},
      Templates: {},
      Utils: {},
      Views: {
        AdvancedSettings: [
          {type: 'Templates', name: 'Account'}
        ],
        CreateAccount: [
         {type: 'Templates', name: 'Account'}
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
        ModifyEvent: [
          {type: 'Style', name: 'ModifyEventView'},
          {type: 'Utils', name: 'InputParser'}
        ],
        Month: [
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

      this.view('TimeHeader', function(header) {
          header.render();
      });

      this.view('CalendarColors', function(colors) {
        colors.render();
      });

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
     * Loads a resource and all of it's dependencies
     * @param {String} type of resource to load (folder name).
     * @param {String} name view name.
     * @param {Function} callback after all resources are loaded.
     */
    loadResource: function(type, name, cb) {

      var file, script, classes = [];

      var head = document.getElementsByTagName('head')[0];

      var self = this;

      /**
       * Appends a script to the dom
       */
      var appendScript = function(config, cb) {
        // lowercase_and_underscore the view to get the filename
        file = config.name.replace(/([A-Z])/g, '_$1')
          .replace(/^_/, '').toLowerCase();

        if (config.type == 'Style') {
          script = document.createElement('link');
          script.type = 'text/css';
          script.rel = 'stylesheet';
          script.href = self.cssBase + file + '.css';
          head.appendChild(script);
          return cb();
        }

        script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = self.jsBase + config.type.toLowerCase() +
          '/' + file + '.js';

        if (cb) script.onload = cb;
        head.appendChild(script);
      };

      /**
       * Process a dependency node
       * Ensures all sub-dependencies are processed
       */
      function processScripts(node, cb) {

        // If there are no dependencies, or we already have this resource loaded, bail out
        if (!App.dependencies[node.type] || (Calendar[node.type] && Calendar[node.type][node.name])) {
            return cb();
        }

        var dependencies = App.dependencies[node.type][node.name];
        var numDependencies = dependencies ? dependencies.length : 0;
        var counter = 0;

        if (numDependencies > 0) {
          !function processRemaining() {
            var toProcess = dependencies.shift();
            processScripts(toProcess, function() {
              counter++;
              if (counter >= numDependencies) {
                appendScript(node, cb);
              } else {
                processRemaining();
              }
            });
          }();

        } else {
          appendScript(node, cb);
        }
      }
      processScripts({type: type, name: name}, cb);
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
      if (!(name in this._views)) {
        this.loadResource('Views', name, function() {
          this._views[name] = new Calendar.Views[name]({
            app: this
          });
          cb.call(this, this._views[name]);
        }.bind(this));

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

