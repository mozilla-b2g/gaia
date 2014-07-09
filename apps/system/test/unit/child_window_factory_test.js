'use strict';
/* global MocksHelper, MockAppWindow, ChildWindowFactory,
          MockActivityWindow, MockPopupWindow, MockSettingsListener */
/* jshint nonew: false */

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_popup_window.js');
requireApp('system/test/unit/mock_activity_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForChildWindowFactory = new MocksHelper([
  'AppWindow', 'ActivityWindow', 'PopupWindow', 'SettingsListener'
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

  var fakeWindowOpenPopup = {
    url: 'http://fake.com/child2.html',
    name: '_blank',
    iframe: document.createElement('iframe'),
    features: 'dialog'
  };

  var fakeWindowOpenHaidaSheet = {
    url: 'http://fake.com/child2.html',
    name: '_blank',
    iframe: document.createElement('iframe'),
    features: 'mozhaidasheet'
  };

  var fakeActivityDetail = {
    url: 'http://fake.activity/open.html',
    origin: 'http://fake.activity',
    manifestURL: 'http://fake.activity/manifest.webapp',
    manifest: {}
  };

  test('Should only open inner sheet in setting enabled', function() {
    MockSettingsListener.mCallbacks['in-app-sheet.enabled'](false);
    var spyAppWindow = this.sinon.spy(window, 'AppWindow');
    var spyPopupWindow = this.sinon.spy(window, 'PopupWindow');
    var app1 = new MockAppWindow(fakeAppConfig1);
    var cwf = new ChildWindowFactory(app1);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenDetailSameOrigin
      }));
    assert.isFalse(spyAppWindow.calledWithNew());
    assert.isTrue(spyPopupWindow.calledWithNew());
  });

  test('Open same origin sheets', function() {
    MockSettingsListener.mCallbacks['in-app-sheet.enabled'](true);
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'AppWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isActive').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenDetailSameOrigin
      }));
    assert.isTrue(spy.calledWithNew());
    assert.deepEqual(spy.getCall(0).args[0].previousWindow, app1);
  });

  test('Open cross origin sheets', function() {
    MockSettingsListener.mCallbacks['in-app-sheet.enabled'](true);
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'AppWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isActive').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenDetailCrossOrigin
      }));
    assert.isTrue(spy.calledWithNew());
    assert.isUndefined(spy.getCall(0).args[0].previousWindow);
  });

  test('Open popup', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'PopupWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isActive').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenPopup
      }));
    assert.isTrue(spy.calledWithNew());
    assert.deepEqual(spy.getCall(0).args[0].rearWindow, app1);
  });

  test('background app should not create child window', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'AppWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isActive').returns(false);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenDetailSameOrigin
      }));
    assert.isFalse(spy.calledWithNew());
  });

  test('app having a transitioning frontwindow ' +
        'should not create child window', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var popup1 = new MockPopupWindow();
    var spy = this.sinon.spy(window, 'PopupWindow');
    var cwf = new ChildWindowFactory(app1);
    app1.frontWindow = popup1;
    this.sinon.stub(popup1, 'isTransitioning').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenPopup
      }));
    assert.isFalse(spy.calledWithNew());
  });

  test('app having an active frontwindow ' +
        'should not create child window', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var popup1 = new MockPopupWindow();
    var spy = this.sinon.spy(window, 'PopupWindow');
    var cwf = new ChildWindowFactory(app1);
    app1.frontWindow = popup1;
    this.sinon.stub(popup1, 'isActive').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenPopup
      }));
    assert.isFalse(spy.calledWithNew());
  });

  test('transitioning app should not create child window', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'AppWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isTransitioning').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenDetailCrossOrigin
      }));
    assert.isFalse(spy.calledWithNew());
  });

  test('Use mozhaidasheet to open inner sheet', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'AppWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isActive').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenHaidaSheet
      }));
    assert.isTrue(spy.calledWithNew());
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