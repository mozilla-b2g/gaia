(function(window) {
  var oldRequire = window.require;

  require = function(path) {
    if (path === 'stream') {
      throw new Error('skip');
    }
    return oldRequire.apply(this, arguments);
  };


  if (typeof(testSupport) === 'undefined') {
    testSupport = {};
  }

  /* testSupport */

  testSupport.calendar = {
    _lastEnvId: 0,

    accountEnvironment: function(accOverrides, calOverrides) {

      // this requires a Calendar/Account model

      testSupport.calendar.loadObjects(
        'Models.Account',
        'Models.Calendar'
      );

      setup(function(done) {
        var id = ++testSupport.calendar._lastEnvId;

        var trans = Calendar.App.db.transaction(
          ['accounts', 'calendars'],
          'readwrite'
        );

        trans.oncomplete = function() {
          done();
        };

        trans.onerror = function(e) {
          done(e.target.error);
        };

        accOverrides = accOverrides || {};
        calOverrides = calOverrides || {};

        accOverrides._id = id;
        calOverrides.accountId = id;

        accOverrides.providerType = accOverrides.providerType || 'Mock';

        var account = Factory('account', accOverrides);
        var calendar = Factory('calendar', calOverrides);

        this.account = account;
        this.calendar = calendar;

        Calendar.App.store('Account').persist(account, trans);
        Calendar.App.store('Calendar').persist(calendar, trans);
      });
    },

    eventEnvironment: function(busytimeOverrides, eventOverrides) {
      setup(function(done) {
        eventOverrides = eventOverrides || {};
        eventOverrides.calendarId = this.calendar._id;
        eventOverrides._id = eventOverrides._id || 'one';

        this.event = Factory('event', eventOverrides);

        busytimeOverrides = busytimeOverrides || {};
        busytimeOverrides.eventId = this.event._id;
        busytimeOverrides.calendarId = this.calendar._id;

        this.busytime = Factory('busytime', busytimeOverrides);

        var app = Calendar.App;

        var eventStore = app.store('Event');
        var trans = app.db.transaction(
          eventStore._dependentStores,
          'readwrite'
        );

        trans.oncomplete = function() {
          done();
        };

        trans.onerror = function(e) {
          done(e.target.error);
        };

        eventStore.persist(this.event, trans);
        app.store('Busytime').persist(this.busytime, trans);

        app.timeController.cacheBusytime(this.busytime);
      });
    },

    triggerEvent: function(element, eventName) {
      var event = document.createEvent('HTMLEvents');
      event.initEvent(eventName, true, true);
      element.dispatchEvent(event);
    },

    loadObjects: function() {
      var list = Array.slice(arguments);

      list.forEach(function(item) {
        setup(function(done) {
          Calendar.App.loadObject(item, done);
        });
      });
    },

    loadSample: function(file, cb) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/test/unit/fixtures/' + file, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status !== 200) {
            cb(new Error('file not found or other error (' + file + ')', xhr));
          } else {
            cb(null, xhr.responseText);
          }
        }
      };
      xhr.send(null);
    },

    clearStore: function(db, name, done) {

      if (typeof(name) === 'function') {
        done = name;
        name = Object.keys(Calendar.Db.prototype.store);
      }

      var trans = db.transaction(name, 'readwrite');

      name = [].concat(name);

      name.forEach(function(storeName) {
        var store = trans.objectStore(storeName);
        var res = store.clear();
      });

      trans.oncomplete = function() {
        done(null);
      };

      trans.onerror = function() {
        done(new Error('could not wipe accounts db'));
      };

    },

    app: function() {
      if (Calendar.App._pendingManger) {
        // hack to ensure clean tests
        Calendar.App._pendingManger.objects.forEach(function(item) {
          Calendar.App._pendingManger.unregister(item);
        });
      }

      if (Calendar.App.db && Calendar.App.db.isOpen) {
        Calendar.App.db.close();
      }

      var db = new Calendar.Db('b2g-test-calendar');
      Calendar.App.configure(
        db,
        new Calendar.Router(Calendar.Test.FakePage)
      );

      Calendar.App.dateFormat = navigator.mozL10n.DateTimeFormat();

      return Calendar.App;
    },

    bench: function bench(iter, cb) {
      var start = window.performance.now(),
          i = 0;

      for (; i < iter; i++) {
        cb();
      }

      return window.performance.now() - start;
    },

    vs: function vs(iter, cmds) {
      var results = {},
          key;

      for (key in cmds) {
        if (cmds.hasOwnProperty(key)) {
          results[key] = testSupport.calendar.bench(iter, cmds[key]);
        }
      }

      return results;
    },

    dbFixtures: function(factory, storeName, list) {
      var object = Object.create(null);

      setup(function(done) {
        var db = Calendar.App.db;
        var store = db.getStore(storeName);
        var trans = db.transaction(store._dependentStores, 'readwrite');

        for (var key in list) {
          store.persist(
            (object[key] = Factory(factory, list[key])),
            trans
          );
        }

        trans.onerror = function(e) {
          done(e.target.error);
        };

        trans.oncomplete = function() {
          done();
        };
      });

      return object;
    }
  };


  /* global exports */

  function requireLib() {
    var args = Array.prototype.slice.call(arguments);
    args[0] = 'calendar/js/' + args[0];

    return requireApp.apply(this, args);
  }

  function requireSupport() {
    var args = Array.prototype.slice.call(arguments);
    args[0] = 'calendar/test/unit/support/' + args[0];

    return requireApp.apply(this, args);
  }

  window.testSupport = testSupport;
  window.requireLib = requireLib;
  window.requireSupport = requireSupport;

  /* chai extensions */

  // XXX: this is a lame way to do this
  // in reality we need to fix the above upstream
  // and leverage new chai 1x methods
  assert.hasProperties = function chai_hasProperties(given, props, msg) {
    msg = (typeof(msg) === 'undefined') ? '' : msg + ': ';

    if (props instanceof Array) {
      props.forEach(function(prop) {
        assert.ok(
          (prop in given),
          msg + 'given should have "' + prop + '" property'
        );
      });
    } else {
      for (var key in props) {
        assert.deepEqual(
          given[key],
          props[key],
          msg + ' property equality for (' + key + ') '
        );
      }
    }
  };

  /* require most of the coupled / util objects */

  function l10nLink(href) {
    var resource = document.createElement('link');
    resource.setAttribute('href', href);
    resource.setAttribute('rel', 'resource');
    resource.setAttribute('type', 'application/l10n');
    document.head.appendChild(resource);
  }


  l10nLink('/locales/locales.ini');
  l10nLink('/shared/locales/date.ini');

  requireApp('calendar/shared/js/l10n.js');
  // setup localization....
  requireApp('calendar/shared/js/l10n.js', function() {
    // Massive hack to trick l10n to load... (TODO: upstream a fix to l10n.js)
    document.dispatchEvent(new Event('DOMContentLoaded'));

    suiteSetup(function(done) {
      var links = Array.slice(document.querySelectorAll('link'));

      var state = navigator.mozL10n.readyState;
      if (state !== 'complete' && state !== 'interactive') {
        window.addEventListener('localized', function() {
          done();
        });
      } else {
        done();
      }
    });
  });

  requireApp('calendar/shared/js/l10n_date.js');
  requireApp('calendar/shared/js/lazy_loader.js');

  requireLib('calendar.js');
  requireLib('error.js');
  requireApp('calendar/test/unit/loader.js');
  requireLib('responder.js');
  requireLib('calc.js');
  requireLib('load_config.js');
  requireLib('view.js');
  requireLib('router.js');
  requireLib('interval_tree.js');
  requireLib('time_observer.js');
  requireLib('store/abstract.js');
  requireLib('store/busytime.js');
  requireLib('store/account.js');
  requireLib('store/calendar.js');
  requireLib('store/event.js');
  requireLib('store/setting.js');
  requireLib('store/ical_component.js');
  requireLib('provider/abstract.js');
  requireSupport('mock_provider.js');
  requireLib('worker/manager.js');
  requireLib('controllers/service.js');
  requireLib('controllers/error.js');
  requireLib('controllers/time.js');
  requireLib('controllers/sync.js');
  requireLib('controllers/alarm.js');
  requireLib('store/setting.js');
  requireLib('store/alarm.js');
  requireLib('db.js');
  requireLib('app.js');

  /* test helpers */

  requireSupport('fake_page.js');
  requireSupport('factory.js');
  requireSupport('factories/all.js');

  // tell mocha its here..
  window.uuid = null;
  window.NotAmd = null;

}(this));
