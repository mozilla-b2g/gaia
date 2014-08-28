/* global AccessibilityHelper, LazyLoader, NotAmd, page */
(function(window, exports) {

'use strict';

/**
 * Module dependencies
 */
var Controllers = Calendar.Controllers,
    Db = Calendar.Db,
    PendingManager = Calendar.PendingManager,
    Router = Calendar.Router,
    Views = Calendar.Views,
    dateL10n = Calendar.dateL10n,
    debug = Calendar.debug('App'),
    nextTick = Calendar.nextTick,
    performance = Calendar.performance,
    provider = Calendar.Provider.provider;

/**
 * Focal point for state management
 * within calendar application.
 *
 * Contains tools for routing and central
 * location to reference database.
 */
exports.PendingManager = PendingManager;
exports.DateL10n = dateL10n;
// XXX: always assumes that app is never lazy loaded
exports.startingURL = window.location.href;
exports._location = window.location;
exports._mozTimeRefreshTimeout = 3000;
exports.pendingClass = 'pending-operation';

/**
 * Entry point for application
 * must be called at least once before
 * using other methods.
 */
exports.configure = function(db, router) {
  exports.db = db;
  exports.router = router;

  exports._views = Object.create(null);
  exports._routeViewFn = Object.create(null);
  exports._pendingManager = new PendingManager();

  exports._pendingManager.oncomplete = function onpending() {
    document.body.classList.remove(exports.pendingClass);
    performance.pendingReady();
  };

  exports._pendingManager.onpending = function oncomplete() {
    document.body.classList.add(exports.pendingClass);
  };

  exports.timeController = new Controllers.Time(this);
  exports.syncController = new Controllers.Sync(this);
  exports.serviceController = new Controllers.Service(this);
  exports.alarmController = new Controllers.Alarm(this);
  exports.errorController = new Controllers.Error(this);

  // observe sync events
  exports.observePendingObject(this.syncController);

  // Tell audio channel manager that we want to adjust the notification
  // channel if the user press the volumeup/volumedown buttons in Calendar.
  if (navigator.mozAudioChannelManager) {
    navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
  }
};

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
exports.observeDateLocalization = function() {
  window.addEventListener('localized', dateL10n.localizeElements);
};

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
exports.observePendingObject = function(object) {
  exports._pendingManager.register(object);
};

exports.isPending = function() {
  return exports._pendingManager.isPending();
};

exports.loadObject = function initializeLoadObject(name, callback) {
  function loadObject(name, callback) {
    debug('Load object named ', name);
    exports._loader.load('group', name, function() {
      debug('Object ', name, ' loaded successfully!');
      callback.apply(null, arguments);
    });
  }

  if (!exports._pendingObjects) {
    exports._pendingObjects = [[name, callback]];
  } else {
    exports._pendingObjects.push([name, callback]);
    return;
  }

  // Loading NotAmd and the load config is not really needed
  // for the initial load so we lazily load them the first time we
  // need to load a file...
  LazyLoader.load(['/js/ext/notamd.js', '/js/load_config.js'], () => {
    debug('NotAmd and LoadConfig are loaded!');

    // initialize loader
    NotAmd.nextTick = nextTick;
    exports._loader = NotAmd(Calendar.LoadConfig);
    exports.loadObject = loadObject;

    // begin processing existing requests
    exports._pendingObjects.forEach(function(pair) {
      // ['ObjectName', function() { ... }]
      debug('Pulled ', pair[0], ' off of load queue.');
      loadObject.call(exports, pair[0], pair[1]);
    });

    delete exports._pendingObjects;
  });
};

/**
 * Internally restarts the application.
 */
exports.forceRestart = function() {
  if (!exports.restartPending) {
    exports.restartPending = true;
    exports._location.href = this.startingURL;
  }
};

/**
 * Navigates app to a new location.
 *
 * @param {String} url new view url.
 */
exports.go = function(url) {
  exports.router.show(url);
};

/**
 * Shortcut for app.router.state
 */
exports.state = function() {
  exports.router.state.apply(this.router, arguments);
};

/**
 * Shortcut for app.router.modifier
 */
exports.modifier = function() {
  exports.router.modifier.apply(this.router, arguments);
};

/**
 * Shortcut for app.router.resetState
 */
exports.resetState = function() {
  debug('Will reset router state...');
  exports.router.resetState();
};

exports._routes = function() {
  exports.state('/week/', 'Week');
  exports.state('/day/', 'Day');
  exports.state('/month/', ['Month', 'MonthsDay']);
  exports.modifier('/settings/', 'Settings', { clear: false });
  exports.modifier('/advanced-settings/', 'AdvancedSettings');

  exports.state('/alarm-display/:id', 'ViewEvent', { path: false });

  exports.state('/event/add/', 'ModifyEvent');
  exports.state('/event/edit/:id', 'ModifyEvent');
  exports.state('/event/show/:id', 'ViewEvent');

  exports.modifier('/select-preset/', 'CreateAccount');
  exports.modifier('/create-account/:preset', 'ModifyAccount');
  exports.modifier('/update-account/:id', 'ModifyAccount');

  exports.router.start();

  // at exports point the tabs should be interactive and the router ready to
  // handle the path changes (meaning the user can start interacting with
  // the app)
  performance.chromeInteractive();

  var pathname = window.location.pathname;
  // default view
  if (pathname === '/index.html' || pathname === '/') {
    exports.go('/month/');
  }
};

exports._init = function() {
  provider.app = exports;
  exports.provider = provider;

  // quick hack for today button
  var tablist = document.querySelector('#view-selector');
  var today = tablist.querySelector('.today a');
  var tabs = tablist.querySelectorAll('[role="tab"]');

  exports._showTodayDate();
  exports._syncTodayDate();
  today.addEventListener('click', function(e) {
    var date = new Date();
    exports.timeController.move(date);
    exports.timeController.selectedDay = date;

    e.preventDefault();
  });

  // Handle aria-selected attribute for tabs.
  tablist.addEventListener('click', function(event) {
    if (event.target !== today) {
      AccessibilityHelper.setAriaSelected(event.target, tabs);
    }
  });

  exports.dateFormat = navigator.mozL10n.DateTimeFormat();

  // re-localize dates on screen
  exports.observeDateLocalization();

  exports.timeController.observe();
  exports.alarmController.observe();

  // turn on the auto queue exports means that when
  // alarms are added to the database we manage them
  // transparently. Defaults to off for tests.
  exports.store('Alarm').autoQueue = true;

  exports.timeController.move(new Date());

  exports.view('TimeHeader', function(header) {
    header.render();
  });

  exports.view('CalendarColors', function(colors) {
    colors.render();
  });

  document.body.classList.remove('loading');

  // at exports point we remove the .loading class and user will see the main
  // app frame
  performance.domLoaded();

  exports._routes();

   //lazy load recurring event expander so as not to impact initial load.
  exports.loadObject('Controllers.RecurringEvents', function() {
    exports.recurringEventsController =
      new Controllers.RecurringEvents(exports);
    exports.observePendingObject(exports.recurringEventsController);
    exports.recurringEventsController.observe();
  });

  // go ahead and show the first time use view if necessary
  exports.view('FirstTimeUse', function(firstTimeUse) {
    firstTimeUse.doFirstTime();
  });

  setTimeout(function() {
    exports.view('Errors');
  }, 0);
};

exports._showTodayDate = function() {
  document.querySelector('#today .icon-calendar-today').innerHTML =
    new Date().getDate();
};

exports._syncTodayDate = function() {
  var now = new Date();
  var midnight = new Date(
    now.getFullYear(), now.getMonth(), now.getDate() + 1,
    0, 0, 0
  );
  var timeout = midnight.getTime() - now.getTime();

  setTimeout(function() {
    exports._showTodayDate();
    exports._syncTodayDate();
  }, timeout);
};

/**
 * Primary code for app can go here.
 */
exports.init = function() {
  var pending = 2;

  function next() {
    pending--;
    if (!pending) {
      exports._init();
    }
  }

  if (!exports.db) {
    exports.configure(new Db('b2g-calendar'), new Router(page));
  }

  navigator.mozL10n.once(next);
  exports.db.load(next);

  // start the workers
  exports.serviceController.start();
};

exports._initView = function(name) {
  exports._views[name] = new Views[name]({ app: exports });
};

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
exports.view = function(name, cb) {
  if (!(name in exports._views)) {
    if (name in Views) {
      exports._initView(name);

      if (cb) {
        cb.call(exports, exports._views[name]);
      }
    } else {
      exports.loadObject('Views.' + name, function() {
        exports._initView(name);

        if (cb) {
          cb.call(exports, exports._views[name]);
        }
      });
    }
  } else if (cb) {
    nextTick(function() {
      cb.call(exports, exports._views[name]);
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
exports.store = function(name) {
  return exports.db.getStore(name);
};

// Restart the calendar when the timezone changes.
// We do exports on a timer because this event may fire
// many times. Refreshing the url of the calendar frequently
// can result in crashes so we attempt to do exports only after
// the user has completed their selection.
var _changeTimerId;
window.addEventListener('moztimechange', function onMozTimeChange() {
  clearTimeout(_changeTimerId);

  _changeTimerId = setTimeout(function() {
    exports.forceRestart();
  }, exports._mozTimeRefreshTimeout);
});

window.addEventListener('load', function onLoad() {
  window.removeEventListener('load', onLoad);
  exports.init();
});

}(this, Calendar.App = {}));
