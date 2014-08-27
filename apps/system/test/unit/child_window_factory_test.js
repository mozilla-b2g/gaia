'use strict';
/* global MocksHelper, MockAppWindow, ChildWindowFactory,
          MockActivityWindow, MockPopupWindow, MockSettingsListener,
          MockAttentionScreen */
/* jshint nonew: false */

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_popup_window.js');
requireApp('system/test/unit/mock_activity_window.js');
requireApp('system/test/unit/mock_attention_screen.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_activity.js');

var mocksForChildWindowFactory = new MocksHelper([
  'MozActivity', 'AppWindow', 'ActivityWindow', 'PopupWindow',
  'AttentionScreen', 'SettingsListener'
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
    name: 'same',
    iframe: document.createElement('iframe'),
    features: ''
  };

  var fakeWindowOpenDetailCrossOrigin = {
    url: 'http://fake.com/child.html',
    name: 'other',
    iframe: document.createElement('iframe'),
    features: ''
  };

  var fakeWindowOpenBlank = {
    url: 'http://blank.com/index.html',
    name: '_blank',
    iframe: document.createElement('iframe'),
    features: ''
  };


  var fakeWindowOpenPopup = {
    url: 'http://fake.com/child2.html',
    name: '',
    iframe: document.createElement('iframe'),
    features: 'dialog'
  };

  var fakeWindowOpenHaidaSheet = {
    url: 'http://fake.com/child2.html',
    name: 'haida',
    iframe: document.createElement('iframe'),
    features: 'mozhaidasheet'
  };

  var fakeWindowOpenEmail = {
    url: 'mailto:demo@mozilla.com',
    name: '',
    features: 'dialog'
  };

  var fakeActivityDetail = {
    url: 'http://fake.activity/open.html',
    origin: 'http://fake.activity',
    manifestURL: 'http://fake.activity/manifest.webapp',
    manifest: {}
  };

  var fakeOpenAppDetail = {
    url: 'http://fake.com/index.html',
    name: 'http://fake.com/manifest.webapp',
    isApp: true
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

  test('Open email sheets', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var activitySpy = this.sinon.spy(window, 'MozActivity');
    var cwf = new ChildWindowFactory(app1);
    var expectedActivity = {
      name: 'view',
      data: {
        type: 'url',
        url: 'mailto:demo@mozilla.com'
      }
    };
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenEmail
      }));
    assert.isTrue(activitySpy.calledWithNew());
    sinon.assert.calledWith(activitySpy, expectedActivity);
  });

  test('Target _blank support', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var activitySpy = this.sinon.spy(window, 'MozActivity');
    var cwf = new ChildWindowFactory(app1);
    var expectedActivity = {
      name: 'view',
      data: {
        type: 'url',
        url: 'http://blank.com/index.html'
      }
    };
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenBlank
      }));
    assert.isTrue(activitySpy.calledWithNew());
    sinon.assert.calledWith(activitySpy, expectedActivity);
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

  test('isApp support', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    new ChildWindowFactory(app1);
    var spy = this.sinon.spy(app1, 'publish');
    var event = new CustomEvent('mozbrowseropenwindow', {
      detail: fakeOpenAppDetail
    });
    var eventSpy = this.sinon.spy(event, 'stopPropagation');
    app1.element.dispatchEvent(event);
    assert.isTrue(spy.called);
    assert.deepEqual(spy.getCall(0).args[0], 'openwindow');
    assert.deepEqual(spy.getCall(0).args[1],
      { manifestURL: fakeOpenAppDetail.name,
        url: fakeOpenAppDetail.url,
        timestamp: 0 });
    assert.isTrue(eventSpy.called);
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

  test('closing of popup should resume visibility and orientation', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'PopupWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isActive').returns(true);
    this.sinon.stub(app1, 'isVisible').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenPopup
      }));
    var stubLockOrientation = this.sinon.stub(app1, 'lockOrientation');
    var stubVisible = this.sinon.stub(app1, 'setVisible');
    MockAttentionScreen.mFullyVisible = false;
    spy.getCall(0).returnValue.element
        .dispatchEvent(new CustomEvent('_closing', {
          detail: spy.getCall(0).returnValue
        }));
        console.log(spy.getCall(0).returnValue);
    assert.isTrue(stubVisible.calledWith(true));
    assert.isTrue(stubLockOrientation.called);
  });

  test('closing of popup should not resume visibility and orientation' +
        ' if attention screen is fully opened', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'PopupWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isActive').returns(true);
    this.sinon.stub(app1, 'isVisible').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenPopup
      }));
    var stubLockOrientation = this.sinon.stub(app1, 'lockOrientation');
    var stubVisible = this.sinon.stub(app1, 'setVisible');
    MockAttentionScreen.mFullyVisible = true;
    spy.getCall(0).returnValue.element
        .dispatchEvent(new CustomEvent('_closing', {
          detail: spy.getCall(0).returnValue
        }));
    assert.isFalse(stubVisible.calledWith(true));
    assert.isFalse(stubLockOrientation.called);
  });
});
