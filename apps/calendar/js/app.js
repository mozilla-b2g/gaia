define(function(require, exports, module) {
'use strict';

var dateL10n = require('date_l10n');
var Db = require('db');
var ErrorController = require('controllers/error');
var PendingManager = require('pending_manager');
var RecurringEventsController = require('controllers/recurring_events');
var router = require('router');
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
  startingURL: window.location.href,

  /**
   * Entry point for application
   * must be called at least once before
   * using other methods.
   */
  configure: function(db) {
    debug('Configure calendar with db.');
    this.db = db;
    router.app = this;

    providerFactory.app = this;

    this._views = Object.create(null);
    this._routeViewFn = Object.create(null);
    this._pendingManager = new PendingManager();

    var loadedLazyStyles = false;

    this._pendingManager.oncomplete = function onpending() {
      document.body.classList.remove(pendingClass);
      performance.pendingReady();
      // start loading sub-views as soon as possible
      if (!loadedLazyStyles) {
        loadedLazyStyles = true;

        // XXX: not loading the 'lazy_loaded.js' here anymore because for some
        // weird reason curl.js was returning an object instead of
        // a constructor when loading the "views/view_event" when starting the
        // app from a notification; might be related to the fact we bundled
        // multiple modules into the same file, are using the "paths" config to
        // set the location and also using the async require in 2 places and
        // using different module ids for each call.. the important thing is
        // that this should still give a good performance result and works as
        // expected.

        // we need to grab the global `require` because the async require is
        // not part of the AMD spec and is not implemented by all loaders
        window.require(['css!lazy_loaded']);
      }
    };

    this._pendingManager.onpending = function oncomplete() {
      document.body.classList.add(pendingClass);
    };

    messageHandler.app = this;
    messageHandler.start();
    this.timeController = new TimeController(this);
    this.syncController = new SyncController(this);
    this.serviceController = new ServiceController(this);
    this.errorController = new ErrorController(this);
    notificationsController.app = this;
    periodicSyncController.app = this;

    dayObserver.busytimeStore = this.store('Busytime');
    dayObserver.calendarStore = this.store('Calendar');
    dayObserver.eventStore = this.store('Event');
    dayObserver.syncController = this.syncController;
    dayObserver.timeController = this.timeController;

    // observe sync events
    this.observePendingObject(this.syncController);

    // Tell audio channel manager that we want to adjust the notification
    // channel if the user press the volumeup/volumedown buttons in Calendar.
    if (navigator.mozAudioChannelManager) {
      navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
    }
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
    debug('Will restart calendar app.');
    window.location.href = this.startingURL;
  },

  _routes: function() {

    /* routes */
    router.state('/week/', 'Week');
    router.state('/day/', 'Day');
    router.state('/month/', ['Month', 'MonthDayAgenda']);
    router.modifier('/settings/', 'Settings', { clear: false });
    router.modifier('/advanced-settings/', 'AdvancedSettings', {
      color: 'settings'
    });

    router.state('/alarm-display/:id', 'ViewEvent', { path: false });

    router.state('/event/add/', 'ModifyEvent');
    router.state('/event/edit/:id', 'ModifyEvent');
    router.state('/event/show/:id', 'ViewEvent');

    router.modifier('/select-preset/', 'CreateAccount');
    router.modifier('/create-account/:preset', 'ModifyAccount');
    router.modifier('/update-account/:id', 'ModifyAccount');

    router.start();

    // at this point the tabs should be interactive and the router ready to
    // handle the path changes (meaning the user can start interacting with
    // the app)
    performance.chromeInteractive();

    var pathname = window.location.pathname;
    // default view
    if (pathname === '/index.html' || pathname === '/') {
      router.go('/month/');
    }

  },

  _initControllers: function() {
    // controllers can only be initialized after db.load

    // start the workers
    this.serviceController.start(false);

    notificationsController.observe();
    periodicSyncController.observe();

    var recurringEventsController = new RecurringEventsController(this);
    this.observePendingObject(recurringEventsController);
    recurringEventsController.observe();
    this.recurringEventsController = recurringEventsController;

    // turn on the auto queue this means that when
    // alarms are added to the database we manage them
    // transparently. Defaults to off for tests.
    this.store('Alarm').autoQueue = true;
  },

  _initUI: function() {
    // re-localize dates on screen
    dateL10n.init();

    this.timeController.move(new Date());

    this.view('TimeHeader', (header) => header.render());
    this.view('ViewSelector', (tabs) => tabs.render());

    document.body.classList.remove('loading');

    // at this point we remove the .loading class and user will see the main
    // app frame
    performance.domLoaded();

    this._routes();

    nextTick(() => this.view('Errors'));

    // Restart the calendar when the timezone changes.
    // We do this on a timer because this event may fire
    // many times. Refreshing the url of the calendar frequently
    // can result in crashes so we attempt to do this only after
    // the user has completed their selection.
    window.addEventListener('moztimechange', () => {
      debug('Noticed timezone change!');
      nextTick(this.forceRestart);
    });
  },

  /**
   * Primary code for app can go here.
   */
  init: function() {
    debug('Will initialize calendar app...');

    this.forceRestart = this.forceRestart.bind(this);

    if (!this.db) {
      this.configure(new Db('b2g-calendar', this));
    }

    this.db.load(() => {
      this._initControllers();
      // it should only start listening for month change after we have the
      // calendars data, otherwise we might display events from calendars that
      // are not visible. this also makes sure we load the calendars as soon as
      // possible
      this.store('Calendar').all(() => dayObserver.init());

      // we init the UI after the db.load to increase perceived performance
      // (will feel like busytimes are displayed faster)
      navigator.mozL10n.once(() => this._initUI());
    });
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
    // we need to grab the global `require` because the async require is not
    // part of the AMD spec and is not implemented by all loaders
    window.require([ 'views/' + snake ], (aView) => {
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
