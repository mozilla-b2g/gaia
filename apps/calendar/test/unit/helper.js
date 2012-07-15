(function(window) {
  requireLib('calendar.js');

  function requireCalendarController() {
    requireLib('set.js');
    requireLib('batch.js');
    requireLib('template.js');
    requireLib('format.js');
    requireLib('responder.js');
    requireLib('store/busytime.js');
    requireLib('store/event.js');
    requireLib('store/account.js');
    requireLib('calc.js');
    requireLib('controller.js');
    requireLib('view.js');
  }

  if (typeof(testSupport) === 'undefined') {
    testSupport = {};
  }

  /* testSupport */

  testSupport.calendar = {

    db: function() {
      return new Calendar.Db('b2g-test-calendar');
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

  window.requireCalendarController = requireCalendarController;
  window.createController = createController;
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

}(this));


