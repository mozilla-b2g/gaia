'use strict';

/* global LayoutRenderingManager, KeyboardConsole */

require('/js/keyboard/console.js');

require('/js/keyboard/layout_rendering_manager.js');

suite('LayoutRenderingManager', function() {
  var app;
  var manager;
  var viewManager;

  setup(function() {
    this.sinon.stub(window, 'setTimeout');
    this.sinon.stub(window, 'clearTimeout');
    this.sinon.stub(window, 'addEventListener');
    this.sinon.stub(window, 'removeEventListener');
    this.sinon.stub(window, 'resizeTo');

    viewManager = {
      render: this.sinon.stub(),
      resize: this.sinon.stub(),
      setUpperCaseLock: this.sinon.stub(),
      showCandidates: this.sinon.stub(),
      getWidth: this.sinon.stub().returns(600),
      getHeight: this.sinon.stub().returns(400),
      getKeyArray: this.sinon.stub().returns([]),
      getKeyWidth: this.sinon.stub().returns(15),
      getKeyHeight: this.sinon.stub().returns(12),
      candidatePanel: {
        clientHeight: 123
      }
    };

    app = {
      getBasicInputType: this.sinon.stub().returns('foo'),
      console: this.sinon.stub(KeyboardConsole.prototype),
      candidatePanelManager: {
        currentCandidates: []
      },
      layoutManager: {
        currentPage: {
          keys: [ { value: 'currentPage' } ]
        },
        currentPageIndex: 0,
        PAGE_INDEX_DEFAULT: 0
      },
      inputMethodManager: {
        currentIMEngine: {
          setLayoutParams: this.sinon.stub()
        }
      },
      upperCaseStateManager: {
        isUpperCase: true
      },
      viewManager: viewManager
    };

    Object.defineProperty(document, 'hidden',
                          { value: false, configurable: true });

    manager = new LayoutRenderingManager(app);
    manager.start();

    assert.isTrue(window.setTimeout.calledOnce);
    window.setTimeout.getCall(0).args[0].call(window);

    assert.isTrue(window.addEventListener.calledWith('resize', manager));
  });

  suite('updateLayoutRendering', function() {
    var p;

    teardown(function(done) {
      viewManager.render.getCall(0).args[2].call(window);
      assert.isTrue(window.resizeTo.calledWith(600, 401));

      p.then(function() {
        assert.equal(
          viewManager.setUpperCaseLock.firstCall.args[0],
          app.upperCaseStateManager);
        assert.equal(viewManager.showCandidates.firstCall.args[0],
          app.candidatePanelManager.currentCandidates);
        assert.isTrue(
          app.inputMethodManager.currentIMEngine.setLayoutParams.calledWith({
            keyboardWidth: 600,
            keyboardHeight: 277,
            keyArray: [],
            keyWidth: 15,
            keyHeight: 12
          }));
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'Should not reject.');
      }).then(done, done);
    });

    test('isUpperCase = false', function() {
      app.upperCaseStateManager.isUpperCase = false;
      p = manager.updateLayoutRendering();

      assert.isTrue(viewManager.render.calledWith(
        app.layoutManager.currentPage,
        {
          uppercase: false,
          inputType: 'foo',
          showCandidatePanel: false
        }));
    });

    test('w/o autoCorrectLanguage, w/o displaysCandidates()', function() {
      p = manager.updateLayoutRendering();

      assert.isTrue(viewManager.render.calledWith(
        app.layoutManager.currentPage,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: false
        }));
    });

    test('w/ autoCorrectLanguage, w/o displaysCandidates()', function() {
      app.layoutManager.currentPage.autoCorrectLanguage = 'zz-ZZ';

      p = manager.updateLayoutRendering();

      assert.isTrue(viewManager.render.calledWith(
        app.layoutManager.currentPage,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: true
        }));
    });

    test('w/ autoCorrectLanguage, w/ displaysCandidates()', function() {
      app.layoutManager.currentPage.autoCorrectLanguage = 'zz-ZZ';
      app.inputMethodManager.currentIMEngine.displaysCandidates =
        this.sinon.stub().returns(false);

      p = manager.updateLayoutRendering();

      assert.isTrue(viewManager.render.calledWith(
        app.layoutManager.currentPage,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: false
        }));
    });

    test('w/ needsCandidatePanel, w/o displaysCandidates()', function() {
      app.layoutManager.currentPage.needsCandidatePanel = true;

      p = manager.updateLayoutRendering();

      assert.isTrue(viewManager.render.calledWith(
        app.layoutManager.currentPage,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: true
        }));
    });

    test('w/ needsCandidatePanel, w/ displaysCandidates()', function() {
      app.layoutManager.currentPage.needsCandidatePanel = true;
      app.inputMethodManager.currentIMEngine.displaysCandidates =
        this.sinon.stub().returns(false);

      p = manager.updateLayoutRendering();

      assert.isTrue(viewManager.render.calledWith(
        app.layoutManager.currentPage,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: false
        }));
    });
  });

  suite('Before rendering', function() {
    test('resize event', function() {
      var evt = {
        type: 'resize',
        target: window
      };
      manager.handleEvent(evt);

      assert.isFalse(viewManager.resize.calledOnce);
      assert.isFalse(
        app.inputMethodManager.currentIMEngine.setLayoutParams.calledOnce);
      assert.isFalse(window.resizeTo.calledOnce);
    });

    test('updateCandidatesRendering', function() {
      manager.updateCandidatesRendering();

      assert.isFalse(viewManager.showCandidates.calledOnce);
    });

    test('updateUpperCaseRendering', function() {
      window.requestAnimationFrame = this.sinon.stub();

      manager.updateUpperCaseRendering();

      assert.isFalse(window.requestAnimationFrame.calledOnce);
    });
  });

  suite('Rendered', function() {
    setup(function(done) {
      manager.updateLayoutRendering().then(function() {
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'Should not reject.');
      }).then(done, done);

      viewManager.render.getCall(0).args[2].call(window);
    });

    test('resize event', function() {
      var evt = {
        type: 'resize',
        target: window
      };
      manager.handleEvent(evt);

      assert.equal(viewManager.resize.callCount, 1);

      assert.isTrue(
        app.inputMethodManager.currentIMEngine.setLayoutParams.calledWith({
          keyboardWidth: 600,
          keyboardHeight: 277,
          keyArray: [],
          keyWidth: 15,
          keyHeight: 12
        }));

      assert.isTrue(window.resizeTo.calledWith(600, 401));
    });

    test('updateCandidatesRendering', function() {
      manager.updateCandidatesRendering();

      assert.isTrue(viewManager.showCandidates.calledTwice);
      assert.equal(viewManager.showCandidates.secondCall.args[0],
        app.candidatePanelManager.currentCandidates);
    });

    test('updateUpperCaseRendering', function() {
      window.requestAnimationFrame = this.sinon.stub();

      manager.updateUpperCaseRendering();

      window.requestAnimationFrame.getCall(0).args[0].call(window);

      assert.isTrue(viewManager.setUpperCaseLock.calledTwice);
      assert.equal(viewManager.setUpperCaseLock.secondCall.args[0],
        app.upperCaseStateManager);
    });
  });

  suite('domObjectMap and getTargetObject', function() {
    test('get object with existent key', function() {
      var key = {
        dummy: 'dummy'
      };

      var object = {
        result: 'result'
      };

      manager.domObjectMap.set(key, object);

      assert.equal(manager.getTargetObject(key), object);
    });

    test('null and undefined key should return empty object', function() {
      assert.deepEqual(manager.getTargetObject(null), {});
      assert.deepEqual(manager.getTargetObject(undefined), {});
    });

    test('inexistent key should return empty object instead of undefined',
      function() {
      var inexistentKey = {
        someProp: 'dummy'
      };
      assert.deepEqual(manager.getTargetObject(inexistentKey), {});
    });
  });
});
