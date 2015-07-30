'use strict';
/* global MocksHelper, MockAppWindow, ChildWindowFactory, MockService,
          MockActivityWindow, MockPopupWindow, MockSettingsListener */
/* jshint nonew: false */

require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_popup_window.js');
requireApp('system/test/unit/mock_activity_window.js');
requireApp('system/test/unit/mock_trusted_window.js');
requireApp('system/test/unit/mock_attention_window.js');
requireApp('system/test/unit/mock_global_overlay_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_activity.js');

var mocksForChildWindowFactory = new MocksHelper([
  'MozActivity', 'AppWindow', 'ActivityWindow', 'PopupWindow', 'TrustedWindow',
  'SettingsListener', 'AttentionWindow', 'Service', 'GlobalOverlayWindow'
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

  var fakeTrustedDetail = {
    name: 'trustedname',
    frame: document.createElement('iframe'),
    requestId: 'testrequestid',
    chromeId: 'testchromeid'

  };

  var fakeOpenAppDetail = {
    url: 'http://fake.com/index.html',
    name: 'http://fake.com/manifest.webapp',
    isApp: true
  };

  var fakeAttentionDetail = {
    'url': 'app://fakeatt.gaiamobile.org/pick.html',
    'manifestURL': 'app://fakeatt.gaiamobile.org/manifest.webapp',
    iframe: document.createElement('iframe'),
    features: 'attention'
  };

  var fakeGlobalOverlayDetail = {
    'url': 'app://fakeglobaloverlay.gaiamobile.org/pick.html',
    'manifestURL': 'app://fakeglobaloverlay.gaiamobile.org/manifest.webapp',
    iframe: document.createElement('iframe'),
    features: 'global-clickthrough-overlay'
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

  test('Open attention window', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'AttentionWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'hasPermission').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeAttentionDetail
      }));
    assert.isTrue(spy.calledWithNew());
    assert.deepEqual(spy.getCall(0).args[0].parentWindow, app1);
  });

  test('Open global overlay window', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'GlobalOverlayWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'hasPermission').returns(true);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeGlobalOverlayDetail
      }));
    assert.isTrue(spy.calledWithNew());
    assert.deepEqual(spy.getCall(0).args[0].parentWindow, app1);
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
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isActive').returns(true);
    this.sinon.stub(app1, 'isTransitioning').returns(false);
    var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
    var testEvt = (new CustomEvent('mozbrowseropenwindow', {
      detail: fakeWindowOpenBlank
    }));
    cwf.handleEvent(testEvt);

    assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'openwindow');
    assert.deepEqual(stubDispatchEvent.getCall(0).args[0].detail, {
      url: fakeWindowOpenBlank.url,
      name: fakeWindowOpenBlank.name,
      iframe: fakeWindowOpenBlank.frameElement,
      isPrivate: false
    });
  });

  test('Create ActivityWindow', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'ActivityWindow');
    this.sinon.spy(app1, '_setVisibleForScreenReader');
    this.sinon.spy(app1, 'setNFCFocus');
    new ChildWindowFactory(app1);
    app1.element.dispatchEvent(new CustomEvent('_launchactivity', {
      detail: fakeActivityDetail
    }));
    assert.isTrue(spy.calledWithNew());
    assert.deepEqual(spy.getCall(0).args[0], fakeActivityDetail);
    assert.deepEqual(spy.getCall(0).args[1], app1);
    sinon.assert.calledWith(app1._setVisibleForScreenReader, false);
    sinon.assert.calledWith(app1.setNFCFocus, false);
  });

  test('Create TrustedWindow', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'TrustedWindow');
    new ChildWindowFactory(app1);
    app1.element.dispatchEvent(new CustomEvent('_launchtrusted', {
      detail: fakeTrustedDetail
    }));
    assert.isTrue(spy.calledWithNew());
    assert.deepEqual(spy.getCall(0).args[0], fakeTrustedDetail);
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

  test('opened of activity should hide the back', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'ActivityWindow');
    app1.cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isActive').returns(true);
    this.sinon.stub(app1, 'isVisible').returns(true);
    app1.element.dispatchEvent(new CustomEvent('_launchactivity',
      {
        detail: fakeActivityDetail
      }));
    this.sinon.stub(app1, 'setVisible');
    var activity = spy.getCall(0).returnValue;
    activity.element.dispatchEvent(new CustomEvent('_opened', {
      detail: spy.getCall(0).returnValue
    }));
    assert.isTrue(app1.setVisible.calledWith(false, true));
  });

  test('closing of popup should resume visibility and orientation', function() {
    MockSettingsListener.mCallbacks['in-app-sheet.enabled'](false);
    var app1 = new MockAppWindow(fakeAppConfig1);
    var spy = this.sinon.spy(window, 'PopupWindow');
    var cwf = new ChildWindowFactory(app1);
    this.sinon.stub(app1, 'isActive').returns(true);
    this.sinon.stub(app1, 'isVisible').returns(true);
    this.sinon.spy(app1, '_setVisibleForScreenReader');
    MockService.mockQueryWith('getTopMostWindow', app1);
    cwf.handleEvent(new CustomEvent('mozbrowseropenwindow',
      {
        detail: fakeWindowOpenPopup
      }));
    var stubSetOrientation = this.sinon.stub(app1, 'setOrientation');
    this.sinon.stub(app1, 'setVisible');
    spy.getCall(0).returnValue.element
        .dispatchEvent(new CustomEvent('_closing', {
          detail: spy.getCall(0).returnValue
        }));
    assert.isTrue(stubSetOrientation.called);
    assert.isTrue(app1.setVisible.calledWith(true, true));
    sinon.assert.calledWith(app1._setVisibleForScreenReader, true);
  });

  suite('FTU is running', function() {
    setup(function() {
      MockService.mockQueryWith('isFtuRunning', true);
    });

    test('> _blank', function() {
      var app1 = new MockAppWindow(fakeAppConfig1);
      var cwf = new ChildWindowFactory(app1);
      var stubCreatePopupWindow = this.sinon.stub(cwf, 'createPopupWindow');
      var testEvt = (new CustomEvent('mozbrowseropenwindow', {
        detail: fakeWindowOpenBlank
      }));
      cwf.handleEvent(testEvt);
      assert.isTrue(stubCreatePopupWindow.calledOnce);
    });
  });

});
