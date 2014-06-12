/* global MocksHelper, MockAppWindow, MockSystem, AppTransitionController,
          MockSimPinDialog, MockRocketbar, rocketbar */
'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_system.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_sim_pin_dialog.js');
requireApp('system/test/unit/mock_rocketbar.js');

var mocksForAppTransitionController = new MocksHelper([
  'AppWindow', 'LayoutManager', 'SettingsListener', 'System'
]).init();

suite('system/AppTransitionController', function() {
  var stubById;
  mocksForAppTransitionController.attachTestHelpers();
  setup(function(done) {
    window.SimPinDialog = new MockSimPinDialog();
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
    assert.isTrue(stubSetVisible.calledWith(false, true));
  });

  test('Opened notification', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var stubSetVisible = this.sinon.stub(app1, 'setVisible');
    acn1._transitionState = 'opening';
    acn1.handleEvent({ type: '_opened' });
    assert.isTrue(stubSetVisible.calledWith(true));
  });

  test('Animation start event', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    acn1._transitionState = 'opening';
    acn1.handleEvent({ type: 'animationstart' });
  });

  test('Animation end event', function() {
    this.sinon.stub(MockSystem, 'isBusyLoading').returns(false);
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

  test('Discard animationend event if system is busy', function() {
    this.sinon.stub(MockSystem, 'isBusyLoading').returns(true);
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
    this.sinon.stub(MockSystem, 'isBusyLoading').returns(true);
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
    var stubSetVisible = this.sinon.stub(app1, 'setVisible');
    acn1.handle_opening();
    assert.isTrue(stubSetVisible.calledWith(true));
    assert.isTrue(stubReviveBrowser.called);
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
    app1.loaded = false;
    acn1.handle_opened();
    MockSimPinDialog.visible = false;
    rocketbar.active = false;

    acn1._transitionState = 'opened';
    app1.element.dispatchEvent(new CustomEvent('_loaded'));

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

  suite('Opened', function() {
    test('Handle opened', function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var acn1 = new AppTransitionController(app1);
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');
      var stubSetOrientation = this.sinon.stub(app1, 'setOrientation');
      acn1.handle_opened();
      assert.isTrue(stubSetVisible.calledWith(true));
      assert.isTrue(stubSetOrientation.called);
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
    assert.isTrue(stubSetVisible.calledWith(false, true));
  });
});
