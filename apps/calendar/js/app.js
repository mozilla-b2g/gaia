define(function(require, exports, module) {
'use strict';

var Db = require('db');
var ErrorController = require('controllers/error');
var PendingManager = require('pending_manager');
var RecurringEventsController = require('controllers/recurring_events');
var ServiceController = require('controllers/service');
var SyncController = require('controllers/sync');
var TimeController = require('controllers/time');
var core = require('core');
var dateL10n = require('date_l10n');
var dayObserver = require('day_observer');
var debug = require('common/debug')('app');
var messageHandler = require('message_handler');
var nextTick = require('common/next_tick');
var notificationsController = require('controllers/notifications');
var performance = require('performance');
var periodicSyncController = require('controllers/periodic_sync');
var providerFactory = require('provider/factory');
var router = require('router');
var storeFactory = require('store/factory');
var timeObserver = require('time_observer');
var viewFactory = require('views/factory');

var pendingClass = 'pending-operation';

/**
 * Initialize the application and wire all the instances used through the app
 */
module.exports = {
  startingURL: window.location.href,

  /**
   * Entry point for application
   * must be called at least once before
   * using other methods.
   */
  configure: function() {
    debug('Configure calendar');

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

    messageHandler.start();

    this._setupCore();

    // observe sync events
    this.observePendingObject(core.syncController);

    // Tell audio channel manager that we want to adjust the notification
    // channel if the user press the volumeup/volumedown buttons in Calendar.
    if (navigator.mozAudioChannelManager) {
      navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
    }
  },

  _setupCore: function(dbName) {
    if (core.db) {
      return;
    }
    core.db = new Db(dbName || 'b2g-calendar');
    core.errorController = new ErrorController();
    core.notificationsController = notificationsController;
    core.periodicSyncController = periodicSyncController;
    core.providerFactory = providerFactory;
    core.serviceController = new ServiceController();
    core.storeFactory = storeFactory;
    core.syncController = new SyncController();
    core.timeController = new TimeController();
    core.viewFactory = viewFactory;
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
    core.serviceController.start(false);

    notificationsController.observe();
    periodicSyncController.observe();

    var recurringEventsController = new RecurringEventsController();
    this.observePendingObject(recurringEventsController);
    recurringEventsController.observe();
    this.recurringEventsController = recurringEventsController;

    // turn on the auto queue this means that when
    // alarms are added to the database we manage them
    // transparently. Defaults to off for tests.
    core.storeFactory.get('Alarm').autoQueue = true;
  },

  _initUI: function() {
    // re-localize dates on screen
    dateL10n.init();

    timeObserver.init();
    core.timeController.move(new Date());

    viewFactory.get('TimeHeader', header => header.render());
    viewFactory.get('ViewSelector', tabs => tabs.render());

    document.body.classList.remove('loading');

    // at this point we remove the .loading class and user will see the main
    // app frame
    performance.domLoaded();

    this._routes();

    nextTick(() => viewFactory.get('Errors'));

    // Restart the calendar when the timezone changes.
    // We do this on a timer because this event may fire
    // many times. Refreshing the url of the calendar frequently
    // can result in crashes so we attempt to do this only after
    // the user has completed their selection.
    window.addEventListener('moztimechange', () => {
      debug('Noticed timezone change!');
      // for info on why we need to restart the app when the time changes see:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1093016#c9
      nextTick(this.forceRestart);
    });
  },

  /**
   * Primary code for app can go here.
   */
  init: function() {
    debug('Will initialize calendar app...');

    this.forceRestart = this.forceRestart.bind(this);

    if (!core.db) {
      this.configure();
    }

    core.db.load(() => {
      this._initControllers();
      // it should only start listening for month change after we have the
      // calendars data, otherwise we might display events from calendars that
      // are not visible. this also makes sure we load the calendars as soon as
      // possible
      core.storeFactory.get('Calendar').all(() => dayObserver.init());

      // we init the UI after the db.load to increase perceived performance
      // (will feel like busytimes are displayed faster)
      navigator.mozL10n.once(() => this._initUI());
    });
  }
};

});
