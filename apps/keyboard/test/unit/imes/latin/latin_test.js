'use strict';

/* global KeyboardEvent, KeyEvent, PAGE_INDEX_DEFAULT, PromiseStorage */

require('/js/shared/promise_storage.js');

window.PAGE_INDEX_DEFAULT = 0;
window.InputMethods = {};

suite('latin.js', function() {
  var engine;
  var glue;

  // We pass the same workerStub because latin engine reuse the worker
  // between activations.
  var workerStub = {
    onmessage: null,
    postMessage: function() { /* to be stubbed between tests */}
  };

  // Load the script once and attach it to |engine|.
  suiteSetup(function(done) {
    require('/js/imes/latin/latin.js', function() {
      engine = window.InputMethods.latin;

      done();
    });
  });

  setup(function() {
    this.sinon.stub(workerStub, 'postMessage');

    this.sinon.stub(window, 'Worker').returns(workerStub);

    var stubPromiseStorage =
      this.sinon.stub(Object.create(PromiseStorage.prototype));
    this.sinon.stub(window, 'PromiseStorage')
      .returns(stubPromiseStorage);

    // object is what we'd used to resolve into (see getData below)
    stubPromiseStorage.getItem.returns(Promise.resolve({user: 'user'}));

    glue = {
      mOutput: '',
      mIsUpperCase: false,
      mResolveSendKey: true,

      sendKey: this.sinon.spy(function(keycode) {
        if (!this.mResolveSendKey) {
          return Promise.reject();
        }

        if (keycode === 8) { // backspace
          this.mOutput =
            this.mOutput.substring(0, this.mOutput.length - 1);
        }
        else {
          this.mOutput += String.fromCharCode(keycode);
        }

        return Promise.resolve();
      }),

      sendCandidates: this.sinon.stub(),

      setUpperCase: this.sinon.spy(function setUpperCase(state) {
        this.mIsUpperCase = state.isUpperCase;
      }),

      setLayoutPage: this.sinon.stub(),

      isCapitalized: this.sinon.spy(function isCapitalized() {
        return this.mIsUpperCase;
      }),

      replaceSurroundingText: this.sinon.stub().returns(Promise.resolve()),

      getData: this.sinon.stub().returns(Promise.resolve({}))
    };

    // We are not supposed to call init() more than once in the real setup,
    // but we need to call it here, as we need to have the engine use a
    // new glue object for each test.
    //
    // Moreover, for each of the tests, we will activate() the engine with
    // desired conditions and deactivate on teardown().
    engine.init(glue);
  });

  suite('Capitalization and punctuation behavior', function() {
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

    // Utility function
    var capitalizeWord = function capitalizeWord(word) {
      if (word.length === 0) {
        return word;
      }
      return word[0].toUpperCase() + word.substring(1);
    };

    // Test all the permutations of states above against these inputs.
    // The property name is the input. The property value is a function
    // that returns the expected output

    // Does space punc get transposed to punc space?
    var expectedPunctuation =
    function expectedPunctuation(input, type, mode, value, cursor) {
      // Don't run all permutations of this test for all inputs.
      if (input[1] !== '.' && (type !== 'textarea' || mode !== 'latin-prose')) {
        return;
      }

      // if the type is wrong, do nothing
      if (type !== 'text' && type !== 'textarea' && type !== 'search') {
        return input;
      }
      // if the mode is wrong do nothing
      if (mode === 'verbatim' || mode === 'latin') {
        return input;
      }
      // If mode is not specified, and we're not a text area, that is the
      // same as latin mode, so do nothing
      if (!mode && type !== 'textarea') {
        return input;
      }
      // If input is a space followed by a colon or semicolon, do not transpose.
      // This facilitates the entry of emoticons such as :O
      if (input === ' :' || input === ' ;') {
        return input;
      }

      // If the previous character is a letter, transpose otherwise don't
      if (cursor > 0 && /[a-zA-Z]/.test(value.charAt(cursor - 1))) {
        return input[1] + input[0];
      }

      return input;
    };

    var expectedSpaceSpace =
    function expectedSpaceSpace(input, type, mode, value, cursor) {
      // if the type is wrong, do nothing
      if (type !== 'text' && type !== 'textarea' && type !== 'search') {
        return input;
      }
      // if the mode is wrong do nothing
      if (mode === 'verbatim' || mode === 'latin') {
        return input;
      }
      // If mode is not specified, and we're not a text area, that is the
      // same as latin mode, so do nothing
      if (!mode && type !== 'textarea') {
        return input;
      }

      // If the previous character is a letter, return dot space
      if (cursor > 0 && /[a-zA-Z]/.test(value[cursor - 1])) {
        return '. ';
      }

      return '  ';
    };

    var expectedCapitalization =
    function expectedCapitalization(input, type, mode, value, cursor) {
      // if the type is wrong, do nothing
      if (type !== 'text' && type !== 'textarea' && type !== 'search') {
        return input;
      }
      // if the mode is wrong do nothing
      if (mode === 'verbatim' || mode === 'latin') {
        return input;
      }
      // If mode is not specified, and we're not a text area, that is the
      // same as latin mode, so do nothing
      if (!mode && type !== 'textarea') {
        return input;
      }

      // If we're still here, we're in latin-prose mode, and we may need
      // to capitalize, depending on the value and cursor position.
      if (cursor === 0) {
        return capitalizeWord(input);
      }

      // if the character before the cursor is not a space, don't capitalize
      if (!/\s/.test(value[cursor - 1])) {
        return input;
      }

      // If we're at then end of a sentence, capitalize
      if (/[.?!]\s+$/.test(value.substring(0, cursor))) {
        return capitalizeWord(input);
      }

      // Otherwise, just return the input
      return input;
    };

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

    var constructTest =
    function constructTest(input, type, mode, statename) {
      var modeTitle = '-' + (mode ? mode : 'default');
      var testname = type + modeTitle + '-' + statename +
                     '-' + input;
      var state = contentStates[statename];
      var expected =
        inputs[input](input, type, mode, state.value, state.cursor);

      // Skip the test if the expected function returns nothing.
      // This is so we don't have too large a number of tests.
      if (expected === undefined) {
        return;
      }

      test(testname, function(done) {
        engine.activate('en', {
          type: type,
          inputmode: mode,
          value: state.value,
          selectionStart: state.cursor,
          selectionEnd: state.cursor
        },{ suggest: false, correct: false });

        // Wait for getData() to resolve.
        Promise.resolve().then(function() {
          var promise = Promise.resolve();
          input.split('').forEach(function(c) {
            promise = promise.then(function() {
              if (glue.mIsUpperCase) {
                c = c.toUpperCase();
              }
              return engine.click(c.charCodeAt(0));
            });
          });

          return promise.then(function() {
            assert.equal(
              glue.mOutput, expected,
              'expected "' + expected + '" for input "' + input + '"');
          });
        }).then(done, done);
      });
    };

    // For each test, we activate() the IM with a given initial state,
    // then send it some input, and check the output.
    // The initial state includes language, whether suggestions are enabled,
    // input type, input mode, input value, cursor position
    // (or selectionstart, selection end).
    // There are lots of possible initial states, and we may have different
    // output in each case.

    teardown(function() {
      engine.deactivate();
    });

    suite('Input keys one by one', function() {
      for (var t = 0; t < types.length; t++) {
        var type = types[t];
        for (var m = 0; m < modes.length; m++) {
          var mode = modes[m];
          for (var statename in contentStates) {
            for (var input in inputs) {
              constructTest(input, type, mode, statename);
            }
          }
        }
      }
    });
  });

  suite('Suggestions', function() {
    // For most tests here we ignore user dictionary predictions (i.e. testing
    // old behaviors). We explicitly test it as noted.
    var activateEngineWithState =
    function activateEngineWithState(value, cursorStart, cursorEnd) {
      engine.activate('en', {
        type: 'text',
        inputmode: 'latin-prose',
        value: value,
        selectionStart: cursorStart || value.length,
        selectionEnd: cursorEnd || value.length
      }, {
        suggest: true,
        correct: true
      });

      // Must wait for getData() to resolve in these tests.
      return Promise.resolve();
    };

    var activateAndTestPrediction =
    function activateAndTestPrediction(value, input, suggestions) {
      return activateEngineWithState(value).then(function() {
        workerStub.onmessage({
          data: {
            cmd: 'predictions',
            input: input, // old input
            suggestions: suggestions
          }
        });
      });
    };

    // for most tests we deliberately ignore all user-dictionary mechanisms to
    // ease testing of flow, by directly intercepting the last Promise.all call
    setup(function() {
      // the empty {} was what we'd resolved into for built-in dictionary (see
      // getData above for glue stub)
      this.sinon.stub(Promise, 'all').returns(Promise.resolve([{}]));
    });

    teardown(function() {
      Promise.all.restore();
      engine.deactivate();
    });

    suite('Handling user dictionary blob', function() {
      test('correctly passed to worker through setLanguageSync',
      function(done) {
        // test strategy is a bit complex: we want to test that the blob from
        // PromiseStorage is propogated to the Promise.all call and we want to
        // know the setLanguage call used results from Promise.all call.
        // The former is tested by then()'ing the Promise.all argument, and the
        // latter by asserting worker postMessage stub. However, since the
        // former one will happen in the next tick, we'll also need to wrap
        // ourselves in Promise.all. So proper restoration on Promise.all is
        // very important.

        var resolvePromiseStorageBlob, rejectPromiseStorageBlob;
        var resolveWorkerPostMessage;

        var pPromiseStorageBlob = new Promise(function(resolve, reject) {
          resolvePromiseStorageBlob = resolve;
          rejectPromiseStorageBlob = reject;
        });

        var pWorkerPostMessage = new Promise(function(resolve) {
          resolveWorkerPostMessage = resolve;

          resolve();
        });

        Promise.all.restore();

        var pAll = Promise.all([pPromiseStorageBlob, pWorkerPostMessage]);

        this.sinon.stub(Promise, 'all')
          .returns(Promise.resolve([{}, {user: 'user'}]));

        activateEngineWithState('').then(function(){
          Promise.all.firstCall.args[0][1].then(blob => {
            assert.deepEqual(blob, {user: 'user'});
            resolvePromiseStorageBlob();
          }).catch(e => {
            rejectPromiseStorageBlob(e);
          });

          sinon.assert.calledWith(
            workerStub.postMessage,
            { args: ['en', {}, {user: 'user'}], cmd: 'setLanguage' },
            [{}, {user: 'user'}]);
          resolveWorkerPostMessage();
        });

        // calling then(done) (the first parameter) will make done receive an
        // array of Promise resolutions and trigger mocha fail, so let's wrap it
        pAll.then(() => {
          done();
        }, done);
      });

      test('call setUserDictionary on activation', function(done) {
        // activate the engine twice to make sure worker is there at the second
        // time.
        activateEngineWithState('').then(function(){
          activateEngineWithState('').then(function(){
            sinon.assert.calledWith(
              workerStub.postMessage,
              { args: [{user: 'user'}], cmd: 'setUserDictionary'},
              [{user: 'user'}]);
            done();
          });
        });
      });
    });

    suite('Without handling user dictionary', function() {
      test('After activation (and do nothing)', function(done) {
        activateEngineWithState('').then(function() {
          // maybe we shouldnt call this at all? don't know...
          sinon.assert.callCount(glue.sendCandidates, 1);
          sinon.assert.calledWith(glue.sendCandidates, []);

          // Also, a space should not be inserted
          sinon.assert.callCount(glue.sendKey, 0);
        }).then(done, done);
      });

      test('Suggestion data doesnt match input? Ignore.', function(done) {
        activateAndTestPrediction('janj', 'jan', [
          ['Jan', 1],
          ['jan', 1],
          ['Pietje', 1]
        ]).then(function() {
          // maybe we shouldnt call this at all? don't know...
          sinon.assert.callCount(glue.sendCandidates, 1);
          sinon.assert.calledWith(glue.sendCandidates, []);
        }).then(done, done);
      });

      test('One char input "n" should not autocorrect to a multichar word',
      function(done) {
        activateAndTestPrediction('n', 'n', [
          ['no', 1], // we want to ensure that this first suggestion is not
                  // marked (with * prefix) as an autocorrection
          ['not', 1],
          ['now', 1]
        ]).then(function() {
          sinon.assert.callCount(glue.sendCandidates, 1);
          // maybe we shouldnt call this at all? don't know...
          sinon.assert.calledWith(glue.sendCandidates,
            ['no', 'not', 'now']); // Make sure we do not get "*no"
        }).then(done, done);
      });

      test('One char input "i" should autocorrect to a multichar word',
      function(done) {
        // But we also want to be sure that single letters like i do get
        // autocorrected to single letter words like I
        activateAndTestPrediction('i', 'i', [
          ['I', 1], // we want to ensure that this first suggestion is not
                  // marked (with * prefix) as an autocorrection
          ['in', 1],
          ['it', 1]
        ]).then(function() {
          sinon.assert.calledWith(
            glue.sendCandidates, ['*I', 'in', 'it']);
        }).then(done, done);
      });

      test('Input "im" should autocorrect to "I\'m", not "in"',
      function(done) {
        activateAndTestPrediction('im', 'im', [
          ['in', 21],
          ['I\'m', 16],
          ['km', 9],
          ['um', 9]
        ]).then(function() {
          sinon.assert.calledWith(
            glue.sendCandidates, ['*I\'m', 'in', 'km']);
        }).then(done, done);
      });

      test('Input "id" should autocorrect to "I\'d", not "is"',
      function(done) {
        activateAndTestPrediction('id', 'id', [
          ['is', 20],
          ['I\'d', 19],
          ['if', 17],
          ['ID', 16]
        ]).then(function() {
          sinon.assert.calledWith(
            glue.sendCandidates, ['*I\'d', 'ID', 'is']);
        }).then(done, done);
      });

      test('Space to accept suggestion', function(done) {
        activateAndTestPrediction('jan', 'jan', [
          ['Jan'],
          ['han'],
          ['Pietje']
        ]).then(function() {
          return engine.click(KeyboardEvent.DOM_VK_SPACE).then(function() {
            sinon.assert.callCount(glue.replaceSurroundingText, 1);
            sinon.assert.calledWith(glue.replaceSurroundingText, 'Jan', -3, 3);
            sinon.assert.calledWith(glue.sendKey, KeyboardEvent.DOM_VK_SPACE);
          });
        }).then(done, done);
      });

      test('Should communicate updated text to worker', function(done) {
        function clickAndAssert(key, assertion) {
          return engine.click(key.charCodeAt(0)).then(function() {
            sinon.assert.calledWith(workerStub.postMessage,
                            { args: [assertion], cmd: 'predict' });
          });
        }

        activateEngineWithState('').then(function() {
          return clickAndAssert('p', 'p');
        }).then(function() {
          return clickAndAssert('a', 'pa');
        }).then(function() {
          return clickAndAssert('i', 'pai');
        }).then(function() {
          // 4 because we have one extra setUserDictionary call
          sinon.assert.callCount(workerStub.postMessage, 4);
        }).then(done, done);
      });

      test('Two spaces after suggestion should autopunctuate', function(done) {
        activateAndTestPrediction('jan', 'jan', [
          ['Jan'],
          ['han'],
          ['Pietje']
        ]).then(function() {
          return engine.click(KeyboardEvent.DOM_VK_SPACE);
        }).then(function() {
          return engine.click(KeyboardEvent.DOM_VK_SPACE);
        }).then(function() {
          sinon.assert.callCount(glue.replaceSurroundingText, 1);
          sinon.assert.calledWith(glue.replaceSurroundingText, 'Jan', -3, 3);

          sinon.assert.callCount(glue.sendKey, 4);
          assert.equal(glue.sendKey.args[0][0], KeyboardEvent.DOM_VK_SPACE);
          assert.equal(glue.sendKey.args[1][0],
            KeyboardEvent.DOM_VK_BACK_SPACE);
          assert.equal(glue.sendKey.args[2][0], '.'.charCodeAt(0));
          assert.equal(glue.sendKey.args[3][0], ' '.charCodeAt(0));
        }).then(done, done);
      });

      test('New line then dot should not remove newline', function(done) {
        activateEngineWithState('Hello').then(function() {
          return engine.click(KeyboardEvent.DOM_VK_RETURN);
        }).then(function() {
          return engine.click('.'.charCodeAt(0));
        }).then(function() {
          sinon.assert.callCount(glue.replaceSurroundingText, 0);
          sinon.assert.callCount(glue.sendKey, 2);
          assert.equal(glue.sendKey.args[0][0], KeyboardEvent.DOM_VK_RETURN);
          assert.equal(glue.sendKey.args[1][0], '.'.charCodeAt(0));
        }).then(done, done);
      });

      test('dismissSuggestions hides suggestions', function(done) {
        activateEngineWithState('').then(function() {
          engine.dismissSuggestions();

          // Send candidates should be called once with an empty array
          // to clear the list of word suggestions
          sinon.assert.callCount(glue.sendCandidates, 2);
          sinon.assert.calledWith(glue.sendCandidates, []);

          // Also, a space should not be inserted
          sinon.assert.callCount(glue.sendKey, 0);
        }).then(done, done);
      });

    });

    suite('Uppercase suggestions', function() {
      test('All uppercase input yields uppercase suggestions', function(done) {
        activateAndTestPrediction('HOLO', 'HOLO', [
          ['yolo', 10],
          ['Yelp', 5],
          ['whuuu', 4]
        ]).then(function() {
          sinon.assert.calledOnce(glue.sendCandidates);
          // Verify that we show 3 suggestions that do not include the input
          // and that we do not mark the first as an autocorrection.
          sinon.assert.calledWith(
            glue.sendCandidates, ['*YOLO', 'YELP', 'WHUUU']);
        }).then(done, done);
      });

      test('One char uppercase not yields uppercase suggestions',
      function(done) {
        activateAndTestPrediction('F', 'F', [
          ['yolo', 10],
          ['Yelp', 5],
          ['whuuu', 4]
        ]).then(function() {
          sinon.assert.calledOnce(glue.sendCandidates);
          // Verify that we show 3 suggestions that do not include the input
          // and that we do not mark the first as an autocorrection.
          sinon.assert.calledWith(
            glue.sendCandidates, ['yolo', 'Yelp', 'whuuu']);
        }).then(done, done);
      });
    });

    suite('handleSuggestions', function() {
      test('input is not a word', function(done) {
        activateAndTestPrediction('jan', 'jan', [
          ['Jan', 1],
          ['han', 1],
          ['Pietje', 1],
          ['extra', 1]
        ]).then(function() {
          sinon.assert.callCount(glue.sendCandidates, 1);
          // Show 3 suggestions and mark the first as an autocorrect
          sinon.assert.calledWith(glue.sendCandidates,
                                  ['*Jan', 'han', 'Pietje']);
        }).then(done, done);
      });

      test('input is a common word', function(done) {
        activateAndTestPrediction('the', 'the', [
          ['the', 10],
          ['they', 5],
          ['then', 4],
          ['there', 3]
        ]).then(function() {
          sinon.assert.callCount(glue.sendCandidates, 1);
          // Verify that we show 3 suggestions that do not include the input
          // and that we do not mark the first as an autocorrection.
          sinon.assert.calledWith(glue.sendCandidates,
                                  ['they', 'then', 'there']);
        }).then(done, done);
      });

      test('input is an uncommon word', function(done) {
        activateAndTestPrediction('wont', 'wont', [
          ['won\'t', 11],
          ['wont', 8],
          ['won', 7],
          ['went', 6]
        ]).then(function() {
          sinon.assert.callCount(glue.sendCandidates, 1);
          // Verify that we show 3 suggestions that do not include the input
          // and that we do mark the first as an autocorrection because it is
          // more common than the valid word input.
          sinon.assert.calledWith(glue.sendCandidates,
                                  ['*won\'t', 'won', 'went']);
        }).then(done, done);
      });

      test('Foe', function(done) {
        activateAndTestPrediction('foe', 'foe', [
          ['for', 16.878906249999996],
          ['foe', 15],
          ['Doe', 7.566406249999998],
          ['doe', 6.984374999999998]
        ]).then(function() {
          sinon.assert.callCount(glue.sendCandidates, 1);
          sinon.assert.calledWith(glue.sendCandidates,
                                  ['for', 'Doe', 'doe']);
        }).then(done, done);
      });

      test('Hid', function(done) {
        activateAndTestPrediction('hid', 'hid', [
          ['his', 16.296874999999996],
          ['hid', 16],
          ['HUD', 7.415834765624998],
          ['hide', 7.2]
        ]).then(function() {
          sinon.assert.callCount(glue.sendCandidates, 1);
          sinon.assert.calledWith(
            glue.sendCandidates, ['his', 'HUD', 'hide']);
        }).then(done, done);
      });

      suite('Suggestion length mismatch', function(done) {
        test('Length mismatch, low freq', function(done) {
          activateAndTestPrediction('zoolgy', 'zoolgy', [
            ['zoology', 4.2],
            ['Zoology\'s', 0.09504000000000001]
          ]).then(function() {
            sinon.assert.callCount(glue.sendCandidates, 1);
            sinon.assert.calledWith(
              glue.sendCandidates, ['zoology', 'Zoology\'s']);
          }).then(done, done);
        });

        test('Length mismatch, medium freq', function(done) {
          activateAndTestPrediction('Folow', 'Folow', [
            ['Follow', 6.237],
            ['Follows', 2.4948],
            ['Followed', 1.0454400000000001],
            ['Follower', 0.7603200000000001]
          ]).then(function() {
            sinon.assert.callCount(glue.sendCandidates, 1);
            sinon.assert.calledWith(
              glue.sendCandidates, ['*Follow', 'Follows', 'Followed']);
          }).then(done, done);
        });

        test('Length mismatch, high freq', function(done) {
          activateAndTestPrediction('awesomeo', 'awesomeo', [
            ['awesome', 31],
            ['trahlah', 8],
            ['moarstu', 7]
          ]).then(function() {
            sinon.assert.callCount(glue.sendCandidates, 1);
            sinon.assert.calledWith(
              glue.sendCandidates, ['*awesome', 'trahlah', 'moarstu']);
          }).then(done, done);
        });
      });

      suite('Always keep at least one user dictionary word', function() {
        test('User dictionary word frequency is high', function(done){
          activateAndTestPrediction('ster', 'ster', [
            ['stery', 4],
            ['star', 3, true],
            ['stak', 2],
            ['stack', 1]
          ]).then(function() {
            sinon.assert.callCount(glue.sendCandidates, 1);
            sinon.assert.calledWith(
              glue.sendCandidates, ['stery', 'star', 'stak']);
          }).then(done, done);
        });
        suite('User dictionary word frequency is low but not too low',
        function(){
          var testWithLastUDSuggestionFreq = function(freq, done) {
            activateAndTestPrediction('ster', 'ster', [
              ['stery', 4],
              ['star', 3],
              ['stak', 2],
              ['stack', freq, true]
            ]).then(function() {
              sinon.assert.callCount(glue.sendCandidates, 1);
              sinon.assert.calledWith(
                glue.sendCandidates, ['stery', 'star', 'stack']);
            }).then(done, done);
          };

          test('UD word freq = 1.5', function(done){
            testWithLastUDSuggestionFreq(1.5, done);
          });
          test('UD word req = 1', function(done){
            testWithLastUDSuggestionFreq(1, done);
          });
        });
        suite('User dictionary word frequency is too low',
        function(){
          var testWithLastUDSuggestionFreq = function(freq, done) {
            activateAndTestPrediction('ster', 'ster', [
              ['stery', 4],
              ['star', 3],
              ['stak', 2],
              ['stack', freq, true]
            ]).then(function() {
              sinon.assert.callCount(glue.sendCandidates, 1);
              sinon.assert.calledWith(
                glue.sendCandidates, ['stery', 'star', 'stak']);
            }).then(done, done);
          };

          test('UD word freq = 0.99', function(done){
            testWithLastUDSuggestionFreq(0.99, done);
          });
          test('UD word req = 0.1', function(done){
            testWithLastUDSuggestionFreq(0.1, done);
          });
          test('UD word req = 0.01', function(done){
            testWithLastUDSuggestionFreq(0.01, done);
          });
        });
        test('A frequent user dictionary word is input', function(done){
          activateAndTestPrediction('ster', 'ster', [
            ['ster', 10, true],
            ['star', 3],
            ['stak', 2],
            ['stack', 1]
          ]).then(function() {
            sinon.assert.callCount(glue.sendCandidates, 1);
            sinon.assert.calledWith(
              glue.sendCandidates, ['star', 'stak', 'stack']);
          }).then(done, done);
        });
        test(`User dictionary word frequency is too low but still higher than
              next built-in dictionary's frequency`,
        function(done){
          activateAndTestPrediction('ster', 'ster', [
            ['stery', 4],
            ['star', 3],
            ['stack', 0.99, true],
            ['stak', 0.95],
          ]).then(function() {
            sinon.assert.callCount(glue.sendCandidates, 1);
            sinon.assert.calledWith(
              glue.sendCandidates, ['stery', 'star', 'stack']);
          }).then(done, done);
        });
      });
    });
  });

  suite('Reject one of the keys', function() {
    setup(function(done) {
      engine.activate('en', {
        type: 'text',
        inputmode: '',
        value: '',
        selectionStart: 0,
        selectionEnd: 0
      },{ suggest: false, correct: false });

      // Wait for getData() to resolve.
      Promise.resolve().then(done);
    });

    teardown(function() {
      engine.deactivate();
    });

    test('reject and resolve another', function(done) {
      glue.mResolveSendKey = false;

      engine
        .click('a'.charCodeAt(0))
        .then(function() {
          glue.mResolveSendKey = true;

          return engine.click('b'.charCodeAt(0));
        })
        .then(function() {
          assert.equal('b', glue.mOutput);
        })
        .catch(function(e) {
          throw (e || 'Should not reject.');
        })
        .then(done, done);
    });
  });

  suite('selectionchange', function() {
    setup(function(done) {
      engine.activate('en', {
        type: 'text',
        inputmode: '',
        value: 'before after',
        selectionStart: 5,
        selectionEnd: 5
      }, { suggest: true, correct: true });

      // Wait for getData() to resolve.
      Promise.resolve().then(done);
    });

    teardown(function() {
      engine.deactivate();
    });

    test('will clear the suggestions if selectionchange', function() {
      engine.selectionChange({
        selectionStart: 0,
        selectionEnd: 0,
        ownAction: false
      });

      // will clear the suggestions since cursor changed
      sinon.assert.calledThrice(glue.sendCandidates);
    });

    test('Do nothing if selectionchange is due to our own action', function() {
      engine.selectionChange({
        selectionStart: 5,
        selectionEnd: 5,
        ownAction: true
      });

      // will clear the suggestions since cursor changed
      sinon.assert.calledOnce(glue.sendCandidates);
    });
  });

  suite('layout handling', function() {
    setup(function() {
      engine.activate('en', {
        type: 'text',
        inputmode: '',
        value: '',
        selectionStart: 0,
        selectionEnd: 0
      },{ suggest: false, correct: false });
    });

    teardown(function() {
      engine.deactivate();
    });

    test('Do not switch layout if current layout is default', function(done) {
      engine.click(KeyEvent.DOM_VK_RETURN)
        .then(() => sinon.assert.notCalled(glue.setLayoutPage))
        .then(done, done);
    });

    test('Do not switch layout if current layout is default', function(done) {
      engine.setLayoutPage(1);
      engine.setLayoutPage(PAGE_INDEX_DEFAULT);
      engine.click(KeyEvent.DOM_VK_RETURN)
        .then(() => sinon.assert.notCalled(glue.setLayoutPage))
        .then(done, done);
    });

    test('Do not switch layout if a normal key was not clicked before',
    function(done) {
      engine.setLayoutPage(1);
      engine.click(KeyEvent.DOM_VK_SPACE)
        .then(() => sinon.assert.notCalled(glue.setLayoutPage))
        .then(done, done);
    });

    test('Switch layout if a normal key then space clicked', function(done) {
      engine.setLayoutPage(1);
      engine.click('1'.charCodeAt(0))
        .then(() => engine.click(KeyEvent.DOM_VK_SPACE))
        .then(
          () => sinon.assert.calledWith(glue.setLayoutPage, PAGE_INDEX_DEFAULT)
        )
        .then(done, done);
    });

    test('Switch layout if a normal key is clicked on one non-default layout, '+
         'then space clicked on another non-default layout', function(done) {
      engine.setLayoutPage(1);
      engine.click('1'.charCodeAt(0))
        .then(() => {
          engine.setLayoutPage(2);
          return engine.click(KeyEvent.DOM_VK_SPACE);
        })
        .then(
          () => sinon.assert.calledWith(glue.setLayoutPage, PAGE_INDEX_DEFAULT)
        )
        .then(done, done);
    });
  });
});
