Calendar.App = (function(window) {

  function PendingManager() {
    this.objects = [];
    this.pending = 0;

    this.onstart = this.onstart.bind(this);
    this.onend = this.onend.bind(this);
  }

  PendingManager.prototype = {

    onpending: function() {},
    oncomplete: function() {},

    register: function(object) {
      object.on(object.startEvent, this.onstart);
      object.on(object.completeEvent, this.onend);

      var wasPending = this.isPending();

      this.objects.push(object);

      if (object.pending) {
        this.pending++;

        if (!wasPending) {
          this.onpending();
        }
      }
    },

    /**
     * Unregister an object.
     * Note it is intended that objects that
     * are unregistered are never in a state
     * where we are waiting for their pending
     * status to complete. If an incomplete
     * object is removed it will break .pending.
     */
    unregister: function(object) {
      var idx = this.objects.indexOf(object);

      if (idx !== -1) {
        var object = this.objects[idx];
        this.objects.splice(idx, 1);
        return true;
      }
      return false;
    },

    isPending: function() {
      var len = this.objects.length;
      var i = 0;

      for (; i < len; i++) {
        if (this.objects[i].pending)
          return true;
      }

      return false;
    },

    onstart: function() {
      if (!this.pending) {
        this.onpending();
      }

      this.pending++;
    },

    onend: function() {
      this.pending--;
      if (!this.pending) {
        this.oncomplete();
      }
    }
  };

  var DateL10n = {
    /**
     * Localizes all elements with data-l10n-date-format.
     */
    localizeElements: function(parent) {
      var elements = document.querySelectorAll(
        '[data-l10n-date-format]'
      );

      var len = elements.length;
      var i = 0;

      for (; i < len; i++) {
        DateL10n.localizeElement(elements[i]);
      }
    },

    /**
     * Localize a single element expected to have data-l10n-date-format.
     */
    localizeElement: function(element) {
      var date = element.dataset.date;
      var formatKey = element.dataset.l10nDateFormat;
      var format = navigator.mozL10n.get(formatKey);

      if (date) {
        element.textContent = Calendar.App.dateFormat.localeFormat(
          new Date(date),
          format
        );
      }
    }
  };

  /**
   * Focal point for state management
   * within calendar application.
   *
   * Contains tools for routing and central
   * location to reference database.
   */
  var App = {
    PendingManager: PendingManager,

    DateL10n: DateL10n,

    //XXX: always assumes that app is never lazy loaded
    startingURL: window.location.href,

    _location: window.location,

    _mozTimeRefreshTimeout: 3000,

    pendingClass: 'pending-operation',

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
      this._pendingManger = new PendingManager();

      var self = this;
      this._pendingManger.oncomplete = function onpending() {
        document.body.classList.remove(self.pendingClass);
      };

      this._pendingManger.onpending = function oncomplete() {
        document.body.classList.add(self.pendingClass);
      };

      this.timeController = new Calendar.Controllers.Time(this);
      this.syncController = new Calendar.Controllers.Sync(this);
      this.serviceController = new Calendar.Controllers.Service(this);
      this.alarmController = new Calendar.Controllers.Alarm(this);
      this.errorController = new Calendar.Controllers.Error(this);

      // observe sync events
      this.observePendingObject(this.syncController);
    },

    /**
     * Observes localized events and localizes elements
     * with data-l10n-date-format should be registered
     * after the first localized event.
     *
     *
     * Example:
     *
     *
     *    <span
     *      data-date="Wed Jan 09 2013 19:25:38 GMT+0100 (CET)"
     *      data-l10n-date-format="%x">
     *
     *      2013/9/19
     *
     *    </span>
     *
     */
    observeDateLocalization: function() {
      window.addEventListener('localized', DateL10n.localizeElements);
    },

    /**
     * Adds observers to objects capable of being pending.
     *
     * Object must emit some kind of start/complete events
     * and have the following properties:
     *
     *  - startEvent (used to register an observer)
     *  - endEvent ( ditto )
     *  - pending
     *
     * @param {Object} object to observe.
     */
    observePendingObject: function(object) {
      this._pendingManger.register(object);
    },

    isPending: function() {
      return this._pendingManger.isPending();
    },

    loadObject: function initializeLoadObject(name, callback) {

      function loadObject(name, callback) {
        this._loader.load('group', name, callback);
      }

      if (!this._pendingObjects) {
        this._pendingObjects = [[name, callback]];
      } else {
        this._pendingObjects.push([name, callback]);
        return;
      }

      // Loading NotAnd and the load config is not really needed
      // for the initial load so we lazily load them the first time we
      // need to load a file...
      var self = this;

      function next() {
        // initialize loader
        NotAmd.nextTick = Calendar.nextTick;
        self._loader = NotAmd(Calendar.LoadConfig);
        self.loadObject = loadObject;

        // begin processing existing requests
        self._pendingObjects.forEach(function(pair) {
          // ['ObjectName', function() { ... }]
          loadObject.call(self, pair[0], pair[1]);
        });

        delete self._pendingObjects;
      }

      LazyLoader.load(['/js/ext/notamd.js', '/js/load_config.js'], next);
    },

    /**
     * Internally restarts the application.
     */
    forceRestart: function() {
      if (!this.restartPending) {
        this.restartPending = true;
        this._location.href = this.startingURL;
      }
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

      this.state('/alarm-display/:id', 'ViewEvent', { path: false });

      this.state('/event/add/', 'ModifyEvent');
      this.state('/event/edit/:id', 'ModifyEvent');
      this.state('/event/show/:id', 'ViewEvent');

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

      // re-localize dates on screen
      this.observeDateLocalization();

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

       //lazy load recurring event expander so as not to impact initial load.
      this.loadObject('Controllers.RecurringEvents', function() {
        self.recurringEventsController =
          new Calendar.Controllers.RecurringEvents(self);

        self.observePendingObject(
          self.recurringEventsController
        );

        self.recurringEventsController.observe();
      });

      // go ahead and show the first time use view if necessary
      this.view('FirstTimeUse', function(firstTimeUse) {
        firstTimeUse.doFirstTime();
      });

      setTimeout(function nextTick() {
        this.view('Errors');
      }.bind(this), 0);
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
      if (navigator.mozL10n && (navigator.mozL10n.readyState == 'interactive' ||
                                navigator.mozL10n.readyState == 'complete')) {
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

    _initView: function(name) {
      this._views[name] = new Calendar.Views[name]({
        app: this
      });
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

      if (!(name in this._views)) {

        if (name in Calendar.Views) {
          this._initView(name);

          if (cb) {
            cb.call(self, self._views[name]);
          }
        } else {
          this.loadObject('Views.' + name, function() {
            self._initView(name);

            if (cb) {
              cb.call(self, self._views[name]);
            }
          });
        }

      } else if (cb) {
        Calendar.nextTick(function() {
          cb.call(self, self._views[name]);
        });
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
    },

    /**
     * Returns the offline status.
     */
    offline: function() {
      return (navigator && 'onLine' in navigator) ? !navigator.onLine : true;
    }
  };

  // Restart the calendar when the timezone changes.
  // We do this on a timer because this event may fire
  // many times. Refreshing the url of the calendar frequently
  // can result in crashes so we attempt to do this only after
  // the user has completed their selection.
  var _changeTimerId;
  window.addEventListener('moztimechange', function onMozTimeChange() {
    clearTimeout(_changeTimerId);

    _changeTimerId = setTimeout(function() {
      App.forceRestart();
    }, App._mozTimeRefreshTimeout);
  });

  window.addEventListener('load', function onLoad() {
    window.removeEventListener('load', onLoad);
    App.init();
  });

  return App;

}(this));
