Calendar.App = (function() {
'use strict';

/**
 * Module dependencies
 */
var Controllers = Calendar.Controllers;
var DateL10n = Calendar.dateL10n;
var Db = Calendar.Db;
var LoadConfig = Calendar.LoadConfig;
var PendingManager = Calendar.PendingManager;
var Performance = Calendar.performance;
var Provider = Calendar.Provider;
var Router = Calendar.Router;
/*var Views = Calendar.Views*;*/
var dayObserver = Calendar.dayObserver;
var nextTick = Calendar.nextTick;

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

  dateFormat: navigator.mozL10n.DateTimeFormat(),

  // XXX: always assumes that app is never lazy loaded
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
    this._pendingManager = new PendingManager();

    var self = this;
    this._pendingManager.oncomplete = function onpending() {
      document.body.classList.remove(self.pendingClass);
      Performance.pendingReady();
    };

    this._pendingManager.onpending = function oncomplete() {
      document.body.classList.add(self.pendingClass);
    };

    this.timeController = new Controllers.Time(this);
    this.syncController = new Controllers.Sync(this);
    this.serviceController = new Controllers.Service(this);
    this.alarmController = new Controllers.Alarm(this);
    this.errorController = new Controllers.Error(this);

    dayObserver.timeController = this.timeController;
    dayObserver.calendarStore = this.store('Calendar');

    // observe sync events
    this.observePendingObject(this.syncController);

    // Tell audio channel manager that we want to adjust the notification
    // channel if the user press the volumeup/volumedown buttons in Calendar.
    if (navigator.mozAudioChannelManager) {
      navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
    }
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
    window.addEventListener('timeformatchange', () => {
      this.setCurrentTimeFormat();
      DateL10n.changeElementsHourFormat();
    });
  },

  setCurrentTimeFormat: function() {
    document.body.dataset.timeFormat = navigator.mozHour12 ? '12' : '24';
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
    this._pendingManager.register(object);
  },

  isPending: function() {
    return this._pendingManager.isPending();
  },

  loadObject: function initializeLoadObject(name, callback) {

    function loadObject(name, callback) {
      /*jshint validthis:true */
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
      NotAmd.nextTick = nextTick;
      self._loader = NotAmd(LoadConfig);
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

    // at this point the tabs should be interactive and the router ready to
    // handle the path changes (meaning the user can start interacting with
    // the app)
    Performance.chromeInteractive();

    var pathname = window.location.pathname;
    // default view
    if (pathname === '/index.html' || pathname === '/') {
      this.go('/month/');
    }

  },

  _init: function() {
    // quick hack for today button
    var tablist = document.querySelector('#view-selector');
    var today = tablist.querySelector('.today a');
    var tabs = tablist.querySelectorAll('[role="tab"]');

    this._showTodayDate();
    this._syncTodayDate();
    today.addEventListener('click', (e) => {
      var date = new Date();
      this.timeController.move(date);
      this.timeController.selectedDay = date;

      e.preventDefault();
    });

    // Handle aria-selected attribute for tabs.
    tablist.addEventListener('click', (event) => {
      if (event.target !== today) {
        AccessibilityHelper.setAriaSelected(event.target, tabs);
      }
    });

    this.setCurrentTimeFormat();
    // re-localize dates on screen
    this.observeDateLocalization();

    this.timeController.observe();
    this.alarmController.observe();

    // turn on the auto queue this means that when
    // alarms are added to the database we manage them
    // transparently. Defaults to off for tests.
    this.store('Alarm').autoQueue = true;

    this.timeController.move(new Date());

    this.view('TimeHeader', (header) => header.render());
    this.view('CalendarColors', (colors) => color.render());

    document.body.classList.remove('loading');

    // at this point we remove the .loading class and user will see the main
    // app frame
    Performance.domLoaded();

    this._routes();

    //lazy load recurring event expander so as not to impact initial load.
    this.loadObject('Controllers.RecurringEvents', () => {
      var recurringEventsController = new Controllers.RecurringEvents(this);
      this.observePendingObject(recurringEventsController);
      recurringEventsController.observe();
      this.recurringEventsController = recurringEventsController;
    });

    // go ahead and show the first time use view if necessary
    this.view('FirstTimeUse', (ftu) => ftu.doFirstTime());

    nextTick(() => this.view('Errors'));
  },

  _showTodayDate: function() {
    var element = document.querySelector('#today .icon-calendar-today');
    element.innerHTML = new Date().getDate();
  },

  _syncTodayDate: function() {
    var now = new Date();
    var midnight = new Date(
      now.getFullYear(), now.getMonth(), now.getDate() + 1,
      0, 0, 0
    );

    var timeout = midnight.getTime() - now.getTime();
    setTimeout(() => {
      this._showTodayDate();
      this._syncTodayDate();
    }, timeout);
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

    var l10n = navigator.mozL10n;
    l10n.once(next);
    this.db.load(next);
  },

  /**
   * Initializes a provider.
   */
  provider: function(name) {
    if (!(name in this._providers)) {
      this._providers[name] = new Calendar.Provider[name]({ app: this });
    }

    return this._providers[name];
  },

  _initView: function(name) {
    this._views[name] = new Calendar.Views[name]({ app: this });
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
    if (name in this._views) {
      var view = this._views[name];
      return nextTick(() => cb && cb.call(this, view));
    }

    if (name in Calendar.Views) {
      this._initView(name);
      return this.view(name, cb);
    }

    this.loadObject('Views.' + name, () => this.view(name, cb));
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

}());
