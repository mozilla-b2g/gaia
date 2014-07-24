'use strict';

/* global LayoutRenderingManager, PerformanceTimer, CandidatePanelManager,
          IMERender */

require('/js/keyboard/performance_timer.js');
require('/js/keyboard/candidate_panel_manager.js');

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
      perfTimer: this.sinon.stub(PerformanceTimer.prototype),
      candidatePanelManager: this.sinon.stub(CandidatePanelManager.prototype),
      layoutManager: {
        currentModifiedLayout: {
          keys: [ { value: 'currentModifiedLayout' } ]
        },
        currentLayout: {
          keys: [ { value: 'currentLayout' } ]
        },
        currentLayoutPage: 0,
        LAYOUT_PAGE_DEFAULT: 0
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

  test('resize event', function() {
    var evt = {
      type: 'resize',
      target: window
    };
    manager.handleEvent(evt);

    assert.isTrue(
      IMERender.resizeUI.calledWith(app.layoutManager.currentModifiedLayout));

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

  suite('updateLayoutRendering', function() {
    teardown(function() {
      IMERender.draw.getCall(0).args[2].call(window);

      assert.isTrue(
        IMERender.setUpperCaseLock.calledWith(app.upperCaseStateManager));
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

    test('w/o secondLayout & autoCorrectLanguage', function() {
      manager.updateLayoutRendering();

      assert.isTrue(IMERender.draw.calledWith(
        app.layoutManager.currentModifiedLayout,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: false
        }));

      assert.isTrue(IMERender.setInputMethodName.calledWith('default'));
    });

    test('w/ secondLayout', function() {
      app.layoutManager.currentModifiedLayout.secondLayout = true;
      app.upperCaseStateManager.isUpperCase = false;

      manager.updateLayoutRendering();

      assert.isTrue(IMERender.draw.calledWith(
        app.layoutManager.currentModifiedLayout,
        {
          uppercase: false,
          inputType: 'foo',
          showCandidatePanel: false
        }));
    });

    test('w/ autoCorrectLanguage, w/o displaysCandidates()', function() {
      app.layoutManager.currentLayout.autoCorrectLanguage = 'zz-ZZ';

      manager.updateLayoutRendering();

      assert.isTrue(IMERender.draw.calledWith(
        app.layoutManager.currentModifiedLayout,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: true
        }));
    });

    test('w/ autoCorrectLanguage, w/ displaysCandidates()', function() {
      app.layoutManager.currentLayout.autoCorrectLanguage = 'zz-ZZ';
      app.inputMethodManager.currentIMEngine.displaysCandidates =
        this.sinon.stub().returns(false);

      manager.updateLayoutRendering();

      assert.isTrue(IMERender.draw.calledWith(
        app.layoutManager.currentModifiedLayout,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: false
        }));
    });

    test('w/ needsCandidatePanel, w/o displaysCandidates()', function() {
      app.layoutManager.currentLayout.needsCandidatePanel = true;

      manager.updateLayoutRendering();

      assert.isTrue(IMERender.draw.calledWith(
        app.layoutManager.currentModifiedLayout,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: true
        }));
    });

    test('w/ needsCandidatePanel, w/ displaysCandidates()', function() {
      app.layoutManager.currentLayout.needsCandidatePanel = true;
      app.inputMethodManager.currentIMEngine.displaysCandidates =
        this.sinon.stub().returns(false);

      manager.updateLayoutRendering();

      assert.isTrue(IMERender.draw.calledWith(
        app.layoutManager.currentModifiedLayout,
        {
          uppercase: true,
          inputType: 'foo',
          showCandidatePanel: false
        }));
    });
  });
});
