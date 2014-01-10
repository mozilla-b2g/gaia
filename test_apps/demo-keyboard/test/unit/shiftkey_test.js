/*global requireApp suite test assert setup teardown sinon mocha
  suiteTeardown */
suite('ShiftKey', function() {
  function eventEmitterSpy() {
    var d = document.createElement('div');
    sinon.spy(d, 'addEventListener');
    sinon.spy(d, 'removeEventListener');
    sinon.spy(d, 'dispatchEvent');
    return d;
  }

  mocha.setup({
    globals: [
      'KeyboardTouchHandler',
      'InputField',
      'currentPageView',
      'ShiftKey'
    ]
  });

  var keyboardTouchHelper, inputField, currentPageView;

  suiteSetup(function(next) {
    window.KeyboardTouchHandler = keyboardTouchHelper = eventEmitterSpy();
    window.InputField = inputField = eventEmitterSpy();
    requireApp('demo-keyboard/js/shiftkey.js', next);
  });

  setup(function() {
    window.currentPageView = currentPageView = {
      setShiftState: sinon.spy(function(shifted, locked) {
        currentPageView.shifted = shifted;
        currentPageView.locked = locked;
      })
    };
  });

  suiteTeardown(function() {
    // @todo restore props on window?
  });

  suite('Key handling', function() {
    function sendKey(key) {
      keyboardTouchHelper.dispatchEvent(new CustomEvent('key', {
        detail: key }));
    }

    function testShiftCalls(noOfCalls, expectedShifted, expectedLocked) {
      for (var i = 0; i < noOfCalls; i++) {
        sendKey('SHIFT');
      }
      assert.equal(expectedShifted,
          currentPageView.setShiftState.lastCall.args[0], 'State is shifted');
      assert.equal(expectedLocked,
          currentPageView.setShiftState.lastCall.args[1], 'State is locked');
    }

    test('Sending non-shift key doesn\'t trigger shiftState', function() {
      sendKey('a');
      assert.equal(currentPageView.setShiftState.callCount, 0,
        'No change in shiftState was made');
    });

    suite('Non-shifted and non-locked', function() {
      setup(function() {
        currentPageView.shifted = currentPageView.locked = false;
      });

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
        currentPageView.shifted = true;
        currentPageView.locked = false;
      });

      test('Single shift event (fast)', function() {
        // if fast -> go into locked mode
        testShiftCalls(1, true, true);
      });

      test('Single shift event (slow)', function() {
        currentPageView.shifted = false;
        sendKey('SHIFT');

        window.ShiftKey.resetLastShiftTime();

        // if slow -> move into unshift/unlocked mode
        testShiftCalls(1, false, false);
      });

      test('Double shift event', function() {
        window.ShiftKey.resetLastShiftTime();

        // I think this is incorrect, on old keyboard this goes to
        // true, true state
        testShiftCalls(2, true, false);
      });

      test('Triple shift event', function() {
        window.ShiftKey.resetLastShiftTime();

        // Think also incorrect, old keyboard -> false, false
        testShiftCalls(3, true, true);
      });
    });

    suite('Shifted and locked', function() {
      setup(function() {
        currentPageView.shifted = true;
        currentPageView.locked = true;
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
    function testStateChange(opts) {
      currentPageView.locked = opts.isLocked;
      currentPageView.shifted = opts.isShifted;
      inputField.atSentenceStart = sinon.stub().returns(opts.atSentenceStart);

      inputField.dispatchEvent(new CustomEvent('inputstatechanged'));

      sinon.assert.callCount(currentPageView.setShiftState,
        opts.expectedCallCount, 'CallCount setShiftState');

      if (opts.expectedCallCount > 0) {
        assert.equal(opts.expectedShifted,
            currentPageView.setShiftState.lastCall.args[0], 'State is shifted');
        assert.equal(opts.expectedLocked,
            currentPageView.setShiftState.lastCall.args[1], 'State is locked');
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
