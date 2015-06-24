define(function(require, exports) {
'use strict';

var PendingManager = require('pending_manager');
var asyncRequire = require('common/async_require');
var co = require('ext/co');
var core = require('core');
var dateL10n = require('date_l10n');
var debounce = require('ext/mout').debounce;
var debug = require('common/debug')('app');
var messageHandler = require('message_handler');
var nextTick = require('common/next_tick');
var performance = require('performance');
var recurringEventsListener = require('recurring_events_listener');
var router = require('router');
var setupCore = require('core_setup');
var syncListener = require('sync_listener');
var timeObserver = require('time_observer');

var loadLazyStyles = null;
var l10nReady = new Promise(resolve => navigator.mozL10n.once(() => resolve()));
var pendingManager = new PendingManager();
var startingURL = window.location.href;

function setupPendingManager() {
  pendingManager.onpending = () => {
    document.body.classList.add('pending-operation');
  };

  pendingManager.oncomplete = () => {
    document.body.classList.remove('pending-operation');
    performance.pendingReady();
    if (!loadLazyStyles) {
      // XXX: not loading the 'lazy_loaded.js' here anymore because for some
      // weird reason curl.js was returning an object instead of
      // a constructor when loading the "views/view_event" when starting the
      // app from a notification; might be related to the fact we bundled
      // multiple modules into the same file, are using the "paths" config to
      // set the location and also using the async require in 2 places and
      // using different module ids for each call.. the important thing is
      // that this should still give a good performance result and works as
      // expected.
      loadLazyStyles = asyncRequire('css!lazy_loaded');
    }
  };

  syncListener.on('syncError', err => core.errorController.dispatch(err));
  syncListener.observe();
  pendingManager.register(syncListener);
}

function setupRouter() {
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
}

/**
 * Can only be initialized after db.load()
 */
function setupControllers() {
  core.notificationsController.observe();
  core.periodicSyncController.observe();

  pendingManager.register(recurringEventsListener);
  recurringEventsListener.observe();

  // need to keep the selected day/month in sync between frontend and backend
  core.timeController.on('scaleChange', notifyTimeControllerChange);
  core.timeController.on('selectedDayChange', notifyTimeControllerChange);
  core.timeController.on('dayChange', notifyTimeControllerChange);
}

var notifyTimeControllerChange = debounce(function() {
  core.bridge.updateTime(core.timeController.toJSON());
}, 50);

function setupUI() {
  return co(function *() {
    // re-localize dates on screen
    dateL10n.init();

    timeObserver.init();
    core.timeController.move(new Date());

    // Restart the calendar when the timezone changes.
    // We do this on a timer because this event may fire
    // many times. Refreshing the url of the calendar frequently
    // can result in crashes so we attempt to do this only after
    // the user has completed their selection.
    window.addEventListener('moztimechange', () => {
      // for info on why we need to restart the app when the time changes see:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1093016#c9
      debug('Noticed timezone change!');
      nextTick(() => window.location.href = startingURL);
    });

    nextTick(() => core.viewFactory.get('Errors'));

    yield [
      renderView('TimeHeader'),
      renderView('ViewSelector')
    ];

    // at this point we remove the .loading class and user will see the main
    // app frame
    document.body.classList.remove('loading');
    performance.domLoaded();
    setupRouter();
  });
}

function renderView(viewName) {
  return new Promise(accept => {
    core.viewFactory.get(viewName, view => {
      view.render();
      accept();
    });
  });
}

function startUI() {
  // we init the UI after the db.load to increase perceived performance
  // (will feel like busytimes are displayed faster)
  return co(function *() {
    yield l10nReady;
    yield setupUI();
  });
}

function configureAudioChannelManager() {
  // Tell audio channel manager that we want to adjust the notification
  // channel if the user press the volumeup/volumedown buttons in Calendar.
  var audioChannelManager = navigator.mozAudioChannelManager;
  if (audioChannelManager) {
    audioChannelManager.volumeControlChannel = 'notification';
  }
}

/**
 * Primary code for app can go here.
 */
function init() {
  return co(function *() {
    debug('Will initialize calendar app');
    setupCore();
    setupPendingManager();
    setupControllers();
    yield [core.bridge.initDay(), startUI()];
    messageHandler.start();
    configureAudioChannelManager();
  });
}

exports.init = init;
exports.pendingManager = pendingManager;
exports.setupCore = setupCore;

});
