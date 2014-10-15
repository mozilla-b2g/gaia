'use strict';

/* global CpuWakeLockManager, ScreenWakeLockManager, WifiWakeLockManager */

require('/js/wake_lock_manager.js');

suite('WakeLockManagerBase', function() {
  var realMozPower;
  setup(function() {
    realMozPower = navigator.mozPower;
    var mockMozPower = {
      addWakeLockListener: this.sinon.stub(),
      removeWakeLockListener: this.sinon.stub(),
      getWakeLockState: this.sinon.stub().returns('unlocked')
    };

    Object.defineProperty(navigator, 'mozPower', {
      configurable: true,
      get: function() {
        return mockMozPower;
      }
    });
  });

  teardown(function() {
    Object.defineProperty(navigator, 'mozPower', {
      configurable: true,
      get: function() {
        return realMozPower;
      }
    });
  });

  suite('CpuWakeLockManager', function() {
    var manager;
    var wakeLockListener;

    setup(function() {
      navigator.mozPower.getWakeLockState;

      manager = new CpuWakeLockManager();
      manager.onwakelockchange = this.sinon.stub();
      manager.start();

      assert.isTrue(navigator.mozPower.addWakeLockListener.calledOnce);
      assert.isFalse(manager.isHeld);

      wakeLockListener =
        navigator.mozPower.addWakeLockListener.firstCall.args[0];
    });

    test('ignore other topics', function() {
      wakeLockListener.callback('foo', 'locked-foreground');

      assert.isFalse(manager.onwakelockchange.calledOnce);
    });

    suite('unlocked', function() {
      test('unlocked -> locked-foreground', function() {
        wakeLockListener.callback('cpu', 'locked-foreground');

        assert.isTrue(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledWith(true));
      });

      test('unlocked -> locked-background', function() {
        wakeLockListener.callback('cpu', 'locked-background');

        assert.isTrue(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledWith(true));
      });
    });

    suite('locked-foreground', function() {
      setup(function() {
        wakeLockListener.callback('cpu', 'locked-foreground');
      });

      test('locked-foreground -> locked-background', function() {
        wakeLockListener.callback('cpu', 'locked-background');

        assert.isTrue(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledOnce,
          'No additional onwakelockchange call.');
      });

      test('locked-foreground -> unlocked', function() {
        wakeLockListener.callback('cpu', 'unlocked');

        assert.isFalse(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.getCall(1).calledWith(false));
      });
    });

    suite('unlocked -> locked-background', function() {
      setup(function() {
        wakeLockListener.callback('cpu', 'locked-background');
      });

      test('locked-background -> locked-foreground', function() {
        wakeLockListener.callback('cpu', 'locked-foreground');

        assert.isTrue(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledOnce,
          'No additional onwakelockchange call.');
      });

      test('locked-background -> unlocked', function() {
        wakeLockListener.callback('cpu', 'unlocked');

        assert.isFalse(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.getCall(1).calledWith(false));
      });
    });
  });

  suite('WifiWakeLockManager', function() {
    var manager;
    var wakeLockListener;

    setup(function() {
      navigator.mozPower.getWakeLockState;

      manager = new WifiWakeLockManager();
      manager.onwakelockchange = this.sinon.stub();
      manager.start();

      assert.isTrue(navigator.mozPower.addWakeLockListener.calledOnce);
      assert.isFalse(manager.isHeld);

      wakeLockListener =
        navigator.mozPower.addWakeLockListener.firstCall.args[0];
    });

    test('ignore other topics', function() {
      wakeLockListener.callback('foo', 'locked-foreground');

      assert.isFalse(manager.onwakelockchange.calledOnce);
    });

    suite('unlocked', function() {
      test('unlocked -> locked-foreground', function() {
        wakeLockListener.callback('wifi', 'locked-foreground');

        assert.isTrue(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledWith(true));
      });

      test('unlocked -> locked-background', function() {
        wakeLockListener.callback('wifi', 'locked-background');

        assert.isTrue(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledWith(true));
      });
    });

    suite('locked-foreground', function() {
      setup(function() {
        wakeLockListener.callback('wifi', 'locked-foreground');
      });

      test('locked-foreground -> locked-background', function() {
        wakeLockListener.callback('wifi', 'locked-background');

        assert.isTrue(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledOnce,
          'No additional onwakelockchange call.');
      });

      test('locked-foreground -> unlocked', function() {
        wakeLockListener.callback('wifi', 'unlocked');

        assert.isFalse(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.getCall(1).calledWith(false));
      });
    });

    suite('unlocked -> locked-background', function() {
      setup(function() {
        wakeLockListener.callback('wifi', 'locked-background');
      });

      test('locked-background -> locked-foreground', function() {
        wakeLockListener.callback('wifi', 'locked-foreground');

        assert.isTrue(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledOnce,
          'No additional onwakelockchange call.');
      });

      test('locked-background -> unlocked', function() {
        wakeLockListener.callback('wifi', 'unlocked');

        assert.isFalse(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.getCall(1).calledWith(false));
      });
    });
  });

  suite('ScreenWakeLockManager', function() {
    var manager;
    var wakeLockListener;

    setup(function() {
      navigator.mozPower.getWakeLockState;

      manager = new ScreenWakeLockManager();
      manager.onwakelockchange = this.sinon.stub();
      manager.start();

      assert.isTrue(navigator.mozPower.addWakeLockListener.calledOnce);
      assert.isFalse(manager.isHeld);

      wakeLockListener =
        navigator.mozPower.addWakeLockListener.firstCall.args[0];
    });

    test('ignore other topics', function() {
      wakeLockListener.callback('foo', 'locked-foreground');

      assert.isFalse(manager.onwakelockchange.calledOnce);
    });

    suite('unlocked', function() {
      test('unlocked -> locked-foreground', function() {
        wakeLockListener.callback('screen', 'locked-foreground');

        assert.isTrue(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledWith(true));
      });

      test('unlocked -> locked-background', function() {
        wakeLockListener.callback('screen', 'locked-background');

        assert.isFalse(manager.isHeld);
        assert.isFalse(manager.onwakelockchange.calledOnce);
      });
    });

    suite('locked-foreground', function() {
      setup(function() {
        wakeLockListener.callback('screen', 'locked-foreground');
      });

      test('locked-foreground -> locked-background', function() {
        wakeLockListener.callback('screen', 'locked-background');

        assert.isFalse(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledWith(false));
      });

      test('locked-foreground -> unlocked', function() {
        wakeLockListener.callback('screen', 'unlocked');

        assert.isFalse(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledWith(false));
      });
    });

    suite('unlocked -> locked-background', function() {
      setup(function() {
        wakeLockListener.callback('screen', 'locked-background');
      });

      test('locked-background -> locked-foreground', function() {
        wakeLockListener.callback('screen', 'locked-foreground');

        assert.isTrue(manager.isHeld);
        assert.isTrue(manager.onwakelockchange.calledWith(true));
      });

      test('locked-background -> unlocked', function() {
        wakeLockListener.callback('screen', 'unlocked');

        assert.isFalse(manager.isHeld);
        assert.isFalse(manager.onwakelockchange.calledOnce,
          'No onwakelockchange call.');
      });
    });
  });
});
