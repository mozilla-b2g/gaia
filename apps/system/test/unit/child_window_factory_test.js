'use strict';
/* global MocksHelper, MockAppWindow, ChildWindowFactory */

mocha.globals(['ChildWindowFactory', 'AppWindow']);

requireApp('system/test/unit/mock_app_window.js');

var mocksForChildWindowFactory = new MocksHelper([
  'AppWindow'
]).init();

suite('system/ChildWindowFactory', function() {
  var stubById;
  mocksForChildWindowFactory.attachTestHelpers();
  setup(function(done) {
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/child_window_factory.js', done);
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

  var fakeWindowOpenDetailSameOrigin = {
    url: 'app://www.fake/child.html',
    name: '_blank',
    iframe: document.createElement('iframe'),
    features: ''
  };

  var fakeWindowOpenDetailCrossOrigin = {
    url: 'http://fake.com/child.html',
    name: '_blank',
    iframe: document.createElement('iframe'),
    features: ''
  };

  test('Open same origin sheets', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'AppWindow');
    var cwf = new ChildWindowFactory(app1);
    cwf.handleEvent({
      type: 'mozbrowseropenwindow',
      detail: fakeWindowOpenDetailSameOrigin
    });
    assert.isTrue(spy.calledWithNew());
    assert.deepEqual(spy.getCall(0).args[0].parentWindow, app1);
  });

  test('Open cross origin sheets', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'AppWindow');
    var cwf = new ChildWindowFactory(app1);
    cwf.handleEvent({
      type: 'mozbrowseropenwindow',
      detail: fakeWindowOpenDetailCrossOrigin
    });
    assert.isTrue(spy.calledWithNew());
    assert.isUndefined(spy.getCall(0).args[0].parentWindow);
  });
});
