'use strict';

/*global requireApp suite test assert setup teardown sinon mocha
  suiteTeardown */

requireApp('demo-keyboard/js/shiftkey.js');

suite('ShiftKey', function() {
  function eventTargetSpy() {
    var d = document.createElement('div');
    sinon.spy(d, 'addEventListener');
    sinon.spy(d, 'removeEventListener');
    sinon.spy(d, 'dispatchEvent');
    return d;
  }

  function appSpy() {
    var app = {
      inputField: eventTargetSpy(),
      currentPageView: {
        setShiftState: sinon.spy(function(shifted, locked) {
          this.shifted = shifted;
          this.locked = locked;
        }),
        shifted: false,
        locked: false
      }
    };

    return app;
  }

  function sendKey(key) {
    keyboardTouchHelper.dispatchEvent(new CustomEvent('key', {
      detail: key }));
  }

  mocha.setup({
    globals: [
      'KeyboardTouchHandler',
      'ShiftKey'
    ]
  });

  var keyboardTouchHelper;
  var realKeyboardTouchHandler;

  suiteSetup(function() {
    realKeyboardTouchHandler = window.KeyboardTouchHandler;
    window.KeyboardTouchHandler = keyboardTouchHelper = eventTargetSpy();
  });

  suiteTeardown(function() {
    window.KeyboardTouchHandler = realKeyboardTouchHandler;
  });

  suite('Key handling', function() {
    var app, shiftKey;

    setup(function() {
      app = appSpy();
      shiftKey = new ShiftKey(app);
      shiftKey.start();
    });

    teardown(function() {
      shiftKey.stop();
      shiftKey = undefined;
    });

    function testShiftCalls(noOfCalls, expectedShifted, expectedLocked) {
      for (var i = 0; i < noOfCalls; i++) {
        sendKey('SHIFT');
      }

      assert.equal(expectedShifted,
          app.currentPageView.setShiftState.lastCall.args[0],
          'State is shifted');
      assert.equal(expectedLocked,
          app.currentPageView.setShiftState.lastCall.args[1],
          'State is locked');
    }

    test('Sending non-shift key doesn\'t trigger shiftState', function() {
      sendKey('a');

      assert.equal(app.currentPageView.setShiftState.callCount, 0,
        'No change in shiftState was made');
    });

    suite('Non-shifted and non-locked', function() {
      test('Single shift event', function() {
        testShiftCalls(1, true, false);
      });

      test('Double shift event', function() {
        testShiftCalls(2, true, true);
      });

      test('Triple shift event', function() {
        testShiftCalls(3, false, false);
      });
    });

    suite('Shifted and non-locked', function() {
      setup(function() {
        app.currentPageView.shifted = true;
      });
      test('Single shift event (fast)', function() {
        app.currentPageView.shifted = false;
        sendKey('SHIFT');

        // if fast -> go into locked mode
        testShiftCalls(1, true, true);
      });

      test('Single shift event (slow)', function() {
        app.currentPageView.shifted = false;
        sendKey('SHIFT');

        shiftKey.lastShiftTime -= shiftKey.CAPS_LOCK_INTERVAL * 1000;

        // if slow -> move into unshift/unlocked mode
        testShiftCalls(1, false, false);
      });

      test('Double shift event', function() {
        // I think this is incorrect, on old keyboard this goes to
        // true, true state
        testShiftCalls(2, true, false);
      });

      test('Triple shift event', function() {
        // Think also incorrect, old keyboard -> false, false
        testShiftCalls(3, true, true);
      });
    });

    suite('Shifted and locked', function() {
      setup(function() {
        app.currentPageView.shifted = true;
        app.currentPageView.locked = true;
      });

      test('Single shift event', function() {
        testShiftCalls(1, false, false);
      });

      test('Double shift event', function() {
        testShiftCalls(2, true, false);
      });

      test('Triple shift event', function() {
        testShiftCalls(3, true, true);
      });
    });
  });

  suite('State changing', function() {
    var app, shiftKey;

    setup(function() {
      app = appSpy();
      shiftKey = new ShiftKey(app);
      shiftKey.start();
    });

    teardown(function() {
      shiftKey.stop();
      shiftKey = undefined;
    });

    function testStateChange(opts) {
      app.currentPageView.locked = opts.isLocked;
      app.currentPageView.shifted = opts.isShifted;
      app.inputField.atSentenceStart =
        sinon.stub().returns(opts.atSentenceStart);

      app.inputField.dispatchEvent(new CustomEvent('inputstatechanged'));

      sinon.assert.callCount(app.currentPageView.setShiftState,
        opts.expectedCallCount, 'CallCount setShiftState');

      if (opts.expectedCallCount > 0) {
        assert.equal(opts.expectedShifted,
            app.currentPageView.setShiftState.lastCall.args[0],
            'State is shifted');
        assert.equal(opts.expectedLocked,
            app.currentPageView.setShiftState.lastCall.args[1],
            'State is locked');
      }
    }

    test('Not locked, not shifted, atSentanceStart', function() {
      testStateChange({
        isLocked: false,
        isShifted: false,
        atSentenceStart: true,
        expectedCallCount: 1,
        expectedShifted: true,
        expectedLocked: false
      });
    });

    test('Not locked, not shifted, not atSentanceStart', function() {
      testStateChange({
        isLocked: false,
        isShifted: false,
        atSentenceStart: false,
        expectedCallCount: 0 // state is already OK
      });
    });

    test('Not locked, shifted, atSentanceStart', function() {
      testStateChange({
        isLocked: false,
        isShifted: true,
        atSentenceStart: true,
        expectedCallCount: 0 // state is already OK
      });
    });

    test('Not locked, shifted, not atSentanceStart', function() {
      testStateChange({
        isLocked: false,
        isShifted: true,
        atSentenceStart: false,
        expectedCallCount: 1,
        expectedShifted: false,
        expectedLocked: false
      });
    });

    test('Locked, shifted, atSentanceStart', function() {
      testStateChange({
        isLocked: true,
        isShifted: true,
        atSentenceStart: true,
        expectedCallCount: 0 // state is already OK
      });
    });

    test('Locked, not shifted, atSentanceStart', function() {
      testStateChange({
        isLocked: true,
        isShifted: false,
        atSentenceStart: true,
        expectedCallCount: 0 // state is already OK
      });
    });
  });
});
