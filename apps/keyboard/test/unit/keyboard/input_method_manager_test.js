'use strict';

/* global InputMethodGlue, InputMethodLoader, InputMethodManager,
          KeyboardConsole, IMEngineSettings, KeyEvent, Promise */

require('/js/keyboard/settings.js');
require('/js/keyboard/input_method_manager.js');
require('/js/keyboard/console.js');

suite('InputMethodGlue', function() {
  test('init', function() {
    var glue = new InputMethodGlue();
    var app = {};
    glue.init(app, 'foo');

    assert.equal(glue.app, app);
    assert.equal(glue.path, './js/imes/foo');
  });

  test('sendCandidates', function() {
    var glue = new InputMethodGlue();
    var app = {
      console: this.sinon.stub(KeyboardConsole.prototype),
      candidatePanelManager: {
        updateCandidates: this.sinon.stub()
      },
      inputContext: {}
    };
    var data = [['foo', 1]];
    glue.init(app, 'foo');
    glue.sendCandidates(data);

    assert.isTrue(app.candidatePanelManager.updateCandidates.calledWith(data));
  });

  test('setComposition', function() {
    var glue = new InputMethodGlue();
    var app = {
      console: this.sinon.stub(KeyboardConsole.prototype),
      inputContext: {
        setComposition: this.sinon.stub().returns(Promise.resolve())
      }
    };
    var symbols = 'bar';
    var cursor = 1;
    glue.init(app, 'foo');
    glue.setComposition(symbols, cursor);

    assert.isTrue(app.inputContext.setComposition.calledWith(symbols, cursor));
  });

  test('endComposition', function() {
    var glue = new InputMethodGlue();
    var app = {
      console: this.sinon.stub(KeyboardConsole.prototype),
      inputContext: {
        endComposition: this.sinon.stub().returns(Promise.resolve())
      }
    };
    var data = 'bar';
    glue.init(app, 'foo');
    glue.endComposition(data);

    assert.isTrue(app.inputContext.endComposition.calledWith(data));
  });

  suite('sendKey', function() {
    var glue;
    var app;
    var p;
    setup(function() {
      glue = new InputMethodGlue();
      app = {
        console: this.sinon.stub(KeyboardConsole.prototype),
        inputContext: {
          sendKey: this.sinon.stub()
        }
      };
      p = Promise.resolve();
      this.sinon.stub(p, 'catch').returns(p);
      app.inputContext.sendKey.returns(p);
    });

    test('KeyEvent.DOM_VK_BACK_SPACE', function() {
      var keyCode = KeyEvent.DOM_VK_BACK_SPACE;
      var isRepeat = false;
      glue.init(app, 'foo');
      var returned = glue.sendKey(keyCode, isRepeat);

      assert.isTrue(
        app.inputContext.sendKey.calledWith(keyCode, 0, 0, isRepeat));
      assert.equal(returned, p);
    });

    test('KeyEvent.DOM_VK_RETURN', function() {
      var keyCode = KeyEvent.DOM_VK_RETURN;
      var isRepeat = false;
      glue.init(app, 'foo');
      var returned = glue.sendKey(keyCode, isRepeat);

      assert.isTrue(
        app.inputContext.sendKey.calledWith(keyCode, 0, 0));
      assert.equal(returned, p);
    });

    test('99', function() {
      var keyCode = 99;
      var isRepeat = false;
      glue.init(app, 'foo');
      var returned = glue.sendKey(keyCode, isRepeat);

      assert.isTrue(
        app.inputContext.sendKey.calledWith(0, 99, 0));
      assert.equal(returned, p);
    });

    test('-99', function() {
      var keyCode = -99;
      var isRepeat = false;
      glue.init(app, 'foo');
      var returned = glue.sendKey(keyCode, isRepeat);

      assert.isTrue(
        app.inputContext.sendKey.calledWith(0, -99, 0));
      assert.equal(returned, p);
    });
  });

  test('sendString', function() {
    var glue = new InputMethodGlue();
    var app = {
      console: this.sinon.stub(KeyboardConsole.prototype),
      inputContext: {
        sendKey: this.sinon.stub().returns(Promise.resolve())
      }
    };
    var text = 'foobar';
    glue.init(app, 'foo');
    glue.sendString(text);

    assert.isTrue(
      app.inputContext.sendKey.getCall(0).calledWith(0, text.charCodeAt(0), 0));
    assert.isTrue(
      app.inputContext.sendKey.getCall(1).calledWith(0, text.charCodeAt(1), 0));
    assert.isTrue(
      app.inputContext.sendKey.getCall(2).calledWith(0, text.charCodeAt(2), 0));
    assert.isTrue(
      app.inputContext.sendKey.getCall(3).calledWith(0, text.charCodeAt(3), 0));
    assert.isTrue(
      app.inputContext.sendKey.getCall(4).calledWith(0, text.charCodeAt(4), 0));
    assert.isTrue(
      app.inputContext.sendKey.getCall(5).calledWith(0, text.charCodeAt(5), 0));
  });

  test('setLayoutPage', function() {
    var glue = new InputMethodGlue();
    var app = {
      console: this.sinon.stub(KeyboardConsole.prototype),
      layoutManager: {
        PAGE_INDEX_DEFAULT: 0
      },
      setLayoutPage: this.sinon.stub(),
      inputContext: {}
    };
    var pageIndex = 0;
    glue.init(app, 'foo');
    glue.setLayoutPage(pageIndex);

    assert.isTrue(app.setLayoutPage.calledWith(pageIndex));
  });

  test('setUpperCase', function() {
    var glue = new InputMethodGlue();
    var app = {
      console: this.sinon.stub(KeyboardConsole.prototype),
      upperCaseStateManager: {
        switchUpperCaseState: this.sinon.stub()
      },
      inputContext: {}
    };
    var state = {
      isUpperCase: true,
      isUpperCaseLocked: false
    };
    glue.init(app, 'foo');
    glue.setUpperCase(state);

    assert.isTrue(
      app.upperCaseStateManager.switchUpperCaseState.calledWith(state));
  });

  test('replaceSurroundingText', function() {
    var glue = new InputMethodGlue();
    var app = {
      console: this.sinon.stub(KeyboardConsole.prototype),
      inputContext: {
        replaceSurroundingText: this.sinon.stub()
      }
    };
    var p = Promise.resolve();
    app.inputContext.replaceSurroundingText.returns(p);

    var text = 'foobar';
    var offset = 3;
    var length = 1;
    glue.init(app, 'foo');
    var returned = glue.replaceSurroundingText(text, offset, length);

    assert.isTrue(
      app.inputContext.replaceSurroundingText.calledWith(text, offset, length));
    assert.equal(returned, p);
  });

  test('getNumberOfCandidatesPerRow', function() {
    var glue = new InputMethodGlue();
    var app = {
      console: this.sinon.stub(KeyboardConsole.prototype),
      viewManager: {
        getNumberOfCandidatesPerRow: this.sinon.stub()
      }
    };
    app.viewManager.getNumberOfCandidatesPerRow.returns(123);
    glue.init(app, 'foo');
    var row = glue.getNumberOfCandidatesPerRow();

    assert.equal(row, 123);
  });

  test('getData', function() {
    var glue = new InputMethodGlue();
    var p = { stub: 'promise' };
    var app = {
      inputMethodDatabaseLoader: {
        load: this.sinon.stub().returns(p)
      }
    };
    glue.init(app, 'foo');
    var result = glue.getData('bar');

    assert.isTrue(
      app.inputMethodDatabaseLoader.load.calledWithExactly('foo', 'bar'));
    assert.equal(result, p);
  });
});

