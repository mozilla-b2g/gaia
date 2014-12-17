/* global MocksHelper, MockAppWindow, MockService, AppTransitionController,
          MockSimPinDialog, MockRocketbar, rocketbar */
'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_layout_manager.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_sim_pin_dialog.js');
requireApp('system/test/unit/mock_rocketbar.js');

var mocksForAppTransitionController = new MocksHelper([
  'AppWindow', 'AppWindowManager', 'LayoutManager', 'SettingsListener',
  'Service'
]).init();

suite('system/AppTransitionController', function() {
  var stubById;
  mocksForAppTransitionController.attachTestHelpers();
  setup(function(done) {
    window.SimPinDialog = new MockSimPinDialog();
    window.rocketbar = new MockRocketbar();
    window.rocketbar = new MockRocketbar();
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/app_transition_controller.js', done);
  });

  teardown(function() {
    window.SimPinDialog = null;
    window.rocketbar = null;
    stubById.restore();
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  test('New as closed', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    assert.isTrue(acn1._transitionState === 'closed');
  });

  test('Open', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    assert.deepEqual(acn1._transitionState, 'closed');
    acn1.requireOpen();
    assert.deepEqual(acn1._transitionState, 'opening');
  });

  test('Open with immediate animation', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    assert.deepEqual(acn1._transitionState, 'closed');
    acn1.requireOpen('immediate');
    assert.deepEqual(acn1._transitionState, 'opened');
  });

  test('Close', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    acn1._transitionState = 'opened';
    acn1.requireClose();
    assert.deepEqual(acn1._transitionState, 'closing');
  });

  test('Close with immediate animation', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    acn1._transitionState = 'opened';
    acn1.requireClose('immediate');
    assert.deepEqual(acn1._transitionState, 'closed');
  });

  test('Closed notfication', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    acn1._transitionState = 'closing';
    var stubSetVisible = this.sinon.stub(app1, 'setVisible');
    acn1.handleEvent({ type: '_closed' });
    assert.isTrue(stubSetVisible.calledWith(false));
  });

  test('Opened notification', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var stubRequestForeground = this.sinon.stub(app1, 'requestForeground');
    acn1._transitionState = 'opening';
    acn1.handleEvent({ type: '_opened' });
    assert.isTrue(stubRequestForeground.calledOnce);
  });

  test('Animation start event', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    acn1._transitionState = 'opening';
    acn1.handleEvent({ type: 'animationstart' });
  });

  test('Animation end event', function() {
    this.sinon.stub(MockService, 'isBusyLoading').returns(false);
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var spy = this.sinon.spy();
    acn1._transitionState = 'opening';
    acn1.handleEvent({
      type: 'animationend',
      stopPropagation: spy
    });
    assert.isTrue(spy.called);
    acn1._transitionState = 'opened';
  });

  test('Complete on _loaded event if we discarded the animationend',
  function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var stopStub = this.sinon.stub();
    acn1._transitionState = 'opening';

    this.sinon.stub(MockService, 'isBusyLoading').returns(true);
    acn1.handleEvent({
      type: 'animationend',
      stopPropagation: stopStub
    });
    assert.equal(acn1._transitionState, 'opening');

    MockService.isBusyLoading.returns(false);
    acn1.handleEvent({
      type: '_loaded',
      stopPropagation: stopStub
    });
    assert.equal(acn1._transitionState, 'opened');
  });

  test('Discard animationend event if system is busy', function() {
    this.sinon.stub(MockService, 'isBusyLoading').returns(true);
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var spy = this.sinon.spy();
    var stubPublish = this.sinon.stub(app1, 'publish');
    acn1._transitionState = 'opening';
    acn1.handleEvent({
      type: 'animationend',
      stopPropagation: spy
    });
    assert.equal(acn1._transitionState, 'opening');
    assert.isFalse(stubPublish.called);
  });

  test('Discard animationend event if system is busy', function() {
    this.sinon.stub(MockService, 'isBusyLoading').returns(true);
    var app1 = new MockAppWindow(fakeAppConfig1);
    app1.isHomescreen = true;
    var acn1 = new AppTransitionController(app1);
    var spy = this.sinon.spy();
    acn1._transitionState = 'opening';
    var stubFocus = this.sinon.stub(app1, 'focus');
    acn1.handleEvent({
      type: 'animationend',
      stopPropagation: spy
    });
    assert.isTrue(stubFocus.called);
  });

  test('Handle opening', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var stubReviveBrowser = this.sinon.stub(app1, 'reviveBrowser');
    var stubRequestForeground = this.sinon.stub(app1, 'requestForeground');
    acn1.handle_opening();
    assert.isTrue(stubRequestForeground.calledOnce);
    assert.isTrue(stubReviveBrowser.called);
  });

  test('Handle opening', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var stubReviveBrowser = this.sinon.stub(app1, 'reviveBrowser');
    var stubRequestForeground = this.sinon.stub(app1, 'requestForeground');
    acn1.handle_opening();
    assert.isTrue(stubRequestForeground.calledOnce);
    assert.isTrue(stubReviveBrowser.called);
  });

  test('Handle opening of callscreen window', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var stubSetOrientation = this.sinon.stub(app1, 'setOrientation');
    app1.isCallscreenWindow = true;
    acn1.handle_opening();
    assert.isTrue(stubSetOrientation.calledOnce);
  });

  test('Warm launch event', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    app1.loaded = true;
    acn1.handle_opening();
    var stubPublish = this.sinon.stub(app1, 'publish');
    app1.element.dispatchEvent(new CustomEvent('_opened'));
    assert.isTrue(stubPublish.called);
    assert.equal(stubPublish.getCall(0).args[1].type, 'w');
  });

  test('Focus will happen after loaded and opened', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var stubFocus = this.sinon.stub(app1, 'focus');
    this.sinon.stub(MockService, 'isBusyLoading');

    app1.loaded = false;
    acn1._transitionState = 'opening';
    MockSimPinDialog.visible = false;
    rocketbar.active = false;

    MockService.isBusyLoading.returns(true);
    acn1.handleEvent({
      type: 'animationend',
      stopPropagation: function() {}
    });
    assert.isFalse(stubFocus.called);

    MockService.isBusyLoading.returns(false);
    acn1.handleEvent({
      type: '_loaded',
      stopPropagation: function() {}
    });
    acn1.handle_opened();

    assert.isTrue(stubFocus.called);
  });

  test('Focus will happen once next paint', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var stubFocus = this.sinon.stub(app1, 'focus');
    app1.loaded = true;
    MockSimPinDialog.visible = false;
    rocketbar.active = false;
    acn1._transitionState = 'opened';

    acn1.handle_opened();

    assert.isTrue(stubFocus.called);
  });

  test('Do not focus if rocketbar is active', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var stubFocus = this.sinon.stub(app1, 'focus');
    app1.loaded = true;
    MockSimPinDialog.visible = false;
    rocketbar.active = true;
    acn1._transitionState = 'opened';

    acn1.handle_opened();
    assert.isTrue(stubFocus.notCalled);
  });

  suite('Opened', function() {
    var app1, acn1, stubRequestForeground, stubSetOrientation, stubShow;
    setup(function() {
      app1 = new MockAppWindow(fakeAppConfig1);
      acn1 = new AppTransitionController(app1);
      stubRequestForeground = this.sinon.stub(app1, 'requestForeground');
      stubSetOrientation = this.sinon.stub(app1, 'setOrientation');
      stubShow = this.sinon.stub(app1, 'show');
      this.sinon.stub(app1, 'reviveBrowser');
    });
    test('Handle opened', function() {
      acn1.handle_opened();
      assert.isTrue(stubRequestForeground.calledOnce);
      assert.isTrue(stubShow.called);
      assert.isTrue(stubSetOrientation.called);
      assert.isTrue(app1.reviveBrowser.called);
    });

    test('Handle opened if the new window is callscreenWindow', function() {
      app1.isCallscreenWindow = true;
      acn1.handle_opened();
      assert.isTrue(stubRequestForeground.calledOnce);
      assert.isTrue(stubShow.called);
      assert.isFalse(stubSetOrientation.called);
      app1.element.classList.remove('callscreenWindow');
    });
  });

  test('Handle closing', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    acn1.handle_closing();
  });

  test('Handle closed', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var stubSetVisible = this.sinon.stub(app1, 'setVisible');
    acn1.handle_closed();
    assert.isTrue(stubSetVisible.calledWith(false));
  });

  test('Do not send to background in closed handler for attention windows',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      app1.isAttentionWindow = true;
      var acn1 = new AppTransitionController(app1);
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');
      acn1.handle_closed();
      assert.isFalse(stubSetVisible.calledWith(false));
      assert.isFalse(stubSetVisible.called);
    });
});
