/*globals requirejs*/
requirejs.config({
  'shim': {
    'ext/page': {
      exports: 'page'
    },
    'shared/accessibility_helper': {
      exports: 'NotificationHelper'
    },
    'shared/input_parser': {
      exports: 'InputParser'
    },
    'shared/gesture_detector': {
      exports: 'GestureDetector'
    },
    'shared/lazy_loader': {
      exports: 'LazyLoader'
    },
    'shared/notification_helper': {
      exports: 'NotificationHelper'
    },
  },
  'paths': {
    'shared' : '/shared/js'
  }
});

define(function(require, exports) {
  'use strict';

  var nextTick = require('calendar').nextTick;
  var Db = require('db');
  var AccessibilityHelper = require('shared/accessibility_helper');
  var AlarmController = require('./controllers/alarm');
  var ErrorController = require('./controllers/error');
  var ServiceController = require('./controllers/service');
  var SyncController = require('./controllers/sync');
  var TimeController = require('./controllers/time');
  var performance = require('performance');
  var Router = require('router');
  var providerFactory = require('provider/factory');
  var page = require('ext/page');
  var dateFormat = require('utils/dateFormat');

  // XXX: avoids circular dependency!!
  var SingletonFactory = require('utils/singleton_factory');
  var EventMutations = require('event_mutations');

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
        this.objects.splice(idx, 1);
        return true;
      }
      return false;
    },

    isPending: function() {
      var len = this.objects.length;
      var i = 0;

      for (; i < len; i++) {
        if (this.objects[i].pending) {
          return true;
        }
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
    localizeElements: function() {
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
        element.textContent = dateFormat.localeFormat(
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
  exports.PendingManager = PendingManager;

  exports.DateL10n = DateL10n;

  //XXX: always assumes that app is never lazy loaded
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
    this.db = db;
    this.router = router;

    // XXX: avoid circular dependencies
    SingletonFactory.db = db;
    SingletonFactory.app = EventMutations.app = this;

    this._views = Object.create(null);
    this._routeViewFn = Object.create(null);
    this._pendingManager = new PendingManager();

    var self = this;
    this._pendingManager.oncomplete = function onpending() {
      document.body.classList.remove(self.pendingClass);
      performance.pendingReady();
    };

    this._pendingManager.onpending = function oncomplete() {
      document.body.classList.add(self.pendingClass);
    };

    this.timeController = new TimeController(this);
    this.syncController = new SyncController(this);
    this.serviceController = new ServiceController(this);
    this.alarmController = new AlarmController(this);
    this.errorController = new ErrorController(this);

    // observe sync events
    this.observePendingObject(this.syncController);

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
    window.addEventListener('localized', DateL10n.localizeElements);
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
    this._pendingManager.register(object);
  };

  exports.isPending = function() {
    return this._pendingManager.isPending();
  };

  /**
   * Internally restarts the application.
   */
  exports.forceRestart = function() {
    if (!this.restartPending) {
      this.restartPending = true;
      this._location.href = this.startingURL;
    }
  };

  /**
   * Navigates app to a new location.
   *
   * @param {String} url new view url.
   */
  exports.go = function(url) {
    this.router.show(url);
  };

  /**
   * Shortcut for app.router.state
   */
  exports.state = function() {
    this.router.state.apply(this.router, arguments);
  };

  /**
   * Shortcut for app.router.modifier
   */
  exports.modifier = function() {
    this.router.modifier.apply(this.router, arguments);
  };

  /**
   * Shortcut for app.router.resetState
   */
  exports.resetState = function() {
    this.router.resetState();
  };

  exports._routes = function() {

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

  };

  exports._init = function() {
    var self = this;
    // quick hack for today button
    var tablist = document.querySelector('#view-selector');
    var today = tablist.querySelector('.today a');
    var tabs = tablist.querySelectorAll('[role="tab"]');

    this._showTodayDate();
    this._syncTodayDate();
    today.addEventListener('click', function(e) {
      var date = new Date();
      self.timeController.move(date);
      self.timeController.selectedDay = date;

      e.preventDefault();
    });

    // Handle aria-selected attribute for tabs.
    tablist.addEventListener('click', function(event) {
      if (event.target !== today) {
        AccessibilityHelper.setAriaSelected(event.target, tabs);
      }
    });

    // re-localize dates on screen
    this.observeDateLocalization();

    this.timeController.observe();
    this.alarmController.observe();

    // turn on the auto queue this means that when
    // alarms are added to the database we manage them
    // transparently. Defaults to off for tests.
    this.store('Alarm').autoQueue = true;
    // we inject the controller to avoid circular dependencies
    this.store('Alarm').controller = this.alarmController;

    this.timeController.move(new Date());

    this.view('TimeHeader', function(header) {
      header.render();
    });

    this.view('CalendarColors', function(colors) {
      colors.render();
    });

    document.body.classList.remove('loading');

    // at this point we remove the .loading class and user will see the main
    // app frame
    performance.domLoaded();

    this._routes();

     //lazy load recurring event expander so as not to impact initial load.
    require(['controllers/recurring_events'], function(RecurringEvents) {
      self.recurringEventsController = new RecurringEvents(self);

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
      this._showTodayDate();
      this._syncTodayDate();
    }.bind(this), timeout);
  };

  /**
   * Primary code for app can go here.
   */
  exports.init = function() {
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
        new Db('b2g-calendar'),
        new Router(page, exports)
      );
    }

    // start the workers
    this.serviceController.start(false);

    navigator.mozL10n.once(function() {
      next();
    });

    this.db.load(function() {
      next();
    });
  };

  /**
   * Initializes a provider.
   */
  exports.provider = function(name) {
    return providerFactory.get(name);
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
   *    // a calendar view FooBar
   *
   *    // views returns a constructor function
   *    var FooBar = require('views/foo_bar');
   *
   *    app.view('FooBar', function(view) {
   *      (view instanceof FooBar) === true
   *    });
   *
   * @param {String} name view name.
   * @param {Function} view loaded callback.
   */
  exports.view = function(name, cb) {
    var self = this;

    if (!(name in this._views)) {

      require([this._viewNameToModuleId(name)], function(View) {
        self._views[name] = new View({
          app: self
        });

        if (cb) {
          cb.call(self, self._views[name]);
        }
      });

    } else if (cb) {
      nextTick(function() {
        cb.call(self, self._views[name]);
      });
    }
  };

  exports._viewNameToModuleId = function(name) {
    var id = name
      .replace(/^./, function(firstChar) {
        return firstChar.toLowerCase();
      })
      .replace(/[A-Z]/g, function(wordStart) {
        return '_' + wordStart.toLowerCase();
      });
    return 'views/' + id;
  };

  /**
   * Pure convenience function for
   * referencing a object store.
   *
   * @param {String} name store name. (e.g events).
   * @return {Store.Abstact} store.
   */
  exports.store = function(name) {
    return this.db.getStore(name);
  };

  /**
   * Returns the offline status.
   */
  exports.offline = function() {
    return (navigator && 'onLine' in navigator) ? !navigator.onLine : true;
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
      exports.forceRestart();
    }, exports._mozTimeRefreshTimeout);
  });

  exports.init();

});
