'use strict';

/* global Event, InputMethods */

requireApp('keyboard/test/unit/setup_engine.js');
requireApp('keyboard/js/imes/latin/latin.js');

suite('latin input method capitalization and punctuation', function() {

  // this will hold the input method we're testing
  var im;

  // We accumulate the IM's output here.
  var output;

  // State we maintain to work with the im
  var isUpperCase;

  var defaultKeyboardGlue = {
    resetUpperCase: function() {
      isUpperCase = false;
    },
    sendKey: sendKey,
    sendCandidates: function(words) {
      // gotSuggestions(words);
    },
    setUpperCase: function(uc) {
      isUpperCase = uc;
    },
    setLayoutPage: function() {
    },
    isCapitalized: function() {
      return isUpperCase;
    }
  };

  function sendKey(keycode) {
    if (keycode === 8) { // backspace
      output = output.substring(0, output.length - 1);
    }
    else {
      output += String.fromCharCode(keycode);
    }
    return Promise.resolve();
  }

  // Call this before each test to reset the state to the default
  function reset() {
    output = '';
    isUpperCase = false;
  }

  function init() {
    // This is the input method object we're testing
    im = InputMethods.latin;

    // Initialize the input method with the object it will use to send
    // its output back to us
    im.init(defaultKeyboardGlue);
  }

  // Utility funcs
  function capitalize(s) {
    if (s.length === 0)
      return s;
    return s[0].toUpperCase() + s.substring(1);
  }

  function isUppercase(s) {
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c.toLowerCase() === c)
        return false;
    }
    return true;
  }

  // shallow copy of an object
  function clone(o) {
    var copy = {};
    for (var p in o)
      copy[p] = o[p];
    return copy;
  }

  // These tests verify that the latin input method is doing what it should.
  // They pass input to the IM by calling its click() method, and verify that
  // the input method sends back the expected output through the sendKey
  // function that we pass it.  The latin input method sends suggestions
  // asynchronously, but other parts are synchronous


  // The capitalization and punctuation behavior of the Latin IM depends
  // on these variables:
  //
  //   input field type
  //   input mode
  //   existing text in input field
  //   cursor position
  //   whether there is a selection
  //
  // Suggestions depend on all of those and also depend on the
  // language and whether word suggestions are enabled or not.
  //

  // Test each of these types
  var types = [
    'text',
    'textarea',
    'search',
    'url',
    'email'
  ];

  // Test these input modes
  var modes = [
    '',
    'verbatim',
    'latin',
    'latin-prose'
  ];

  var contentStates = {
    // empty input field
    empty: { value: '', cursor: 0 },
    // cursor is in the middle of a bunch of spaces
    inSpace: { value: 'a      b', cursor: 4},

    // cursor is at the start, middle, or end of the input field
    start: { value: 'word', cursor: 0 },
    middle: { value: 'word', cursor: 2 },
    end: { value: 'word', cursor: 4 },

    // like the above, but all uppercase
    startUppercase: { value: 'WORD', cursor: 0 },
    middleUppercase: { value: 'WORD', cursor: 2 },
    endUppercase: { value: 'WORD', cursor: 4 },

    // cursor is at the start, middle, or end of a word in the middle
    wordStart: { value: 'and then what', cursor: 4 },
    wordMiddle: { value: 'and then what', cursor: 6 },
    wordEnd: { value: 'and then what', cursor: 8 },

    // cursor is after a sentence, before another
    afterSentence: { value: 'Foo. Bar.', cursor: 5 },
    afterQuestion: { value: 'Foo? Bar.', cursor: 5 },
    afterExclamation: { value: 'Foo! Bar.', cursor: 5 }
  };


  // Test all the permutations of states above against these inputs.
  // The property name is the input. The property value is a function
  // that returns the expected output

  var inputs = {
    'ab': expectedCapitalization,   // Does it get capitalized?
    '  ': expectedSpaceSpace,       // Does it turn into ". "?
    ' .': expectedPunctuation,      // Does it get transposed?
    ' !': expectedPunctuation,      // Does it get transposed?
    ' ?': expectedPunctuation,      // Does it get transposed?
    ' ,': expectedPunctuation,      // Does it get transposed?
    ' ;': expectedPunctuation,      // Does it get transposed?
    ' :': expectedPunctuation       // Does it get transposed?
  };

  // Does space punc get transposed to punc space?
  function expectedPunctuation(input, type, mode, value, cursor) {
    // Don't run all permutations of this test for all inputs.
    if (input[1] !== '.' && (type !== 'textarea' || mode !== 'latin-prose'))
      return;

    // if the type is wrong, do nothing
    if (type !== 'text' && type !== 'textarea' && type !== 'search')
      return input;
    // if the mode is wrong do nothing
    if (mode === 'verbatim' || mode === 'latin')
      return input;
    // If mode is not specified, and we're not a text area, that is the
    // same as latin mode, so do nothing
    if (!mode && type !== 'textarea')
      return input;
    // If input is a space followed by a colon or semicolon, do not transpose.
    // This facilitates the entry of emoticons such as :O
    if (input === ' :' || input === ' ;')
      return input;

    // If the previous character is a letter, transpose otherwise don't
    if (cursor > 0 && /[a-zA-Z]/.test(value.charAt(cursor - 1)))
      return input[1] + input[0];
    return input;
  }


  function expectedSpaceSpace(input, type, mode, value, cursor) {
    // if the type is wrong, do nothing
    if (type !== 'text' && type !== 'textarea' && type !== 'search')
      return input;
    // if the mode is wrong do nothing
    if (mode === 'verbatim' || mode === 'latin')
      return input;
    // If mode is not specified, and we're not a text area, that is the
    // same as latin mode, so do nothing
    if (!mode && type !== 'textarea')
      return input;

    // If the previous character is a letter, return dot space
    if (cursor > 0 && /[a-zA-Z]/.test(value[cursor - 1]))
      return '. ';
    return '  ';
  }

  function expectedCapitalization(input, type, mode, value, cursor) {
    // if the type is wrong, do nothing
    if (type !== 'text' && type !== 'textarea' && type !== 'search')
      return input;
    // if the mode is wrong do nothing
    if (mode === 'verbatim' || mode === 'latin')
      return input;
    // If mode is not specified, and we're not a text area, that is the
    // same as latin mode, so do nothing
    if (!mode && type !== 'textarea')
      return input;

    // If we're still here, we're in latin-prose mode, and we may need
    // to capitalize, depending on the value and cursor position.
    if (cursor === 0)
      return capitalize(input);

    // If inserting in an all caps word, use uppercase
    if (cursor >= 2 && isUppercase(value.substring(cursor - 2, cursor)))
      return input.toUpperCase();

    // if the character before the cursor is not a space, don't capitalize
    if (!/\s/.test(value[cursor - 1]))
      return input;

    // If we're at then end of a sentence, capitalize
    if (/[.?!]\s+$/.test(value.substring(0, cursor)))
      return capitalize(input);

    // Otherwise, just return the input
    return input;
  }

  // For each test, we activate() the IM with a given initial state,
  // then send it some input, and check the output. The initial state includes
  // language, whether suggestions are enabled, input type, input mode, input
  // value, cursor position (or selectionstart, selection end).
  // There are lots of possible initial states, and we may have different
  // output in each case.

  suite('Input keys one by one', function() {
    suiteSetup(init);

    setup(function() {
      // reset the output state
      reset();
    });

    for (var t = 0; t < types.length; t++) {
      var type = types[t];
      for (var m = 0; m < modes.length; m++) {
        var mode = modes[m];
        for (var statename in contentStates) {
          for (var input in inputs) {
            runtest(input, type, mode, statename);
          }
        }
      }
    }
  });

  suite('Input keys continuously', function() {
    suiteSetup(init);

    setup(function() {
      // reset the output state
      reset();
    });

    for (var t = 0; t < types.length; t++) {
      var type = types[t];
      for (var m = 0; m < modes.length; m++) {
        var mode = modes[m];
        for (var statename in contentStates) {
          for (var input in inputs) {
            runtest(input, type, mode, statename, {continuous: true});
          }
        }
      }
    }
  });

  suite('Input keys while one of them would be rejected', function() {
    var glueToRejectKey = null;

    suiteSetup(function() {
      im = InputMethods.latin;
      glueToRejectKey = Object.create(defaultKeyboardGlue);
      glueToRejectKey.sendKey = function() {
        return Promise.reject();
      };

      im.init(glueToRejectKey);
    });

    setup(function() {
      // reset the output state
      reset();
      im.activate('en', {
        type: 'text',
        inputmode: '',
        value: '',
        selectionStart: 0,
        selectionEnd: 0
      },{suggest: false, correct: false});
    });

    test('Can input after the previous key has been rejected', function(next) {
      im.click('a'.charCodeAt(0)).then(function() {
        // Restore the sendKey to the normal one
        glueToRejectKey.sendKey = sendKey;

        // input anther key
        im.click('b'.charCodeAt(0)).then(function() {
          assert.isTrue(true); // The promise would be resolved
          assert.equal('b', output);
          next();
        });
      });
    });
  });

  suite('> selectionchange', function() {
    // Create a element as an event target
    var inputContext = document.createElement('div');

    var keyboardGlue = Object.create(defaultKeyboardGlue);
    var _windowWorker;
    var workers = [];

    function activateIME() {
      im.activate('en', {
        type: 'text',
        inputmode: '',
        value: '',
        selectionStart: 0,
        selectionEnd: 0,
        inputContext: inputContext
      },{suggest: true, correct: true});
    }

    setup(function() {
      // reset the output state
      reset();

      inputContext.textBeforeCursor = 'before';
      inputContext.textAfterCursor = '';
      inputContext.selectionStart = 0;
      inputContext.selectionEnd = 0;

      _windowWorker = window.Worker;
      var worker = window.Worker = function() {
        //workers.push(this);
      };

      worker.prototype.postMessage = function() {};
    });

    teardown(function() {
      window.Worker = _windowWorker;
    });

    test('should listen to selectionchange', function() {
      im.init(keyboardGlue);
      activateIME();

      var handleEventSpy = sinon.spy(im, 'handleEvent');
      inputContext.dispatchEvent(new Event('selectionchange'));

      sinon.assert.calledOnce(handleEventSpy);
    });

    test('wll clear the suggestions if selectionchange', function() {
      im = InputMethods.latin;
      keyboardGlue.sendCandidates = sinon.stub();
      im.init(keyboardGlue);

      activateIME();

      // change the cursor position
      inputContext.selectionStart = 4;
      inputContext.selectionEnd = 4;
      inputContext.dispatchEvent(new Event('selectionchange'));

      // will clear the suggestions since cursor changed
      sinon.assert.calledTwice(keyboardGlue.sendCandidates);
    });

    test('Do nothing if selectionchange wth the same cursor', function() {
      im = InputMethods.latin;
      keyboardGlue.sendCandidates = sinon.stub();
      im.init(keyboardGlue);

      activateIME();
      inputContext.dispatchEvent(new Event('selectionchange'));

      // Do nothing with the same cursor
      sinon.assert.calledOnce(keyboardGlue.sendCandidates);
    });

    test('Do nothing if there is pending selection change', function() {
      im = InputMethods.latin;
      keyboardGlue.sendCandidates = sinon.stub();
      im.init(keyboardGlue);

      activateIME();

      im.click('t'.charCodeAt(0));

      // change the cursor position
      inputContext.selectionStart = 4;
      inputContext.selectionEnd = 4;
      inputContext.dispatchEvent(new Event('selectionchange'));

      // Do nothing with the same cursor
      sinon.assert.calledOnce(keyboardGlue.sendCandidates);
    });

    test('Continue to listen to selectionchange after pending', function(done) {
      im = InputMethods.latin;
      keyboardGlue.sendCandidates = sinon.stub();
      im.init(keyboardGlue);

      activateIME();

      im.click('t'.charCodeAt(0)).then(function() {
        inputContext.selectionStart = 4;
        inputContext.selectionEnd = 4;
        inputContext.dispatchEvent(new Event('selectionchange'));

        sinon.assert.calledTwice(keyboardGlue.sendCandidates);
        done();
      });
    });

    test('Continue to skip selectionchange if there are still' +
         ' pending actions', function(done) {
      im = InputMethods.latin;
      keyboardGlue.sendCandidates = sinon.stub();
      im.init(keyboardGlue);

      activateIME();

      im.click('t'.charCodeAt(0)).then(function() {
        console.log('hi hi');
        inputContext.selectionStart = 4;
        inputContext.selectionEnd = 4;

        // send the event after the first key is resolved
        inputContext.dispatchEvent(new Event('selectionchange'));
      });

      im.click('o'.charCodeAt(0)).then(function() {
        sinon.assert.calledOnce(keyboardGlue.sendCandidates);
        done();
      });
    });
  });

  function runtest(input, type, mode, statename, options) {
    var modeTitle = '-' + (mode ? mode : 'default');
    var optionsTitle = options ? '-' + JSON.stringify(options) : '';
    var testname = type + modeTitle + '-' + statename + optionsTitle +
                   '-' + input;
    var state = contentStates[statename];
    var expected = inputs[input](input, type, mode, state.value, state.cursor);

    // Skip the test if the expected function returns nothing.
    // This is so we don't have too large a number of tests.
    if (expected === undefined) {
      return;
    }

    test(testname, function(next) {
      function queue(q, n) {
        q.length ? q.shift()(queue.bind(this, q, n)) : n();
      }

      // activate the IM
      im.activate('en', {
        type: type,
        inputmode: mode,
        value: state.value,
        selectionStart: state.cursor,
        selectionEnd: state.cursor
      },{suggest: false, correct: false});

      var inputQueue;
      if (options && options.continuous) {
        var lastPromise;
        input.split('').forEach(function(c) {
          lastPromise = im.click(c.charCodeAt(0),
                                 c.toUpperCase().charCodeAt(0));
        });

        lastPromise.then(function() {
          im.deactivate();
          assert.equal(output, expected,
                       'expected "' + expected + '" for input "' + input + '"');
          next();
        });
      } else {
        // Send the input one character at a time, converting
        // the input to uppercase if the IM has set uppercase
        inputQueue = input.split('').map(function(c) {
          return function(n) {
            im.click(c.charCodeAt(0),
                     c.toUpperCase().charCodeAt(0)).then(n);
          };
        });

        queue(inputQueue, function() {
          im.deactivate();
          assert.equal(output, expected,
                       'expected "' + expected + '" for input "' + input + '"');
          next();
        });
      }
    });
  }
});

