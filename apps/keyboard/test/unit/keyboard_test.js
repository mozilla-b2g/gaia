'use strict';

suite('keyboard.js', function() {

  requireApp('keyboard/js/keyboard.js');
  var mockMozInputMethod;
  var realMozInputMethod;

  suiteSetup(function() {
    realMozInputMethod = window.navigator.mozInputMethod;
    window.navigator.mozInputMethod = {
      mgmt: {
        showAll: sinon.stub()
      }
    };
  });

  suiteTeardown(function() {
    window.navigator.mozInputMethod = realMozInputMethod;
  });

  suite('clearTouchedKeys', function() {
    var realClearTouchedKeys;
    var mockClearTouchedKeys;

    setup(function() {
      realClearTouchedKeys = window.clearTouchedKeys;
      mockClearTouchedKeys = window.clearTouchedKeys = sinon.stub();
    });

    teardown(function() {
      window.clearTouchedKeys = realClearTouchedKeys;
    });

    test('showIMEList should cancel all target event listeners', function() {
      showIMEList();
      assert.isTrue(mockClearTouchedKeys.called);
    });

    test('resetKeyboard should cancel all target event listeners', function() {
      resetKeyboard();
      assert.isTrue(mockClearTouchedKeys.called);
    });
  });

  suite('clearTouchedKeys - to clear event listeners', function() {
    mocha.globals(['IMERender']);
    var realTouchedKeys;
    var mockTouchedKeys;
    function getMockTouchedKey() {
      return {
        target: {
          removeEventListener: sinon.stub()
        }
      };
    }

    setup(function() {
      realTouchedKeys = window.touchedKeys;
      mockTouchedKeys = window.touchedKeys = {
        '0': getMockTouchedKey(),
        '1': getMockTouchedKey()
      };

      if (!window.IMERender) {
        window.IMERender = {
          unHighlightKey: sinon.stub()
        };
      } else {
        this.sinon.stub(IMERender, 'unHighlightKey');
      }
    });

    teardown(function() {
      window.touchedKeys = realTouchedKeys;
    });

    test('all targets will be cleared', function() {
      clearTouchedKeys();

      var removeFunc = mockTouchedKeys['0'].target.removeEventListener;
      assert.isTrue(removeFunc.calledWith('touchmove', onTouchMove));
      assert.isTrue(removeFunc.calledWith('touchend', onTouchEnd));
      assert.isTrue(removeFunc.calledWith('touchcancel', onTouchEnd));

      removeFunc = mockTouchedKeys['1'].target.removeEventListener;
      assert.isTrue(removeFunc.calledWith('touchmove', onTouchMove));
      assert.isTrue(removeFunc.calledWith('touchend', onTouchEnd));
      assert.isTrue(removeFunc.calledWith('touchcancel', onTouchEnd));
    });
  });
});
