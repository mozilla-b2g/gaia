'use strict';
/* global MocksHelper, MockAppWindow, ChildWindowFactory,
          MockActivityWindow */
/* jshint nonew: false */

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_activity_window.js');

var mocksForChildWindowFactory = new MocksHelper([
  'AppWindow', 'ActivityWindow'
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

  var fakeActivityDetail = {
    url: 'http://fake.activity/open.html',
    origin: 'http://fake.activity',
    manifestURL: 'http://fake.activity/manifest.webapp',
    manifest: {}
  };

  test('Open same origin sheets', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'AppWindow');
    var cwf = new ChildWindowFactory(app1);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenDetailSameOrigin
      }));
    assert.isTrue(spy.calledWithNew());
    assert.deepEqual(spy.getCall(0).args[0].previousWindow, app1);
  });

  test('Open cross origin sheets', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'AppWindow');
    var cwf = new ChildWindowFactory(app1);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenDetailCrossOrigin
      }));
    assert.isTrue(spy.calledWithNew());
    assert.isUndefined(spy.getCall(0).args[0].previousWindow);
  });

  test('Create ActivityWindow', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'ActivityWindow');
    new ChildWindowFactory(app1);
    app1.element.dispatchEvent(new CustomEvent('_launchactivity', {
      detail: fakeActivityDetail
    }));
    assert.isTrue(spy.calledWithNew());
    assert.deepEqual(spy.getCall(0).args[0], fakeActivityDetail);
    assert.deepEqual(spy.getCall(0).args[1], app1);
  });

  test('No new ActivityWindow instance if the top window has same config',
    function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var spy = this.sinon.spy(window, 'ActivityWindow');
      new ChildWindowFactory(app1);
      var spy2 = this.sinon.stub(app1, 'getTopMostWindow');
      spy2.returns(new MockActivityWindow(fakeActivityDetail));
      app1.element.dispatchEvent(new CustomEvent('_launchactivity', {
        detail: fakeActivityDetail
      }));
      assert.isFalse(spy.calledWithNew());
    });
});
