'use strict';
/* global InputField, MockInputMethod, MockInputContext */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_navigator_input_method.js');
require('/js/input_field.js');

suite('InputField', function() {
  mocha.setup({
    globals: [
      'InputField'
    ]
  });

  var realMozInputMethod;

  suiteSetup(function() {
    realMozInputMethod = navigator.mozInputMethod;
  });

  suiteTeardown(function() {
    navigator.mozInputMethod = realMozInputMethod;
  });

  suite('Input state and field change', function() {
    var inputField;
    var inputcontext;
    setup(function() {
      inputcontext = new MockInputContext();
      inputcontext.type = inputcontext.inputType = 'text';
      inputcontext.selectionStart = inputcontext.selectionEnd = 0;
      inputcontext.textBeforeCursor = inputcontext.textAfterCursor = '';

      navigator.mozInputMethod = new MockInputMethod(inputcontext);

      inputField = new InputField();
      inputField.start();
    });

    teardown(function() {
      inputField.stop();
      inputField = undefined;

      navigator.mozInputMethod = null;
    });

    test('inputcontextchange has been called and input field has been changed',
      function(done) {
        var newContext = new MockInputContext();
        newContext.type = newContext.inputType = 'textarea';
        newContext.selectionStart = newContext.selectionEnd = 0;
        newContext.textBeforeCursor = newContext.textAfterCursor = '';

        inputField.addEventListener('inputfieldchanged', function() {
          assert.equal(inputField.inputType, 'textarea', 'updated');

          done();
        });

        navigator.mozInputMethod.setInputContext(newContext);
      });

    test('inputcontextchange has been called and context is null',
      function(done) {
        inputField.addEventListener('inputfieldchanged', function() {
          assert.equal(inputField.inputType, undefined);
          assert.equal(inputField.inputMode, undefined);
          assert.equal(inputField.selectionStart, 0);
          assert.equal(inputField.selectionEnd, 0);
          assert.equal(inputField.textBeforeCursor, '');
          assert.equal(inputField.textAfterCursor, '');

          done();
        });

        navigator.mozInputMethod.setInputContext(null);
      });

    test('selectionchange has been called and input state has been changed',
      function(done) {
        inputField.addEventListener('inputstatechanged', function() {
          assert.equal(inputField.selectionStart, 2, 'updated');
          assert.equal(inputField.selectionEnd, 2, 'updated');

          done();
        });

        inputcontext.selectionStart = inputcontext.selectionEnd = 2;
        inputcontext.fireSelectionChange();
      });

    test(
      'surroundingtextchange has been called and input state has been changed',
      function(done) {
        inputField.addEventListener('inputstatechanged', function() {
          assert.equal(inputField.textBeforeCursor, 'foo', 'updated');

          done();
        });

        inputcontext.textBeforeCursor = 'foo';
        inputcontext.fireSurroundingTextChange();
      });
  });

  suite('sendKey()', function() {
    var inputField;
    var inputcontext;
    setup(function() {
      inputcontext = new MockInputContext();
      inputcontext.type = inputcontext.inputType = 'text';
      inputcontext.selectionStart = inputcontext.selectionEnd = 0;
      inputcontext.textBeforeCursor = inputcontext.textAfterCursor = '';

      navigator.mozInputMethod = new MockInputMethod(inputcontext);

      inputField = new InputField();
      inputField.start();
    });

    teardown(function() {
      inputField.stop();
      inputField = undefined;

      navigator.mozInputMethod = null;
    });

    test('send key and no pending promise', function() {
      var charcode = 111;
      var keycode = 24;
      var sendKeySpy = sinon.spy(inputcontext, 'sendKey');

      // Append event listener
      var inputstatechangedCalled = false;
      var checkInput = function() {
        if (inputstatechangedCalled) {
          assert.isTrue(false, 'inputstatechanged should not call twice.');
        }
        inputstatechangedCalled = true;
        assert.equal(inputField.selectionStart, 1, 'updated');
        assert.equal(inputField.selectionEnd, 1, 'updated');
        assert.equal(inputField.textBeforeCursor, String.fromCharCode(111),
          'updated');
      };
      inputField.addEventListener('inputstatechanged', checkInput);

      // Send the key
      inputField.sendKey(keycode, charcode, null);

      // Make sure inputstatechanged is called right away
      assert.isTrue(inputstatechangedCalled, 'inputstatechanged called');

      // Update the inputcontext and resolve the promise.
      // inputField should not be called again.
      var promise = sendKeySpy.getCall(0).returnValue;
      inputcontext.selectionStart = inputcontext.selectionEnd = 1;
      inputcontext.textBeforeCursor = String.fromCharCode(111);
      promise.resolve();
    });

    test('send backspace and no pending promise', function() {
      var charcode = 0;
      var keycode = 8;
      var sendKeySpy = sinon.spy(inputcontext, 'sendKey');

      // Update input context first.
      inputcontext.textBeforeCursor = 'fooo';
      inputcontext.selectionStart = inputcontext.selectionEnd = 4;
      inputcontext.fireSelectionChange();
      inputcontext.fireSurroundingTextChange();

      // Append event listener
      var inputstatechangedCalled = false;
      var checkInput = function() {
        if (inputstatechangedCalled) {
          assert.isTrue(false, 'inputstatechanged should not call twice.');
        }
        inputstatechangedCalled = true;
        assert.equal(inputField.selectionStart, 3, 'updated');
        assert.equal(inputField.selectionEnd, 3, 'updated');
        assert.equal(inputField.textBeforeCursor, 'foo',
          'updated');
      };
      inputField.addEventListener('inputstatechanged', checkInput);

      // Send the key
      inputField.sendKey(keycode, charcode, null);

      // Make sure inputstatechanged is called right away
      assert.isTrue(inputstatechangedCalled, 'inputstatechanged called');

      // Update the inputcontext and resolve the promise.
      // inputField should not be called again.
      var promise = sendKeySpy.getCall(0).returnValue;
      inputcontext.textBeforeCursor = 'foo';
      inputcontext.selectionStart = inputcontext.selectionEnd = 3;
      promise.resolve();
    });

    test('send return and no pending promise', function() {
      var charcode = 0;
      var keycode = 13;
      var sendKeySpy = sinon.spy(inputcontext, 'sendKey');

      // Append event listener
      var inputstatechangedCalled = false;
      var checkInput = function() {
        if (inputstatechangedCalled) {
          assert.isTrue(false, 'inputstatechanged should not call twice.');
        }
        inputstatechangedCalled = true;
        assert.equal(inputField.selectionStart, 1, 'updated');
        assert.equal(inputField.selectionEnd, 1, 'updated');
        assert.equal(inputField.textBeforeCursor, '\n',
          'updated');
      };
      inputField.addEventListener('inputstatechanged', checkInput);

      // Send the key
      inputField.sendKey(keycode, charcode, null);

      // Make sure inputstatechanged is called right away
      assert.isTrue(inputstatechangedCalled, 'inputstatechanged called');

      // Update the inputcontext and resolve the promise.
      // inputField should not be called again.
      var promise = sendKeySpy.getCall(0).returnValue;
      inputcontext.selectionStart = inputcontext.selectionEnd = 1;
      inputcontext.textBeforeCursor = '\n';
      promise.resolve();
    });

    test('send 2 keys really fast', function() {
      var charcode1 = 111;
      var keycode1 = 79;
      var charcode2 = 112;
      var keycode2 = 80;
      var sendKeySpy = sinon.spy(inputcontext, 'sendKey');

      // Append event listener
      var inputstatechangedCallCount = 0;
      var checkInput = function() {
        switch (inputstatechangedCallCount) {
          case 0:
            assert.equal(inputField.selectionStart, 1, 'updated');
            assert.equal(inputField.selectionEnd, 1, 'updated');
            assert.equal(inputField.textBeforeCursor, String.fromCharCode(111),
              'updated');
            break;

          case 1:
            assert.equal(inputField.selectionStart, 2, 'updated');
            assert.equal(inputField.selectionEnd, 2, 'updated');
            assert.equal(inputField.textBeforeCursor,
              String.fromCharCode(111, 112), 'updated');
            break;

          default:
            assert.isTrue(false,
              'inputstatechanged should not more than twice.');

            break;
        }
        inputstatechangedCallCount++;
      };
      inputField.addEventListener('inputstatechanged', checkInput);

      // Send the first key.
      inputField.sendKey(keycode1, charcode1, null);

      // Make sure inputstatechanged is called right away
      assert.equal(inputstatechangedCallCount, 1, 'inputstatechanged called');

      // Without resolving the first promise, send the second key.
      inputField.sendKey(keycode2, charcode2, null);

      // Make sure inputstatechanged is called right away
      assert.equal(inputstatechangedCallCount, 2, 'inputstatechanged called');

      // Update the inputcontext and resolve the promise.
      // inputField should not be called again.
      var promise1 = sendKeySpy.getCall(0).returnValue;
      inputcontext.selectionStart = inputcontext.selectionEnd = 1;
      inputcontext.textBeforeCursor = String.fromCharCode(111);
      promise1.resolve();

      // Update the inputcontext and resolve the promise.
      // inputField should not be called again.
      var promise2 = sendKeySpy.getCall(1).returnValue;
      inputcontext.selectionStart = inputcontext.selectionEnd = 2;
      inputcontext.textBeforeCursor = String.fromCharCode(111, 112);
      promise2.resolve();
    });
  });

  suite('replaceSurroundingText()', function() {
    var inputField;
    var inputcontext;
    setup(function() {
      inputcontext = new MockInputContext();
      inputcontext.type = inputcontext.inputType = 'text';
      inputcontext.selectionStart = inputcontext.selectionEnd = 0;
      inputcontext.textBeforeCursor = inputcontext.textAfterCursor = '';

      navigator.mozInputMethod = new MockInputMethod(inputcontext);

      inputField = new InputField();
      inputField.start();
    });

    teardown(function() {
      inputField.stop();
      inputField = undefined;

      navigator.mozInputMethod = null;
    });

    test('no pending promise', function() {
      var replaceSurroundingTextSpy =
        sinon.spy(inputcontext, 'replaceSurroundingText');

      // Update input context first.
      inputcontext.textBeforeCursor = 'xxxx';
      inputcontext.textAfterCursor = 'yyyyy';
      inputcontext.selectionStart = inputcontext.selectionEnd = 4;
      inputcontext.fireSelectionChange();
      inputcontext.fireSurroundingTextChange();

      // Append event listener
      var inputstatechangedCalled = false;
      var checkInput = function() {
        if (inputstatechangedCalled) {
          assert.isTrue(false, 'inputstatechanged should not call twice.');
        }
        inputstatechangedCalled = true;
        assert.equal(inputField.selectionStart, 7, 'updated');
        assert.equal(inputField.selectionEnd, 7, 'updated');
        assert.equal(inputField.textBeforeCursor, 'xfoobar',
          'updated');
        assert.equal(inputField.textAfterCursor, 'y',
          'updated');
      };
      inputField.addEventListener('inputstatechanged', checkInput);

      // Call replaceSurroundingText();
      inputField.replaceSurroundingText('foobar', 3, 4);

      // Make sure inputstatechanged is called right away
      assert.isTrue(inputstatechangedCalled, 'inputstatechanged called');

      // Update the inputcontext and resolve the promise.
      // inputField should not be called again.
      var promise = replaceSurroundingTextSpy.getCall(0).returnValue;
      inputcontext.selectionStart = inputcontext.selectionEnd = 7;
      inputcontext.textBeforeCursor = 'xfoobar';
      inputcontext.textAfterCursor = 'y';
      promise.resolve();
    });
  });

  suite('deleteSurroundingText()', function() {
    var inputField;
    var inputcontext;
    setup(function() {
      inputcontext = new MockInputContext();
      inputcontext.type = inputcontext.inputType = 'text';
      inputcontext.selectionStart = inputcontext.selectionEnd = 0;
      inputcontext.textBeforeCursor = inputcontext.textAfterCursor = '';

      navigator.mozInputMethod = new MockInputMethod(inputcontext);

      inputField = new InputField();
      inputField.start();
    });

    teardown(function() {
      inputField.stop();
      inputField = undefined;

      navigator.mozInputMethod = null;
    });

    test('no pending promise', function() {
      var replaceSurroundingTextSpy =
        sinon.spy(inputcontext, 'replaceSurroundingText');

      // Update input context first.
      inputcontext.textBeforeCursor = 'xxxx';
      inputcontext.textAfterCursor = 'yyyyy';
      inputcontext.selectionStart = inputcontext.selectionEnd = 4;
      inputcontext.fireSelectionChange();
      inputcontext.fireSurroundingTextChange();

      // Append event listener
      var inputstatechangedCalled = false;
      var checkInput = function() {
        if (inputstatechangedCalled) {
          assert.isTrue(false, 'inputstatechanged should not call twice.');
        }
        inputstatechangedCalled = true;
        assert.equal(inputField.selectionStart, 1, 'updated');
        assert.equal(inputField.selectionEnd, 1, 'updated');
        assert.equal(inputField.textBeforeCursor, 'x',
          'updated');
        assert.equal(inputField.textAfterCursor, 'y',
          'updated');
      };
      inputField.addEventListener('inputstatechanged', checkInput);

      // Call deleteSurroundingText();
      inputField.deleteSurroundingText(3, 4);

      // Make sure inputstatechanged is called right away
      assert.isTrue(inputstatechangedCalled, 'inputstatechanged called');

      // Update the inputcontext and resolve the promise.
      // inputField should not be called again.
      var promise = replaceSurroundingTextSpy.getCall(0).returnValue;
      inputcontext.selectionStart = inputcontext.selectionEnd = 1;
      inputcontext.textBeforeCursor = 'x';
      inputcontext.textAfterCursor = 'y';
      promise.resolve();
    });
  });

  suite('String functions', function() {
    var inputField;
    var inputcontext;
    setup(function() {
      inputcontext = new MockInputContext();
      inputcontext.type = inputcontext.inputType = 'text';
      inputcontext.selectionStart = inputcontext.selectionEnd = 0;
      inputcontext.textBeforeCursor = inputcontext.textAfterCursor = '';

      navigator.mozInputMethod = new MockInputMethod(inputcontext);

      inputField = new InputField();
      inputField.start();
    });

    teardown(function() {
      inputField.stop();
      inputField = undefined;

      navigator.mozInputMethod = null;
    });

    test('atSentenceStart()', function() {
      var textBeforeCursor = '. ';
      var textAfterCursor = ' a';

      inputField.textBeforeCursor = textBeforeCursor;
      inputField.textAfterCursor = textAfterCursor;

      assert.equal(!!inputField.atSentenceStart(), true);
    });

    test('atWordEnd()', function() {
      var textBeforeCursor = 'test';
      var textAfterCursor = ' a';

      inputField.textBeforeCursor = textBeforeCursor;
      inputField.textAfterCursor = textAfterCursor;

      assert.equal(!!inputField.atWordEnd(), true);

      inputField.selectionStart = 1;
      inputField.selectionEnd = 2;
      assert.equal(inputField.atWordEnd(), false);
    });

    test('wordBeforeCursor()', function() {
      inputField.textBeforeCursor = 'test!';
      assert.equal(!!inputField.wordBeforeCursor(), false);
      inputField.textBeforeCursor = 'ote st';
      assert.equal(inputField.wordBeforeCursor(), 'st');
    });
  });
});