/*
 * This code is an attempt to test whether word suggestions are offered when
 * they are expected. It doesn't work because when we load latin.js from
 * this test file instead of the app, the path is wrong for loading the
 * worker thread, and the suggestion engine doesn't actually start up
 *
 * So for now, we can only test capitalization and punctuation
 *
var finishTest; // we store the done function here
var suggestionsExpected;
var suggestionsTimer;

function gotSuggestions(words) {
  clearTimeout(suggestionsTimer);
  if (suggestionsExpected)
    finishTest(assert.ok(true)); // expected suggestions and got them
  else
    finishTest(assert.ok(false), "got unexpected suggestions");
}


// Test that word suggestions are offered quicly when they should be
// and are not offered when they shouldn't be. Because they are
// asynchronous, however, we have to use a timeout to detect the
// not offered case, and therefore can't run this test for all
// permutations of type and mode.
suite("latin input method word suggestions", function() {
  // Try all types and modes with a state where suggestions are expected
  // and one where they are not expected
  for(var t = 0; t < types.length; t++) {
    var type = types[t];
    for(var m = 0; m < modes.length; m++) {
      var mode = modes[m];
      runtest('en', true, type, mode, 'wordEnd',
              suggestionsExpected(type,mode));
      runtest('en', true, type, mode, 'wordMiddle', false);
    }
  }

  // try different languages
  runtest('en', true, 'text', 'latin', 'empty', true);
  runtest('pt-Br', true, 'text', 'latin', 'empty', true);
  runtest('none', true, 'text', 'latin', 'empty', false);

  // try disabled suggestions
  runtest('en', false, 'text', 'latin', 'empty', false);

  // try with a selection
  runtest('en', true, 'text', 'latin', 'wordEnd-select', false);

  function runtest(language, enabled, type, mode, statename, expected) {
    var testname = type + '-' + mode + '-' + statename + '-' +
      language + '-' + enabled;
    var state = contentStates[statename];

    test(testname, function(done) {
      finishTest = done;
      suggestionsExpected = expected;

      reset();
      im.activate(language, {
        type: type,
        inputmode: mode,
        value: state.value,
        selectionStart: state.cursor,
        selectionEnd: state.se || state.cursor
      }, { suggest: enabled, correct: false});
      // Send some input and see if we get completions
      im.click('t'.charCodeAt(0));

      // Wait 200ms to see if we get suggestions
      suggestionsTimer = setTimeout(function() {
        if (!expected) {
          done(assert.ok(true)); // we didn't expect any and didn't get any
        }
        else {
          done(assert.ok(false, "didn't get expected suggestions"));
        }
      }, 200);
    });
  }

  function suggestionsExpected(type, mode) {
    if (type !== 'text' && type !== 'textarea' && type !== 'search')
      return false;
    if (mode === 'verbatim')
      return false;

    return true;
  }
});
*/
