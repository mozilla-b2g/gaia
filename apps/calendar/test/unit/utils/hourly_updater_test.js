requireSupport('mock_view.js');

requireLib('utils/hourly_updater.js');

suite('HourlyUpdater', function() {
  var decorator, view;

  suiteSetup(function() {
    Calendar.ns('Views').Mock = Calendar.Test.MockView;
  });

  suiteTeardown(function() {
    delete Calendar.ns('Views').Mock;
  });

  setup(function() {
    view = new Calendar.Test.MockView();
    decorator = new Calendar.Utils.HourlyUpdater(view);
  });

  suite('#start', function() {
    test('should listen for changes in idle state', function() {
      // TODO(gareth): navigator.addIdleObserver gives a security
      //     error in the browser.
    });

    test('should set the view reloading', function() {
      delete decorator._reloadTimeoutsId;
      assert.strictEqual(decorator._reloadTimeoutId, undefined);
      decorator.start(function() {});
      assert.notStrictEqual(decorator._reloadTimeoutId, undefined);
    });

    test('should listen for changes in visibility state', function(done) {
      decorator._onMozVisibilityChange = function() {
        done();
      };

      decorator.start(function() {});

      var ev = new CustomEvent('mozvisibilitychange');
      window.dispatchEvent(ev);
    });
  });

  suite('#stop', function() {
    setup(function() {
      decorator.start(function() {});
    });

    test('should stop the view reloading', function() {
      assert.notStrictEqual(decorator._reloadTimeoutId, undefined);
      decorator.stop();
      assert.strictEqual(decorator._reloadTimeoutId, undefined);
    });
  });

  suite('#_setReloading', function() {
    setup(function() {
      decorator._cb = function() {};
    });

    test('should clear timeout id if reloading === false', function() {
      decorator._reloadTimeoutId = 1;
      decorator._setReloading(false);
      assert.strictEqual(decorator._reloadTimeoutId, undefined);
    });

    test('should use the param timeout if provided', function() {
      decorator.millisUntilHour = function() {
        // This should not be called here
        assert.ok(false);
      };

      decorator._setReloading(true, 0);
    });

    test('should use _millisUntilHour if no timeout', function() {
      this.sinon.spy(decorator, '_millisUntilHour');
      assert.strictEqual(decorator._millisUntilHour.called, false);
      decorator._setReloading(true);
      assert.strictEqual(decorator._millisUntilHour.called, true);
      decorator._millisUntilHour.restore();
    });

    test('should call cb after timeout', function(done) {
      decorator._cb = done;
      decorator._idle = true;
      decorator._setReloading(true, 0);
    });
  });

  suite('#_millisUntilHour', function() {
    var MockDate, millisUntilHour;
    var RealDate;

    setup(function() {
      /** @constructor */
      MockDate = function() {};
      MockDate.prototype = {
        getMinutes: function() {
          return 58;
        },

        getSeconds: function() {
          return 30;
        }
      };
      RealDate = window.Date;
      window.Date = MockDate;

      // By inspection, there are 90000 ms between
      // xx:58:30 and the top of the hour
      millisUntilHour = 90000;
    });

    teardown(function() {
      window.Date = RealDate;
    });

    test('should calculate the correct number of ms', function() {
      assert.equal(decorator._millisUntilHour(), millisUntilHour);
    });
  });
});
