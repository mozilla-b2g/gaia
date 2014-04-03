'use strict';
/* global InputField */

requireApp('demo-keyboard/js/input_field.js');

suite('InputField', function() {
  function eventTargetSpy() {
    var d = document.createElement('div');
    sinon.spy(d, 'addEventListener');
    sinon.spy(d, 'removeEventListener');
    sinon.spy(d, 'dispatchEvent');
    return d;
  }

  var callEventType;
  function getEventType(evt) {
    callEventType = evt.type;
  }
  mocha.setup({
    globals: [
      'InputField'
    ]
  });

  var realMozInputMethod;

  suiteSetup(function() {
    realMozInputMethod = navigator.mozInputMethod;
    navigator.mozInputMethod = eventTargetSpy();
  });

  suiteTeardown(function() {
    navigator.mozInputMethod = realMozInputMethod;
  });

  suite('Input state and field change', function() {
    var inputField;
    var inputcontext;
    setup(function() {
      inputField = new InputField();
      inputcontext = navigator.mozInputMethod.inputcontext = eventTargetSpy();
      inputField.start();
      inputField.dispatcher
        .addEventListener('inputfieldchanged', getEventType);
      inputField.dispatcher
        .addEventListener('inputstatechanged', getEventType);
    });

    teardown(function() {
      navigator.mozInputMethod.inputcontext = null;
      inputcontext = null;
      inputField.stop();
      inputField = undefined;
      callEventType = undefined;
    });

    test('inputcontextchange has been called and input field has been changed',
      function() {
      inputcontext.inputMode = true;
      navigator.mozInputMethod.dispatchEvent(
        new CustomEvent('inputcontextchange'));
      assert.equal(callEventType, 'inputfieldchanged');
    });

    test('inputcontextchange has been called and input state has been changed',
      function() {
      inputcontext.selectionStart = 3;
      navigator.mozInputMethod.dispatchEvent(
        new CustomEvent('inputcontextchange'));
      assert.equal(callEventType, 'inputstatechanged');
    });

    test('inputcontextchange has been called and input type has been changed',
      function() {
      inputcontext.inputType = 3;
      navigator.mozInputMethod.dispatchEvent(
        new CustomEvent('inputcontextchange'));
      assert.equal(callEventType, 'inputfieldchanged');
    });

    test('inputcontext is null',
      function() {
      navigator.mozInputMethod.inputcontext = null;
      navigator.mozInputMethod.dispatchEvent(
        new CustomEvent('inputcontextchange'));
      assert.equal(inputField.inputType, undefined);
      assert.equal(inputField.inputMode, undefined);
      assert.equal(inputField.selectionStart, 0);
      assert.equal(inputField.selectionEnd, 0);
      assert.equal(inputField.textBeforeCursor, '');
      assert.equal(inputField.textAfterCursor, '');
    });
  });

  suite('Send key', function() {
    var inputField;
    var inputcontext;
    setup(function() {
      inputField = new InputField();
      inputcontext = navigator.mozInputMethod.inputcontext = eventTargetSpy();
      inputcontext.sendKey = function() {
        var promise = {
          then: function(success) {
            inputField.pendingPromise = promise;
            success();
          }
        };
        return promise;
      };
      inputField._dispatchInputStateChanged = sinon.spy();
      inputField.start();
      inputField.dispatcher
        .addEventListener('inputstatechanged', getEventType);
    });

    teardown(function() {
      navigator.mozInputMethod.inputcontext = null;
      inputcontext = null;
      inputField.stop();
      inputField = undefined;
      callEventType = undefined;
    });

    test('send key and no pending promise', function() {
      var charcode = 111;
      var keycode = 24;
      var selectionStart = 6;
      var textBeforeCursor = 'test';
      inputcontext.textBeforeCursor = textBeforeCursor;
      inputcontext.selectionStart = selectionStart;
      inputField.sendKey(keycode, charcode, null);

      assert.equal(inputField.textBeforeCursor,
        textBeforeCursor + String.fromCharCode(charcode));
      assert.equal(inputField.selectionStart, selectionStart + 1);

      inputField._syncState();
      // We call _dispatchInputStateChanged three times:
      // first call is from inputField.start() since
      // navigator.mozInputMethod.inputcontext is not undefined, and second
      // call is at the end of sendKey(), and the third call is when we call
      // _syncState, the textBeforeCursor and selectionStart are changed by
      // sendKey function.
      sinon.assert.callCount(inputField._dispatchInputStateChanged,
        3, 'CallCount _dispatchInputStateChanged');
    });

    test('send key with keycode 8 and has text before cursor', function() {
      var keycode = 8;
      var selectionStart = 6;
      var textBeforeCursor = 'test';
      inputcontext.textBeforeCursor = textBeforeCursor;
      inputcontext.selectionStart = selectionStart;
      inputField.sendKey(keycode);

      assert.equal(inputField.textBeforeCursor, textBeforeCursor.slice(0, -1));
      assert.equal(inputField.selectionStart, selectionStart - 1);
    });

    test('send key with keycode 13', function() {
      var keycode = 13;
      var selectionStart = 6;
      var textBeforeCursor = 'test';
      inputcontext.textBeforeCursor = textBeforeCursor;
      inputcontext.selectionStart = selectionStart;
      inputField.sendKey(keycode);

      assert.equal(inputField.textBeforeCursor, textBeforeCursor + '\n');
      assert.equal(inputField.selectionStart, selectionStart + 1);
    });
  });

  suite('replaceSurroundingText and other', function() {
    var inputField;
    var inputcontext;
    setup(function() {
      inputField = new InputField();
      inputcontext = navigator.mozInputMethod.inputcontext = eventTargetSpy();
      inputcontext.replaceSurroundingText =
        inputcontext.deleteSurroundingText =
        function() {
          var promise = {
            then: function(success) {
              inputField.pendingPromise = promise;
              success();
            }
          };
          return promise;
        };

      inputField.start();
    });

    teardown(function() {
      navigator.mozInputMethod.inputcontext = null;
      inputcontext = null;
      inputField.stop();
      inputField = undefined;
      callEventType = undefined;
    });

    test('replaceSurroundingText', function() {
      var text = 'test33';
      var numBefore = 2;
      var numAfter = 1;
      var textAfterCursor = 'textAfterCursor';

      inputcontext.textBeforeCursor = text;
      inputcontext.textAfterCursor = textAfterCursor;
      inputField.replaceSurroundingText(text, numBefore, numAfter);

      var expectedTextBeforeCursor = text.slice(0, -numBefore) + text;
      assert.equal(inputField.textBeforeCursor, expectedTextBeforeCursor);
      assert.equal(inputField.selectionEnd, expectedTextBeforeCursor.length);
      assert.equal(inputField.selectionStart, expectedTextBeforeCursor.length);
    });

    test('atSentenceStart', function() {
      var textBeforeCursor = '. ';
      var textAfterCursor = ' a';

      inputField.textBeforeCursor = textBeforeCursor;
      inputField.textAfterCursor = textAfterCursor;

      assert.equal(!!inputField.atSentenceStart(), true);
    });

    test('atWordEnd', function() {
      var textBeforeCursor = 'test';
      var textAfterCursor = ' a';

      inputField.textBeforeCursor = textBeforeCursor;
      inputField.textAfterCursor = textAfterCursor;

      assert.equal(!!inputField.atWordEnd(), true);

      inputField.selectionStart = 1;
      inputField.selectionEnd = 2;
      assert.equal(inputField.atWordEnd(), false);
    });

    test('wordBeforeCursor', function() {
      inputField.textBeforeCursor = 'test!';
      assert.equal(!!inputField.wordBeforeCursor(), false);
      inputField.textBeforeCursor = 'ote st';
      assert.equal(inputField.wordBeforeCursor(), 'st');
    });
  });
});
