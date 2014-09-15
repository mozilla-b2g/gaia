'use strict';

/* global LayoutRenderingManager, KeyboardConsole, IMERender */

require('/js/keyboard/console.js');

require('/js/keyboard/layout_rendering_manager.js');

suite('LayoutRenderingManager', function() {
  var app;
  var manager;

  setup(function() {
    this.sinon.stub(window, 'setTimeout');
    this.sinon.stub(window, 'clearTimeout');
    this.sinon.stub(window, 'addEventListener');
    this.sinon.stub(window, 'removeEventListener');
    this.sinon.stub(window, 'resizeTo');

    window.IMERender = {
      setInputMethodName: this.sinon.stub(),
      draw: this.sinon.stub(),
      resizeUI: this.sinon.stub(),
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

      }
    };

    Object.defineProperty(window, 'hidden', { value: false });

    manager = new LayoutRenderingManager(app);
    manager.start();

    assert.isTrue(window.setTimeout.calledOnce);
    window.setTimeout.getCall(0).args[0].call(window);

    assert.isTrue(window.addEventListener.calledWith('resize', manager));
  });

  suite('updateLayoutRendering', function() {
    var p;

    teardown(function(done) {
      IMERender.draw.getCall(0).args[2].call(window);

      p.then(function() {
        assert.equal(
          IMERender.setUpperCaseLock.firstCall.args[0],
          app.upperCaseStateManager);
        assert.equal(IMERender.showCandidates.firstCall.args[0],
          app.candidatePanelManager.currentCandidates);
        assert.isTrue(
          app.inputMethodManager.currentIMEngine.setLayoutParams.calledWith({
            keyboardWidth: 600,
            keyboardHeight: 277,
            keyArray: [],
            keyWidth: 15,
            keyHeight: 12
          }));
        assert.isTrue(window.resizeTo.calledWith(600, 401));
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'Should not reject.');
      }).then(done, done);
    });

    test('w/o secondLayout & autoCorrectLanguage', function() {
      p = manager.updateLayoutRendering();

      assert.isTrue(IMERender.draw.calledWith(
        app.layoutManager.currentPage,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: false
        }));

      assert.isTrue(IMERender.setInputMethodName.calledWith('default'));
    });

    test('w/ secondLayout', function() {
      app.layoutManager.currentPage.secondLayout = true;
      app.upperCaseStateManager.isUpperCase = false;

      p = manager.updateLayoutRendering();

      assert.isTrue(IMERender.draw.calledWith(
        app.layoutManager.currentPage,
        {
          uppercase: false,
          inputType: 'foo',
          showCandidatePanel: false
        }));
    });

    test('w/ autoCorrectLanguage, w/o displaysCandidates()', function() {
      app.layoutManager.currentPage.autoCorrectLanguage = 'zz-ZZ';

      p = manager.updateLayoutRendering();

      assert.isTrue(IMERender.draw.calledWith(
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

      assert.isTrue(IMERender.draw.calledWith(
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

      assert.isTrue(IMERender.draw.calledWith(
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

      assert.isTrue(IMERender.draw.calledWith(
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

      assert.isFalse(IMERender.resizeUI.calledOnce);
      assert.isFalse(
        app.inputMethodManager.currentIMEngine.setLayoutParams.calledOnce);
      assert.isFalse(window.resizeTo.calledOnce);
    });

    test('updateCandidatesRendering', function() {
      manager.updateCandidatesRendering();

      assert.isFalse(IMERender.showCandidates.calledOnce);
    });

    suite('updateUpperCaseRendering', function() {
      setup(function() {
        window.requestAnimationFrame = this.sinon.stub();
      });

      test('w/o secondLayout', function() {
        manager.updateUpperCaseRendering();

        assert.isFalse(window.requestAnimationFrame.calledOnce);
      });

      test('w/ secondLayout', function() {
        app.layoutManager.currentPage.secondLayout = true;
        this.sinon.stub(manager, 'updateLayoutRendering');

        manager.updateUpperCaseRendering();

        assert.isFalse(manager.updateLayoutRendering.calledOnce);
      });
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

      IMERender.draw.getCall(0).args[2].call(window);
    });

    test('resize event', function() {
      var evt = {
        type: 'resize',
        target: window
      };
      manager.handleEvent(evt);

      assert.isTrue(
        IMERender.resizeUI.calledWith(app.layoutManager.currentPage));

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

      assert.isTrue(IMERender.showCandidates.calledTwice);
      assert.equal(IMERender.showCandidates.secondCall.args[0],
        app.candidatePanelManager.currentCandidates);
    });

    suite('updateUpperCaseRendering', function() {
      setup(function() {
        window.requestAnimationFrame = this.sinon.stub();
      });

      test('w/o secondLayout', function() {
        manager.updateUpperCaseRendering();

        window.requestAnimationFrame.getCall(0).args[0].call(window);

        assert.isTrue(IMERender.setUpperCaseLock.calledTwice);
        assert.equal(IMERender.setUpperCaseLock.secondCall.args[0],
          app.upperCaseStateManager);
      });

      test('w/ secondLayout', function() {
        app.layoutManager.currentPage.secondLayout = true;
        this.sinon.stub(manager, 'updateLayoutRendering');

        manager.updateUpperCaseRendering();

        assert.isTrue(manager.updateLayoutRendering.calledOnce);
      });
    });
  });
});
