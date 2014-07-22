'use strict';

/* global InputMethodGlue, InputMethodLoader, InputMethodManager,
          IMEngineSettings, Promise, KeyEvent */

require('/js/keyboard/settings.js');
require('/js/keyboard/input_method_manager.js');

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
      candidatePanelManager: {
        updateCandidates: this.sinon.stub()
      }
    };
    var data = [['foo', 1]];
    glue.init(app, 'foo');
    glue.sendCandidates(data);

    assert.isTrue(app.candidatePanelManager.updateCandidates.calledWith(data));
  });

  test('setComposition', function() {
    var glue = new InputMethodGlue();
    var app = {
      inputContext: {
        setComposition: this.sinon.stub()
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
      inputContext: {
        endComposition: this.sinon.stub()
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
        inputContext: {
          sendKey: this.sinon.stub()
        }
      };
      p = Promise.resolve();
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
      inputContext: {
        sendKey: this.sinon.stub()
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

  test('alterKeyboard', function() {
    var glue = new InputMethodGlue();
    var app = {
      setForcedModifiedLayout: this.sinon.stub()
    };
    var name = 'bar';
    glue.init(app, 'foo');
    glue.alterKeyboard(name);

    assert.isTrue(app.setForcedModifiedLayout.calledWith(name));
  });

  test('setLayoutPage', function() {
    var glue = new InputMethodGlue();
    var app = {
      layoutManager: {
        LAYOUT_PAGE_DEFAULT: 'bar'
      },
      setLayoutPage: this.sinon.stub()
    };
    var name = 'bar';
    glue.init(app, 'foo');
    glue.setLayoutPage(name);

    assert.isTrue(app.setLayoutPage.calledWith(name));
  });

  test('setUpperCase', function() {
    var glue = new InputMethodGlue();
    var app = {
      upperCaseStateManager: {
        switchUpperCaseState: this.sinon.stub()
      }
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
      getNumberOfCandidatesPerRow: this.sinon.stub()
    };
    app.getNumberOfCandidatesPerRow.returns(123);
    glue.init(app, 'foo');
    var row = glue.getNumberOfCandidatesPerRow();

    assert.equal(row, 123);
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
        currentModifiedLayout: {
          autoCorrectLanguage: 'xx-XX'
        }
      }
    };
  });

  test('start', function() {
    window.InputMethods = {
      'default': realInputMethods['default']
    };

    var manager = new InputMethodManager(app);
    manager.start();

    assert.equal(manager.loader.app, manager.app);
    assert.isTrue(!!manager.currentIMEngine, 'started with default IMEngine.');
  });

  test('switchCurrentIMEngine', function(done) {
    window.InputMethods = {
      'default': realInputMethods['default']
    };

    var manager = new InputMethodManager(app);
    manager.start();
    manager.loader.SOURCE_DIR = './fake-imes/';

    var dataPromise = Promise.resolve({
      value: 'data'
    });

    var p = manager.switchCurrentIMEngine('foo', dataPromise);
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var imEngine = manager.loader.getInputMethod('foo');
      assert.isTrue(!!imEngine, 'foo loaded');
      assert.equal(manager.currentIMEngine, imEngine, 'currentIMEngine is set');

      var activateStub = imEngine.activate;
      assert.isTrue(activateStub.calledWithExactly('xx-XX', {
        value: 'data'
      }, {
        suggest: true,
        correct: true
      }));
      assert.equal(activateStub.getCall(0).thisValue,
        imEngine);

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('switchCurrentIMEngine (failed loader)', function(done) {
    window.InputMethods = {
      'default': realInputMethods['default']
    };

    var manager = new InputMethodManager(app);
    manager.start();
    manager.loader.SOURCE_DIR = './fake-imes/';

    var dataPromise = Promise.resolve({
      value: 'data'
    });

    var p = manager.switchCurrentIMEngine('bar', dataPromise);
    p.then(function() {
      assert.isTrue(false, 'should not resolve');

      done();
    }, function() {
      assert.isTrue(true, 'rejected');

      done();
    });
  });

  test('switchCurrentIMEngine (no data promise)', function(done) {
    window.InputMethods = {
      'default': realInputMethods['default']
    };

    var manager = new InputMethodManager(app);
    manager.start();
    manager.loader.SOURCE_DIR = './fake-imes/';

    var p = manager.switchCurrentIMEngine('foo');
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var imEngine = manager.loader.getInputMethod('foo');
      assert.isTrue(!!imEngine, 'foo loaded');
      assert.equal(manager.currentIMEngine, imEngine, 'currentIMEngine is set');

      var activateStub = imEngine.activate;
      assert.isTrue(activateStub.calledWithExactly('xx-XX', undefined, {
        suggest: true,
        correct: true
      }));
      assert.equal(activateStub.getCall(0).thisValue,
        imEngine);

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('switchCurrentIMEngine (failed data promise)', function(done) {
    window.InputMethods = {
      'default': realInputMethods['default']
    };

    var manager = new InputMethodManager(app);
    manager.start();
    manager.loader.SOURCE_DIR = './fake-imes/';

    var dataPromise = Promise.reject();

    var p = manager.switchCurrentIMEngine('foo', dataPromise);
    p.then(function() {
      assert.isTrue(false, 'should not resolve');

      done();
    }, function() {
      assert.isTrue(true, 'rejected');

      done();
    });
  });

  test('switchCurrentIMEngine (twice)', function(done) {
    window.InputMethods = {
      'default': realInputMethods['default']
    };

    var manager = new InputMethodManager(app);
    manager.start();
    manager.loader.SOURCE_DIR = './fake-imes/';

    var dataPromise = Promise.resolve({
      value: 'data'
    });

    var p1 = manager.switchCurrentIMEngine('foo', dataPromise);
    var p2 = manager.switchCurrentIMEngine('foo', dataPromise);
    p1.then(function() {
      assert.isTrue(false, 'should not resolve');
    }, function() {
      assert.isTrue(true, 'rejected');
    });
    p2.then(function() {
      assert.isTrue(true, 'resolved');
      assert.isTrue(!!manager.loader.getInputMethod('foo'), 'foo loaded');
      assert.equal(manager.currentIMEngine,
        manager.loader.getInputMethod('foo'),
        'currentIMEngine is set');

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('switchCurrentIMEngine (reload after loaded)', function(done) {
    window.InputMethods = {
      'default': realInputMethods['default']
    };

    var manager = new InputMethodManager(app);
    manager.start();
    manager.loader.SOURCE_DIR = './fake-imes/';

    var dataPromise = Promise.resolve({
      value: 'data'
    });

    var p = manager.switchCurrentIMEngine('foo', dataPromise);
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var imEngine = manager.loader.getInputMethod('foo');
      assert.isTrue(!!imEngine, 'foo loaded');
      assert.equal(manager.currentIMEngine, imEngine, 'currentIMEngine is set');

      var activateStub = imEngine.activate;
      assert.isTrue(activateStub.calledWithExactly('xx-XX', {
        value: 'data'
      }, {
        suggest: true,
        correct: true
      }));
      assert.equal(activateStub.getCall(0).thisValue,
        imEngine);

      var p2 = manager.switchCurrentIMEngine('foo', dataPromise);

      var deactivateStub = imEngine.deactivate;
      assert.isTrue(deactivateStub.calledOnce);
      assert.equal(deactivateStub.getCall(0).thisValue,
        imEngine);

      assert.equal(manager.currentIMEngine,
        manager.loader.getInputMethod('default'),
        'currentIMEngine is set to default');

      p2.then(function() {
        assert.isTrue(true, 'resolved');
        var imEngine = manager.loader.getInputMethod('foo');
        assert.isTrue(!!imEngine, 'foo loaded');
        assert.equal(manager.currentIMEngine, imEngine,
          'currentIMEngine is set');

        var activateStub = imEngine.activate;
        assert.isTrue(activateStub.calledTwice);
        assert.isTrue(activateStub.calledWithExactly('xx-XX', {
          value: 'data'
        }, {
          suggest: true,
          correct: true
        }));
        assert.equal(activateStub.getCall(1).thisValue,
          imEngine);

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
});
