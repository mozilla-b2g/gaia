define(function(require, exports, module) {
'use strict';

var AccessibilityHelper = require('shared/accessibility_helper');
var Calc = require('calc');
var DateL10n = require('date_l10n');
var Db = require('db');
var ErrorController = require('controllers/error');
var PendingManager = require('pending_manager');
var RecurringEventsController = require('controllers/recurring_events');
var Router = require('router');
var ServiceController = require('controllers/service');
var SyncController = require('controllers/sync');
var TimeController = require('controllers/time');
var Views = {};
var dayObserver = require('day_observer');
var debug = require('debug')('app');
var messageHandler = require('message_handler');
var nextTick = require('next_tick');
var notificationsController = require('controllers/notifications');
var periodicSyncController = require('controllers/periodic_sync');
var page = require('ext/page');
var performance = require('performance');
var providerFactory = require('provider/provider_factory');
var snakeCase = require('snake_case');

var pendingClass = 'pending-operation';

/**
 * Focal point for state management
 * within calendar application.
 *
 * Contains tools for routing and central
 * location to reference database.
 */
module.exports = {
  _mozTimeRefreshTimeout: 3000,

  /**
   * Entry point for application
   * must be called at least once before
   * using other methods.
   */
  configure: function(db, router) {
    debug('Configure calendar with db and router.');
    this.db = db;
    this.router = router;
    this.router.app = this;

    providerFactory.app = this;

    this._views = Object.create(null);
    this._routeViewFn = Object.create(null);
    this._pendingManager = new PendingManager();

    this._pendingManager.oncomplete = function onpending() {
      document.body.classList.remove(pendingClass);
      performance.pendingReady();
    };

    this._pendingManager.onpending = function oncomplete() {
      document.body.classList.add(pendingClass);
    };

    messageHandler.app = this;
    this.timeController = new TimeController(this);
    this.syncController = new SyncController(this);
    this.serviceController = new ServiceController(this);
    this.errorController = new ErrorController(this);
    notificationsController.app = this;
    periodicSyncController.app = this;

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
    performance.chromeInteractive();

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
    notificationsController.observe();
    periodicSyncController.observe();

    // turn on the auto queue this means that when
    // alarms are added to the database we manage them
    // transparently. Defaults to off for tests.
    this.store('Alarm').autoQueue = true;

    this.timeController.move(new Date());

    this.view('TimeHeader', (header) => header.render());
    this.view('CalendarColors', (colors) => colors.render());

    document.body.classList.remove('loading');

    // at this point we remove the .loading class and user will see the main
    // app frame
    performance.domLoaded();

    this._routes();

    var recurringEventsController = new RecurringEventsController(this);
    this.observePendingObject(recurringEventsController);
    recurringEventsController.observe();
    this.recurringEventsController = recurringEventsController;

    nextTick(() => this.view('Errors'));
  },

  _setPresentDate: function() {
    var id = Calc.getDayId(new Date());
    var presentDate = document.querySelector(
      '#month-view [data-date="' + id + '"]'
    );
    var previousDate = document.querySelector('#month-view .present');

    previousDate.classList.remove('present');
    previousDate.classList.add('past');
    presentDate.classList.add('present');
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
      this._setPresentDate();
      this._syncTodayDate();
    }, timeout);
  },

  /**
   * Primary code for app can go here.
   */
  init: function() {
    debug('Will initialize calendar app...');
    var self = this;
    var pending = 2;

    function next() {
      pending--;
      if (!pending) {
        self._init();
      }
    }

    if (!this.db) {
      this.configure(new Db('b2g-calendar', this), new Router(page));
    }

    // start the workers
    this.serviceController.start(false);

    var l10n = navigator.mozL10n;
    l10n.once(next);
    this.db.load(next);
  },

  _initView: function(name) {
    var view = new Views[name]({ app: this });
    this._views[name] = view;
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
      debug('Found view named ', name);
      var view = this._views[name];
      return cb && nextTick(() => cb.call(this, view));
    }

    if (name in Views) {
      debug('Must initialize view', name);
      this._initView(name);
      return this.view(name, cb);
    }

    var snake = snakeCase(name);
    debug('Will try to load view', name);
    require([ 'views/' + snake ], (aView) => {
      debug('Loaded view', name);
      Views[name] = aView;
      return this.view(name, cb);
    });
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

});
