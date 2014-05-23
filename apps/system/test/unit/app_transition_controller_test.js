/* global MocksHelper, MockAppWindow, AppTransitionController*/
'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForAppTransitionController = new MocksHelper([
  'AppWindow', 'SettingsListener'
]).init();

suite('system/AppTransitionController', function() {
  var stubById;
  mocksForAppTransitionController.attachTestHelpers();
  setup(function(done) {
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
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
    var app1 = new MockAppWindow(fakeAppConfig1);
    var acn1 = new AppTransitionController(app1);
    var spy = this.sinon.spy();
    acn1._transitionState = 'opening';
    acn1.handleEvent({
      type: 'animationend',
      stopPropagation: spy
    });
    assert.isTrue(spy.called);
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