suite('InputMethodLoader', function() {
  var realInputMethods;

  suiteSetup(function() {
    realInputMethods = window.InputMethods;
  });

  suiteTeardown(function() {
    window.InputMethods = realInputMethods;
  });

  test('start', function(done) {
    var initStub = this.sinon.stub();
    window.InputMethods = {
      'preloaded': {
        init: initStub
      }
    };

    var loader = new InputMethodLoader({});
    loader.start();

    assert.equal(!!window.InputMethods.preloaded, false, 'original removed');
    assert.isTrue(!!loader.getInputMethod('preloaded'), 'preloaded loaded');
    assert.equal(initStub.getCall(0).args[0].app, loader.app,
      'init with a glue object with a correct app');

    var p = loader.getInputMethodAsync('preloaded');
    p.then(function(imEngine) {
      assert.isTrue(true, 'loaded');
      assert.equal(imEngine, loader.getInputMethod('preloaded'));

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('getInputMethodAsync', function(done) {
    window.InputMethods = {};

    var loader = new InputMethodLoader({});
    loader.SOURCE_DIR = './fake-imes/';
    loader.start();

    var p = loader.getInputMethodAsync('foo');
    p.then(function(imEngine) {
      assert.isTrue(true, 'loaded');
      assert.isTrue(!!loader.getInputMethod('foo'), 'foo loaded');
      assert.equal(imEngine, loader.getInputMethod('foo'));

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('getInputMethodAsync (twice)', function(done) {
    window.InputMethods = {};

    var loader = new InputMethodLoader({});
    loader.SOURCE_DIR = './fake-imes/';
    loader.start();

    var p = loader.getInputMethodAsync('foo');
    p.then(function(imEngine) {
      assert.isTrue(true, 'loaded');
      assert.isTrue(!!loader.getInputMethod('foo'), 'foo loaded');
      assert.equal(imEngine, loader.getInputMethod('foo'));

      var p2 = loader.getInputMethodAsync('foo');
      assert.equal(p2, p,
        'Should return the same promise without creating a new one');

      p.then(function(imEngine) {
        assert.isTrue(true, 'loaded');
        assert.equal(imEngine, loader.getInputMethod('foo'));

        done();
      }, function() {
        assert.isTrue(false, 'should not reject');

        done();
      });
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('getInputMethodAsync (failed)', function(done) {
    window.InputMethods = {};

    var loader = new InputMethodLoader({});
    loader.SOURCE_DIR = './fake-imes/';
    loader.start();

    var p = loader.getInputMethodAsync('bar');
    p.then(function() {
      assert.isTrue(false, 'should not resolve');

      done();
    }, function() {
      assert.isTrue(true, 'rejected');

      done();
    });
  });

  test('getInputMethodAsync (twice)', function(done) {
    window.InputMethods = {};

    var loader = new InputMethodLoader({});
    loader.SOURCE_DIR = './fake-imes/';
    loader.start();

    var p = loader.getInputMethodAsync('foo');
    var p2 = loader.getInputMethodAsync('foo');

    assert.equal(p, p2, 'Return same promise instance for the same IMEngine.');

    p.then(function() {
      assert.isTrue(true, 'loaded');
      assert.isTrue(!!loader.getInputMethod('foo'), 'foo loaded');

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });
});

suite('InputMethodManager', function() {
  var realInputMethods;
  var imEngineSettingsStub;
  var app;
  var initSettingsPromise;
  var manager;

  suiteSetup(function() {
    realInputMethods = window.InputMethods;
  });

  suiteTeardown(function() {
    window.InputMethods = realInputMethods;
  });

  setup(function () {
    imEngineSettingsStub = this.sinon.stub(IMEngineSettings.prototype);
    this.sinon.stub(window, 'IMEngineSettings').returns(imEngineSettingsStub);
    initSettingsPromise = Promise.resolve({
      suggestionsEnabled: true,
      correctionsEnabled: true
    });
    imEngineSettingsStub.initSettings.returns(initSettingsPromise);

    app = {
      promiseManager: {},
      layoutManager: {
        currentPage: {
          autoCorrectLanguage: 'xx-XX',
          autoCorrectPunctuation: true
        }
      },
      console: this.sinon.stub(KeyboardConsole.prototype),
      inputContext: {
        inputType: 'text',
        inputMode: '',
        selectionStart: 0,
        selectionEnd: 0,
        textBeforeCursor: '',
        textAfterCursor: '',
        getText: this.sinon.stub(),
        addEventListener: this.sinon.stub(),
        removeEventListener: this.sinon.stub()
      }
    };

    window.InputMethods = {
      'default': realInputMethods['default']
    };

    manager = new InputMethodManager(app);
    manager.start();
    manager.loader.SOURCE_DIR = './fake-imes/';

    assert.equal(manager.loader.app, manager.app);
    assert.isTrue(!!manager.currentIMEngine, 'started with default IMEngine.');
  });

  test('activateIMEngine', function(done) {
    app.inputContext.getText.returns(Promise.resolve('foobar'));

    manager.updateInputContextData();
    assert.isTrue(app.inputContext.getText.calledOnce);

    manager.updateInputContextData();
    assert.isTrue(app.inputContext.getText.calledTwice,
      'Should getText() twice when calling updateInputContextData again.');

    var p = manager.activateIMEngine('foo');
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var imEngine = manager.loader.getInputMethod('foo');
      assert.isTrue(!!imEngine, 'foo loaded');
      assert.equal(manager.currentIMEngine, imEngine, 'currentIMEngine is set');

      var activateStub = imEngine.activate;
      assert.isTrue(activateStub.calledWithExactly('xx-XX', {
        type: 'text',
        inputmode: '',
        selectionStart: 0,
        selectionEnd: 0,
        value: 'foobar'
      }, {
        suggest: true,
        correct: true,
        correctPunctuation: true
      }));
      assert.equal(activateStub.getCall(0).thisValue,
        imEngine);
    }, function(e) {
      if (e) {
        throw e;
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
  });

  test('activateIMEngine, autoCorrectPunctuation false', function(done) {
    initSettingsPromise = Promise.resolve({
      suggestionsEnabled: true,
      correctionsEnabled: true
    });
    imEngineSettingsStub.initSettings.returns(initSettingsPromise);

    manager.app.layoutManager.currentPage = {
      autoCorrectPunctuation: false
    };

    app.inputContext.getText.returns(Promise.resolve('foobar'));

    manager.updateInputContextData();
    assert.isTrue(app.inputContext.getText.calledOnce);

    var p = manager.activateIMEngine('foo');
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var imEngine = manager.loader.getInputMethod('foo');
      var activateStub = imEngine.activate;

      assert.deepEqual(activateStub.args[0][2], {
        suggest: true,
        correct: true,
        correctPunctuation: false
      });
    }, function(e) {
      if (e) {
        throw e;
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
  });

  test('activateIMEngine (failed loader)', function(done) {
    app.inputContext.getText.returns(Promise.resolve('foobar'));

    manager.updateInputContextData();
    assert.isTrue(app.inputContext.getText.calledOnce);

    var p = manager.activateIMEngine('bar');
    p.then(function() {
      assert.isTrue(false, 'should not resolve');
    }, function() {
      assert.isTrue(true, 'rejected');
    }).then(done, done);
  });

  test('activateIMEngine (failed getText())', function(done) {
    app.inputContext.getText.returns(Promise.reject());

    manager.updateInputContextData();
    assert.isTrue(app.inputContext.getText.calledOnce);

    var p = manager.activateIMEngine('foo');
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var imEngine = manager.loader.getInputMethod('foo');
      assert.isTrue(!!imEngine, 'foo loaded');
      assert.equal(manager.currentIMEngine, imEngine, 'currentIMEngine is set');

      var activateStub = imEngine.activate;
      assert.isTrue(activateStub.calledWithExactly('xx-XX', {
        type: 'text',
        inputmode: '',
        selectionStart: 0,
        selectionEnd: 0,
        value: ''
      }, {
        suggest: true,
        correct: true,
        correctPunctuation: true
      }));
      assert.equal(activateStub.getCall(0).thisValue, imEngine);
    }, function(e) {
      if (e) {
        throw e;
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
  });

  test('activateIMEngine (deactivate and reload after loaded)', function(done) {
    app.inputContext.getText.returns(Promise.resolve('foobar'));

    manager.updateInputContextData();
    assert.isTrue(app.inputContext.getText.calledOnce);

    var p = manager.activateIMEngine('foo');
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var imEngine = manager.loader.getInputMethod('foo');
      assert.isTrue(!!imEngine, 'foo loaded');
      assert.equal(manager.currentIMEngine, imEngine, 'currentIMEngine is set');

      var activateStub = imEngine.activate;
      assert.isTrue(activateStub.calledWithExactly('xx-XX', {
        type: 'text',
        inputmode: '',
        selectionStart: 0,
        selectionEnd: 0,
        value: 'foobar'
      }, {
        suggest: true,
        correct: true,
        correctPunctuation: true
      }));
      assert.equal(activateStub.getCall(0).thisValue,
        imEngine);

      manager.updateInputContextData();

      manager.deactivateIMEngine();

      var deactivateStub = imEngine.deactivate;
      assert.isTrue(deactivateStub.calledOnce,
        'deactivate should be called at ' +
        'InputMethodManager#deactivateIMEngine()');
      assert.equal(deactivateStub.getCall(0).thisValue,
        imEngine);

      var p2 = manager.activateIMEngine('foo');

      assert.equal(manager.currentIMEngine,
        manager.loader.getInputMethod('default'),
        'currentIMEngine is set to default');

      return p2;
    }, function(e) {
      if (e) {
        throw e;
      }
      assert.isTrue(false, 'should not reject');
    }).then(function() {
      assert.isTrue(true, 'resolved');
      var imEngine = manager.loader.getInputMethod('foo');
      assert.isTrue(!!imEngine, 'foo loaded');
      assert.equal(manager.currentIMEngine, imEngine,
        'currentIMEngine is set');

      var activateStub = imEngine.activate;
      assert.isTrue(activateStub.calledTwice);
      assert.isTrue(activateStub.getCall(1).calledWithExactly('xx-XX', {
        type: 'text',
        inputmode: '',
        selectionStart: 0,
        selectionEnd: 0,
        value: 'foobar'
      }, {
        suggest: true,
        correct: true,
        correctPunctuation: true
      }));
      assert.equal(activateStub.getCall(1).thisValue,
        imEngine);
    }, function(e) {
      if (e) {
        throw e;
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
  });

  test('selectionchange', function(done) {
    app.inputContext.getText.returns(Promise.resolve('foobar'));
    manager.updateInputContextData();
    var p = manager.activateIMEngine('foo');
    p.then(function() {
      assert.isTrue(app.inputContext.addEventListener.calledTwice);

      manager.handleEvent({
        type: 'selectionchange',
        target: app.inputContext,
        detail: {
          selectionStart: 0,
          selectionEnd: 0,
          ownAction: true
        }
      });
    }, function() {
      assert.isTrue(false, 'should not reject');
    }).then(function() {
      var imEngine = manager.loader.getInputMethod('foo');
      assert.isTrue(imEngine.selectionChange.calledWith({
        selectionStart: 0,
        selectionEnd: 0,
        ownAction: true
      }));
    }).then(done, done);
  });

  test('surroundingtextchange', function(done) {
    app.inputContext.getText.returns(Promise.resolve('foobar'));
    manager.updateInputContextData();
    var p = manager.activateIMEngine('foo');
    p.then(function() {
      assert.isTrue(app.inputContext.addEventListener.calledTwice);

      manager.handleEvent({
        type: 'surroundingtextchange',
        target: app.inputContext,
        detail: {
          textBeforeCursor: '',
          textAfterCursor: '',
          ownAction: true
        }
      });
    }, function() {
      assert.isTrue(false, 'should not reject');
    }).then(function() {
      var imEngine = manager.loader.getInputMethod('foo');
      assert.isTrue(imEngine.surroundingtextChange.calledWith({
        textBeforeCursor: '',
        textAfterCursor: '',
        ownAction: true
      }));
    }).then(done, done);
  });
});
