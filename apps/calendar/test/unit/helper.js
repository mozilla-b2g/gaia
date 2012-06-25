(function(window) {

  function requireCalendarController() {
    requireApp('calendar/js/set.js');
    requireApp('calendar/js/batch.js');
    requireApp('calendar/js/template.js');
    requireApp('calendar/js/format.js');
    requireApp('calendar/js/responder.js');
    requireApp('calendar/js/models/busytime.js');
    requireApp('calendar/js/models/events.js');
    requireApp('calendar/js/calc.js');
    requireApp('calendar/js/controller.js');
    requireApp('calendar/js/view.js');
  }

  function createController(fn) {
    var busytime = new Calendar.Models.Busytime();
    var events = new Calendar.Models.Events();

    var controller = new Calendar.Controller({
      eventList: events,
      busytime: busytime
    });

    return controller;
  }

  if (typeof(testSupport) === 'undefined') {
    testSupport = {};
  }

  testSupport.calendar = {

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

  window.requireCalendarController = requireCalendarController;
  window.createController = createController;
  window.testSupport = testSupport;

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


