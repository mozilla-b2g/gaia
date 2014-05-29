/* global MocksHelper, MockAppWindow, MockSystem, AppTransitionController */
'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_system.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForAppTransitionController = new MocksHelper([
  'AppWindow', 'LayoutManager', 'SettingsListener', 'System'
]).init();

suite('system/AppTransitionController', function() {
  var stubById;
  mocksForAppTransitionController.attachTestHelpers();
  setup(function(done) {
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/app_transition_controller.js', done);
  });

  teardown(function() {
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

  test('Open request', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    acn1.handleEvent({ type: '_openrequest', detail: {} });
  });

  test('Close request', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    acn1.handleEvent({ type: '_closerequest', detail: {} });
  });

  test('Opening event', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    acn1.handleEvent({ type: '_opening' });
  });

  test('Closing event', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    acn1.handleEvent({ type: '_closing' });
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
