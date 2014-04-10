'use strict';

/*global AutoCorrect, Suggestions */

requireApp('demo-keyboard/js/autocorrect.js');
requireApp('demo-keyboard/js/suggestions.js');

mocha.setup({
  globals: [
    'AutoCorrect',
    'Suggestions'
  ]
});

suite('AutoCorrect', function() {
  function eventTargetSpy() {
    var d = document.createElement('div');
    sinon.spy(d, 'addEventListener');
    sinon.spy(d, 'removeEventListener');
    sinon.spy(d, 'dispatchEvent');
    return d;
  }

  var app, autoCorrect;

  setup(function() {
    app = {
      touchHandler: eventTargetSpy(),
      inputField: eventTargetSpy(),
      container: document.createElement('div'),
      currentPage: {
        keys: {}
      }
    };

    autoCorrect = new AutoCorrect(app);
    autoCorrect.WORKER_PATH = '../../' + AutoCorrect.prototype.WORKER_PATH;
  });

  test('start/stop', function() {
    autoCorrect.start();

    assert.isTrue(autoCorrect.suggestions instanceof Suggestions,
      'Suggestions instance created.');
    assert.isTrue(autoCorrect.worker instanceof window.Worker,
      'Worker instance created.');

    assert.isTrue(
      app.inputField.addEventListener.calledWith('inputstatechanged'),
      'inputstatechanged event listener');
    assert.isTrue(
      app.inputField.addEventListener.calledWith('inputfieldchanged'),
      'inputfieldchanged event listener');

    assert.isTrue(
      app.touchHandler.addEventListener.calledWith('key'),
      'key event listener');

    autoCorrect.stop();

    assert.isTrue(
      autoCorrect.suggestions === null,
      'Suggestions instance created.');
    assert.isTrue(
      autoCorrect.worker === null,
      'Worker instance created.');

    assert.isTrue(
      app.inputField.removeEventListener.calledWith('inputstatechanged'),
      'inputstatechanged event listener');
    assert.isTrue(
      app.inputField.removeEventListener.calledWith('inputfieldchanged'),
      'inputfieldchanged event listener');

    assert.isTrue(
      app.touchHandler.removeEventListener.calledWith('key'),
      'key event listener');
  });

  suite('requestPredictions', function() {
    test('atWordEnd (misspelled)', function(done) {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return true;
      };
      app.inputField.wordBeforeCursor = function() {
        return 'documnet'; // misspelled "document"
      };

      autoCorrect.start();

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      assert.isTrue(app.touchHandler.setExpectedChars.calledOnce,
        'touchHandler.setExpectedChars called');
      assert.deepEqual(app.touchHandler.setExpectedChars.getCall(0).args[0], [],
        'called with empty array');

      var count = 0;
      app.touchHandler.setExpectedChars = function(chars) {
        // XXX: verify expected chars here

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
      autoCorrect.suggestions.display = function(words) {
        assert.deepEqual(words, ['*document', 'documents', 'documented'],
          'suggestions displayed.');
        assert.deepEqual(autoCorrect.correction,
          { from: 'documnet', to: 'document'},
          'autoCorrect.correction updated.');

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
    });

    test('atWordEnd (incomplete)', function(done) {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return true;
      };
      app.inputField.wordBeforeCursor = function() {
        return 'documen'; // incomplete "document"
      };

      autoCorrect.start();

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      assert.isTrue(app.touchHandler.setExpectedChars.calledOnce,
        'touchHandler.setExpectedChars called');
      assert.deepEqual(app.touchHandler.setExpectedChars.getCall(0).args[0], [],
        'called with empty array');

      var count = 0;
      app.touchHandler.setExpectedChars = function(chars) {
        // What the engine predicts
        // XXX: verify expected chars here

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
      autoCorrect.suggestions.display = function(words) {
        assert.deepEqual(words, ['*document', 'documents', 'documentary'],
          'suggestions displayed.');
        assert.deepEqual(autoCorrect.correction,
          { from: 'documen', to: 'document'},
          'autoCorrect.correction updated.');

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
    });

    test('not atWordEnd', function() {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return false;
      };

      autoCorrect.start();

      sinon.spy(autoCorrect.suggestions, 'display');

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      assert.isTrue(app.touchHandler.setExpectedChars.calledOnce,
        'touchHandler.setExpectedChars called');
      assert.deepEqual(app.touchHandler.setExpectedChars.getCall(0).args[0], [],
        'called with empty array');

      assert.isTrue(autoCorrect.suggestions.display.calledOnce,
        'suggesions.display called');
      assert.deepEqual(autoCorrect.suggestions.display.getCall(0).args[0], [],
        'called with empty array');

      autoCorrect.stop();
    });
  });

  suite('handleSuggestions', function() {
    test('input mismatch', function(done) {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return true;
      };
      app.inputField.wordBeforeCursor = function() {
        return 'documnet'; // misspelled "document"
      };

      autoCorrect.start();

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      app.inputField.wordBeforeCursor = function() {
        return 'documnets';
      };

      app.touchHandler.setExpectedChars = function() {
        assert.isTrue(false, 'should not update expected chars.');
      };
      autoCorrect.suggestions.display = function(words) {
        assert.deepEqual(words, [],
          'empty suggestions.');

        autoCorrect.stop();
        done();
      };
    });

    test('Schadenfreude (not a word)', function(done) {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return true;
      };
      app.inputField.wordBeforeCursor = function() {
        return 'Schadenfreude'; // Made-up word from Avenue Q the muscial.
      };

      autoCorrect.start();

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      var count = 0;
      app.touchHandler.setExpectedChars = function(chars) {
        // What the engine predicts
        // XXX: verify expected chars here

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
      autoCorrect.suggestions.display = function(words) {
        assert.deepEqual(words, [], 'no suggestions.');

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
    });

    test('wont -> won\'t', function(done) {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return true;
      };
      app.inputField.wordBeforeCursor = function() {
        return 'wont';
      };

      autoCorrect.start();

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      var count = 0;
      app.touchHandler.setExpectedChars = function(chars) {
        // What the engine predicts
        // XXX: verify expected chars here

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
      autoCorrect.suggestions.display = function(words) {
        assert.deepEqual(words, ['*won\'t', 'went', 'want'],
          'with suggestions.');
        assert.deepEqual(autoCorrect.correction, { from: 'wont', to: 'won\'t'},
          'autoCorrect.correction updated.');

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
    });

    test('the -> the', function(done) {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return true;
      };
      app.inputField.wordBeforeCursor = function() {
        return 'the';
      };

      autoCorrect.start();

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      var count = 0;
      app.touchHandler.setExpectedChars = function(chars) {
        // What the engine predicts
        // XXX: verify expected chars here

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
      autoCorrect.suggestions.display = function(words) {
        assert.deepEqual(words, ['they', 'then', 'them'], 'with suggestions.');
        assert.deepEqual(autoCorrect.correction, null,
          'autoCorrect.correction not set.');

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
    });

    test('foe -x-> for', function(done) {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return true;
      };
      app.inputField.wordBeforeCursor = function() {
        return 'foe';
      };

      autoCorrect.start();

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      var count = 0;
      app.touchHandler.setExpectedChars = function(chars) {
        // What the engine predicts
        // XXX: verify expected chars here

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
      autoCorrect.suggestions.display = function(words) {
        assert.deepEqual(words, ['foes', 'for', 'fore'], 'with suggestions.');
        assert.deepEqual(autoCorrect.correction, null,
          'autoCorrect.correction not set.');

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
    });

    test('hid -x-> his', function(done) {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return true;
      };
      app.inputField.wordBeforeCursor = function() {
        return 'hid';
      };

      autoCorrect.start();

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      var count = 0;
      app.touchHandler.setExpectedChars = function(chars) {
        // What the engine predicts
        // XXX: verify expected chars here

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
      autoCorrect.suggestions.display = function(words) {
        assert.deepEqual(words, ['hide', 'his', 'he\'d'], 'with suggestions.');
        assert.deepEqual(autoCorrect.correction, null,
          'autoCorrect.correction not set.');

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
    });


    test('i -> I', function(done) {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return true;
      };
      app.inputField.wordBeforeCursor = function() {
        return 'i';
      };

      autoCorrect.start();

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      var count = 0;
      app.touchHandler.setExpectedChars = function(chars) {
        // What the engine predicts
        // XXX: verify expected chars here

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
      autoCorrect.suggestions.display = function(words) {
        assert.deepEqual(words, ['*I', 'in', 'is'], 'no suggestions.');
        assert.deepEqual(autoCorrect.correction, { from: 'i', to: 'I'},
          'autoCorrect.correction not set.');

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
    });

    test('n -x-> no', function(done) {
      app.touchHandler.setExpectedChars = sinon.stub();
      app.inputField.atWordEnd = function() {
        return true;
      };
      app.inputField.wordBeforeCursor = function() {
        return 'n';
      };

      autoCorrect.start();

      autoCorrect.handleEvent({
        'type': 'inputfieldchanged'
      });

      var count = 0;
      app.touchHandler.setExpectedChars = function(chars) {
        // What the engine predicts
        // XXX: verify expected chars here

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
      autoCorrect.suggestions.display = function(words) {
        assert.deepEqual(words, ['no', 'ng', 'NP'], 'suggestions.');
        assert.deepEqual(autoCorrect.correction, null,
          'autoCorrect.correction not set.');

        count++;
        if (count === 2) {
          autoCorrect.stop();
          done();
        }
      };
    });

  });

  suite('handleSelectionSelected', function() {
    test('select a suggestion', function() {
      app.inputField.replaceSurroundingText = sinon.stub();
      app.inputField.wordBeforeCursor = function() {
        return 'foo';
      };

      autoCorrect.start();
      autoCorrect.correction = {
        from: 'ping',
        to: 'pong'
      };
      autoCorrect.autocorrectDisabled = true;

      autoCorrect.handleSelectionSelected('bar');

      assert.isTrue(
        app.inputField.replaceSurroundingText.calledWith('bar', 3, 0));
      assert.deepEqual(autoCorrect.reversion, {
        from: 'bar',
        to: 'foo'
      }, 'reversion is set.');
      assert.deepEqual(autoCorrect.correction, null,
        'pervious correction is removed');
      assert.equal(autoCorrect.autocorrectDisabled, false,
        'autocorrect re-enabled');

      autoCorrect.stop();
    });
  });

  suite('handleSelectionDismissed', function() {
    test('dismiss suggestions', function() {
      app.inputField.sendKey = sinon.stub();
      app.inputField.wordBeforeCursor = function() {
        return 'foo';
      };

      autoCorrect.start();

      autoCorrect.suggestions.display = sinon.stub();
      autoCorrect.correction = {
        from: 'ping',
        to: 'pong'
      };
      autoCorrect.reversion = {
        from: 'bar',
        to: 'foo'
      };
      autoCorrect.autocorrectDisabled = true;

      autoCorrect.handleSelectionDismissed();

      assert.deepEqual(autoCorrect.correction, null,
        'pervious correction is removed');
      assert.deepEqual(autoCorrect.reversion, null,
        'pervious reversion is removed');
      assert.equal(autoCorrect.autocorrectDisabled, false,
        'autocorrect re-enabled');

      autoCorrect.stop();
    });
  });

  suite('handleKey', function() {
    var keys = [
      'SPACE', 'RETURN', 'PERIOD', 'QUESTION', 'EXCLAMATION',
      'COMMA', 'COLON', 'SEMICOLON'];

    test('w/o corrections, don\'t block key & reset reversions', function() {
      keys.forEach(function(keyname) {
        app.currentPage.keys[keyname] = {
          keycode: AutoCorrect.prototype['KEYCODE_' + keyname]
        };
      });
      app.inputField.replaceSurroundingText = sinon.stub();
      app.inputField.wordBeforeCursor = function() {
        return '';
      };

      autoCorrect.start();

      var evt = {
        type: 'key',
        stopImmediatePropagation: sinon.stub(),
        stopPropagation: sinon.stub()
      };

      keys.forEach(function(keyname) {
        evt.detail = keyname;

        autoCorrect.reversion = { from: 'foo', to: 'bar' };
        autoCorrect.handleEvent(evt);
        assert.equal(autoCorrect.reversion, null, 'reversion is reset.');
      });

      assert.equal(app.inputField.replaceSurroundingText.called, false,
        'inputField.replaceSurroundingText not called.');
      assert.equal(evt.stopPropagation.called, false,
        'key stopPropagation not called.');
      assert.equal(evt.stopImmediatePropagation.called, false,
        'key stopImmediatePropagation not called.');

      autoCorrect.stop();
    });

    test('re-enable auto correction if disabled', function() {
      keys.forEach(function(keyname) {
        app.currentPage.keys[keyname] = {
          keycode: AutoCorrect.prototype['KEYCODE_' + keyname]
        };
      });
      app.inputField.replaceSurroundingText = sinon.stub();

      autoCorrect.start();

      var evt = {
        type: 'key',
        stopImmediatePropagation: sinon.stub(),
        stopPropagation: sinon.stub()
      };

      keys.forEach(function(keyname) {
        evt.detail = keyname;

        autoCorrect.autocorrectDisabled = true;
        autoCorrect.handleEvent(evt);
        assert.equal(autoCorrect.autocorrectDisabled, false,
          'autocorrect re-enabled');
      });

      assert.equal(evt.stopPropagation.called, false,
        'key stopPropagation not called.');
      assert.equal(evt.stopImmediatePropagation.called, false,
        'key stopImmediatePropagation not called.');

      autoCorrect.stop();
    });

    test('send out correction if it exists.', function() {
      keys.forEach(function(keyname) {
        app.currentPage.keys[keyname] = {
          keycode: AutoCorrect.prototype['KEYCODE_' + keyname]
        };
      });

      app.inputField.wordBeforeCursor = function() {
        return 'ping';
      };

      autoCorrect.start();

      var evt = {
        type: 'key',
        stopPropagation: sinon.stub()
      };

      keys.forEach(function(keyname) {
        evt.detail = keyname;
        evt.stopImmediatePropagation = sinon.stub();
        app.inputField.replaceSurroundingText = sinon.stub();

        autoCorrect.correction = {
          from: 'ping',
          to: 'pong'
        };
        autoCorrect.handleEvent(evt);

        var str = 'pong';
        if (keyname === 'RETURN') {
          str += String.fromCharCode(10);
        } else {
          str +=
            String.fromCharCode(AutoCorrect.prototype['KEYCODE_' + keyname]);
        }
        assert.isTrue(
          app.inputField.replaceSurroundingText.calledWith(str, 4, 0),
          'suggestion sent');
        assert.deepEqual(autoCorrect.reversion, {
          from: str,
          to: 'ping'
        }, 'reversion set');
        assert.deepEqual(autoCorrect.correction, null,
          'correction is removed');
        assert.equal(evt.stopImmediatePropagation.calledOnce, true,
          'key stopImmediatePropagation called.');
      });

      assert.equal(evt.stopPropagation.called, false,
        'key stopPropagation not called.');

      autoCorrect.stop();
    });

    test('don\'t send out correction if the state mismatched', function() {
      keys.forEach(function(keyname) {
        app.currentPage.keys[keyname] = {
          keycode: AutoCorrect.prototype['KEYCODE_' + keyname]
        };
      });

      app.inputField.wordBeforeCursor = function() {
        return 'foo';
      };

      autoCorrect.start();

      var evt = {
        type: 'key',
        stopPropagation: sinon.stub()
      };

      keys.forEach(function(keyname) {
        evt.detail = keyname;
        evt.stopImmediatePropagation = sinon.stub();
        app.inputField.replaceSurroundingText = sinon.stub();

        autoCorrect.correction = {
          from: 'ping',
          to: 'pong'
        };
        autoCorrect.reversion = null;
        autoCorrect.handleEvent(evt);

        var str = 'pong';
        if (keyname === 'RETURN') {
          str += String.fromCharCode(10);
        } else {
          str +=
            String.fromCharCode(AutoCorrect.prototype['KEYCODE_' + keyname]);
        }
        assert.equal(
          app.inputField.replaceSurroundingText.called, false,
          'suggestion not sent');
        assert.deepEqual(autoCorrect.reversion, null, 'reversion not set');
        assert.deepEqual(autoCorrect.correction, {
            from: 'ping',
            to: 'pong'
          },
          'correction is not removed');
        assert.equal(evt.stopImmediatePropagation.called, false,
          'key stopImmediatePropagation not called.');
      });

      assert.equal(evt.stopPropagation.called, false,
        'key stopPropagation not called.');

      autoCorrect.stop();
    });

    test('backspace should send reversion', function() {
      app.currentPage.keys.BACKSPACE = {
        keycode: AutoCorrect.prototype.KEYCODE_BACKSPACE
      };
      app.inputField.replaceSurroundingText = sinon.stub();
      app.inputField.textBeforeCursor = 'playing pong!';

      autoCorrect.start();
      autoCorrect.reversion = {
          from: 'pong!',
          to: 'ping'
      };

      var evt = {
        type: 'key',
        detail: 'BACKSPACE',
        stopImmediatePropagation: sinon.stub(),
        stopPropagation: sinon.stub()
      };

      autoCorrect.handleEvent(evt);

      assert.isTrue(
        app.inputField.replaceSurroundingText.calledWith('ping', 5, 0),
        'reversion sent');
      assert.deepEqual(autoCorrect.reversion, null, 'reversion is removed');
      assert.equal(evt.stopImmediatePropagation.calledOnce, true,
        'key stopImmediatePropagation called.');
      assert.equal(evt.stopPropagation.called, false,
        'key stopPropagation not called.');

      autoCorrect.stop();
    });

    test('backspace should not send reversion if state mismatch', function() {
      app.currentPage.keys.BACKSPACE = {
        keycode: AutoCorrect.prototype.KEYCODE_BACKSPACE
      };
      app.inputField.replaceSurroundingText = sinon.stub();
      app.inputField.textBeforeCursor = 'playing pong!!';

      autoCorrect.start();
      autoCorrect.reversion = {
          from: 'pong!',
          to: 'ping'
      };

      var evt = {
        type: 'key',
        detail: 'BACKSPACE',
        stopImmediatePropagation: sinon.stub(),
        stopPropagation: sinon.stub()
      };

      autoCorrect.handleEvent(evt);

      assert.equal(
        app.inputField.replaceSurroundingText.called, false,
        'suggestion not sent');
      assert.deepEqual(autoCorrect.reversion, null, 'reversion is removed');
      assert.equal(evt.stopImmediatePropagation.called, false,
        'key stopImmediatePropagation not called.');
      assert.equal(evt.stopPropagation.called, false,
        'key stopPropagation not called.');

      autoCorrect.stop();
    });

    test('other keys should remove reversion', function() {
      app.currentPage.keys.a = {
        keycode: 'a'.charCodeAt(0)
      };
      app.inputField.replaceSurroundingText = sinon.stub();
      app.inputField.textBeforeCursor = 'playing pong!';

      autoCorrect.start();
      autoCorrect.reversion = {
          from: 'pong!',
          to: 'ping'
      };

      var evt = {
        type: 'key',
        detail: 'a',
        stopImmediatePropagation: sinon.stub(),
        stopPropagation: sinon.stub()
      };

      autoCorrect.handleEvent(evt);

      assert.equal(
        app.inputField.replaceSurroundingText.called, false,
        'suggestion not sent');
      assert.deepEqual(autoCorrect.reversion, null, 'reversion is removed');
      assert.equal(evt.stopImmediatePropagation.called, false,
        'key stopImmediatePropagation not called.');
      assert.equal(evt.stopPropagation.called, false,
        'key stopPropagation not called.');

      autoCorrect.stop();
    });


  });
});
