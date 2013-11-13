'use strict';

mocha.globals(['AppTransitionController', 'AppWindow', 'System']);

requireApp('system/test/unit/mock_app_window.js');

new MocksHelper([
  'AppWindow'
]).init().attachTestHelpers();

suite('system/AppTransitionController', function() {
  var clock, stubById;
  setup(function(done) {
    clock = sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/app_transition_controller.js', done);
  });

  teardown(function() {
    clock.restore();
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
    acn1._transitionState = 'opening';
    acn1.handleEvent({ type: 'animationend' });
  });
});
