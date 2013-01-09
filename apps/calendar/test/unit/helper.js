(function(window) {

  var oldRequire = require;

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

    triggerEvent: function(element, eventName) {
      var event = document.createEvent('HTMLEvents');
      event.initEvent(eventName, true, true);
      element.dispatchEvent(event);
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

    db: function(name) {
      var db = new Calendar.Db('b2g-test-calendar');
      this._lastDb = db;
      return this._lastDb;
    },

    clearStore: function(db, name, done) {

      if (typeof(name) === 'function') {
        done = name;
        name = Object.keys(Calendar.Db.prototype.store);
      }

      var trans = db.transaction(name, 'readwrite');

      trans.oncomplete = function() {
        done(null);
      };

      trans.onerror = function() {
        done(new Error('could not wipe accounts db'));
      };

      name = [].concat(name);

      name.forEach(function(storeName) {
        var store = trans.objectStore(storeName);
        var res = store.clear();
      });
    },

    app: function() {
      if (Calendar.App._pendingManger) {
        // hack to ensure clean tests
        Calendar.App._pendingManger.objects.forEach(function(item) {
          Calendar.App._pendingManger.unregister(item);
        });
      }

      Calendar.App.configure(
        this.db(),
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
  requireApp('calendar/shared/js/l10n_date.js');

  requireLib('calendar.js');
  requireLib('calc.js');
  requireLib('set.js');
  requireLib('batch.js');
  requireLib('template.js');
  requireLib('interval_tree.js');
  requireLib('responder.js');
  requireLib('utils/overlap.js');
  requireLib('time_observer.js');
  requireLib('provider/abstract.js');
  requireLib('provider/local.js');
  requireLib('store/abstract.js');
  requireLib('store/account.js');
  requireLib('store/busytime.js');
  requireLib('store/calendar.js');
  requireLib('store/event.js');
  requireLib('store/ical_component.js');
  requireLib('store/setting.js');
  requireLib('store/alarm.js');
  requireLib('event_mutations.js');
  requireLib('view.js');
  requireLib('router.js');
  requireLib('controllers/alarm.js');
  requireLib('controllers/time.js');
  requireLib('controllers/sync.js');
  requireLib('worker/manager.js');
  requireLib('controllers/service.js');
  requireLib('db.js');
  requireLib('app.js');

  /* test helpers */

  requireSupport('fake_page.js');
  requireSupport('factory.js');
  requireSupport('factories/all.js');

}(this));


