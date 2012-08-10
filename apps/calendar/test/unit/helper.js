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

    loadSample: function(file, cb) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/test/unit/fixtures/' + file, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status !== 200) {
            cb(new Error('file not found or other error', xhr));
          } else {
            cb(null, xhr.responseText);
          }
        }
      }
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
      Calendar.App.configure(
        this.db(),
        new Calendar.Router(Calendar.Test.FakePage)
      );

      return Calendar.App;
    },

    checkSet: function(set, arr) {
      var i = 0,
          missing = [],
          item;

      for (i; i < arr.length; i++) {
        item = arr[i];

        if (!set.has(item)) {
          missing.push(item);
        }
      }

      return (missing.length) ? missing : true;
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

  function createController(fn) {
    var busytime = new Calendar.Store.Busytime();
    var events = new Calendar.Store.Event();

    var controller = new Calendar.Controller({
      eventList: events,
      busytime: busytime
    });

    return controller;
  }

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

  assert.setHas = function(subject, values, msg) {
    var check;

    assert.ok(subject, 'must pass value');

    if (typeof(msg) === 'undefined') {
      msg = '';
    }

    if (msg) {
      msg += ': ';
    }

    check = testSupport.calendar.checkSet(subject, values);

    if (!check) {
        msg += 'expected set to have: ' + JSON.stringify(value) +
               ' but is missing ' + JSON.stringify(check);

      throw new Error(msg);
    }
  }

  /* require most of the coupled / util objects */

  // HACK - disable mozL10n right now
  //        tests that actually use it
  //        mock it out anyway.
  navigator.mozL10n = {
    get: function(value) {
      return value;
    }
  };

  requireLib('calendar.js');
  requireLib('set.js');
  requireLib('batch.js');
  requireLib('template.js');
  requireLib('responder.js');
  requireLib('provider/abstract.js');
  requireLib('provider/local.js');
  requireLib('store/abstract.js');
  requireLib('store/account.js');
  requireLib('store/busytime.js');
  requireLib('store/calendar.js');
  requireLib('store/event.js');
  requireLib('view.js');
  requireLib('calc.js');
  requireLib('router.js');
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


