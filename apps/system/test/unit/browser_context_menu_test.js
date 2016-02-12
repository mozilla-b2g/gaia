/* global MocksHelper, MockL10n, AppWindow, BaseModule, MockNavigatorSettings,
          MockMozActivity, MozActivity, MockAppWindowHelper, MockService */

'use strict';

require('/shared/test/unit/mocks/mock_l20n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_icons_helper.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_context_menu_view.js');
requireApp('system/test/unit/mock_pin_page_system_dialog.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/js/browser_config_helper.js');
require('/js/service.js');
require('/js/base_module.js');

const PINNING_PREF = 'dev.gaia.pinning_the_web';

var mocksForAppModalDialog = new MocksHelper([
  'AppWindow', 'MozActivity', 'LazyLoader', 'IconsHelper', 'ContextMenuView',
  'Service'
]).init();

suite('system/BrowserContextMenu', function() {
  var stubById, realL10n, stubQuerySelector, realMozActivity,
      realMozSettings;

  mocksForAppModalDialog.attachTestHelpers();

  suiteSetup(function() {
    realL10n = document.l10n;
    realMozSettings = navigator.mozSettings;
    document.l10n = MockL10n;
    navigator.mozSettings = MockNavigatorSettings;
  });

  setup(function(done) {
    MockNavigatorSettings.mSetup();
    MockNavigatorSettings.mSyncRepliesOnly = true;
    MockService.mockQueryWith('isFtuRunning', false);

    stubById = this.sinon.stub(document, 'getElementById');
    var e = document.createElement('div');
    stubQuerySelector = this.sinon.stub(e, 'querySelector');
    stubQuerySelector.returns(document.createElement('div'));
    stubById.returns(e);

    window.BookmarksDatabase = {
      get: function() {
        return new Promise(function(resolve) { resolve(false); });
      }
    };

    this.sinon.stub(BaseModule, 'lazyLoad', function() {
      return {
          'then': function(callback) {
            callback();
          }
        };
    });

    requireApp('system/js/browser_context_menu.js', done);
    realMozActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;
    MozActivity.mSetup();
  });

  suiteTeardown(function() {
    document.l10n = realL10n;
    navigator.mozSettings = realMozSettings;
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    stubById.restore();
    stubQuerySelector.restore();
    MozActivity.mTeardown();
    window.MozActivity = realMozActivity;
    delete window.BookmarksDatabase;
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  var fakeBrowserConfig = {
    url: 'http://mozilla.org/index.html',
    manifest: {},
    origin: 'http://mozilla.org'
  };

  var fakePrivateConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake',
    isPrivate: true
  };

  var fakeContextMenuEvent = {
    type: 'mozbrowsercontextmenu',
    defaultPrevented: false,
    preventDefault: function() {
      this.defaultPrevented = true;
    },
    stopPropagation: function() {},
    detail: {
      contextmenu: {
        items: [{
          label: 'test0',
          icon: 'test'
        }],
        customized: true
      }
    }
  };

  var SYSTEM_TARGET_TYPES = [
    'a',
    'A',
    'IMG',
    'VIDEO',
    'AUDIO'
  ];

  var fakeSystemContextMenuEvents = [];

  SYSTEM_TARGET_TYPES.forEach(function(type) {
    fakeSystemContextMenuEvents.push({
      type: 'mozbrowsercontextmenu',
      defaultPrevented: false,
      preventDefault: function() {
        this.defaultPrevented = true;
      },
      stopPropagation: function() {},
      detail: {
        contextmenu: {
          items: [],
          customized: false
        },
        systemTargets: [{
          nodeName: type,
          data: {
            uri: 'http://fake.com'
          }
       }]
      }
    });
  });

  var fakeEmptyContextMenuEvent = {
    type: 'mozbrowsercontextmenu',
    defaultPrevented: false,
    preventDefault: function() {
      this.defaultPrevented = true;
    },
    detail: {}
  };

  var fakeNoItemsContextMenuEvent = {
    type: 'mozbrowsercontextmenu',
    defaultPrevented: false,
    preventDefault: function() {
      this.defaultPrevented = true;
    },
    detail: {
      contextmenu: {
        items: [],
        customized: false
      }
    }
  };

  test('start', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();
    assert.isDefined(md1);
    assert.isDefined(md1.contextMenuView);
  });

  test('stop', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();
    this.sinon.spy(md1.contextMenuView, 'destroy');
    md1.stop();
    assert.isTrue(md1.contextMenuView.destroy.calledOnce);
    assert.isNull(md1.containerElement);
    assert.isNull(md1.app);
  });

  test('launch menu', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();
    this.sinon.stub(md1.contextMenuView, 'show');

    var stubStopPropagation =
      this.sinon.stub(fakeContextMenuEvent, 'stopPropagation');
    var stubPreventDefault =
      this.sinon.stub(fakeContextMenuEvent, 'preventDefault');

    md1.handleEvent(fakeContextMenuEvent);

    // Checking that we stop propagation *before* getting
    // the pinning setting
    assert.isTrue(stubStopPropagation.called);
    assert.isTrue(stubPreventDefault.called);

    MockNavigatorSettings.mReplyToRequests();
    assert.isTrue(md1.contextMenuView.show.called);
  });

  suite('manually launch menu', function() {
    var md1;

    setup(function() {
      var app1 = new AppWindow(fakeAppConfig1);
      md1 = BaseModule.instantiate('BrowserContextMenu', app1);
      md1.start();
      md1.showDefaultMenu();
    });

    test('Context Menu is shown', function() {
      MockNavigatorSettings.mReplyToRequests();
      assert.isTrue(md1.isShown());
    });

    test('Context Menu is not shown', function() {
      md1.hide();
      assert.isFalse(md1.isShown());
    });
  });

  test('Context Menu is not shown during FTU', function() {
    var app1 = new AppWindow(fakeBrowserConfig);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();
    this.sinon.stub(md1, 'show');
    MockService.mockQueryWith('isFtuRunning', true);

    md1.handleEvent(fakeSystemContextMenuEvents[0]);
    assert.isFalse(md1.show.called);
  });

  test('Check that a context menu containing items is prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();

    md1.handleEvent(fakeContextMenuEvent);
    assert.isTrue(fakeContextMenuEvent.defaultPrevented);
  });

  test('Check that an empty context menu is not prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();

    md1.handleEvent(fakeEmptyContextMenuEvent);
    assert.isTrue(!fakeEmptyContextMenuEvent.defaultPrevented);
  });

  test('Check that a context menu without items is not prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();

    md1.handleEvent(fakeNoItemsContextMenuEvent);
    assert.isTrue(!fakeNoItemsContextMenuEvent.defaultPrevented);
  });

  test('System menu with invalid items is not prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();

    app1.isBrowser = function() {
      return true;
    };

    var fakeEvent = {
      type: 'mozbrowsercontextmenu',
      defaultPrevented: false,
      preventDefault: function() {
        this.defaultPrevented = true;
      },
      stopPropagation: function() {},
      detail: {
        contextmenu: {
          items: [],
          customized: false
        },
        systemTargets: [{
          nodeName: 'INPUT',
          data: {
            uri: 'http://fake.com'
          }
       }]
      }
    };
    md1.handleEvent(fakeEvent);
    MockNavigatorSettings.mReplyToRequests();
    assert.isFalse(fakeEvent.defaultPrevented);
  });


  test('Check that a system menu without items is prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();

    app1.isBrowser = function() {
      return true;
    };

    for (var i = 0; i < fakeSystemContextMenuEvents.length; i++) {
      var event = fakeSystemContextMenuEvents[i];
      md1.handleEvent(event);
      MockNavigatorSettings.mReplyToRequests();
      assert.isTrue(event.defaultPrevented);
    }
  });

  suite('Pinning the web', function() {
    var app1, md1;

    setup(function() {
      app1 = new AppWindow(fakeBrowserConfig);
      md1 = BaseModule.instantiate('BrowserContextMenu', app1);
      md1.start();
    });

    test('Shows pinning when clicking on the context button', function(done) {
      this.sinon.stub(md1.contextMenuView, 'show', function(items) {
        assert.isTrue(items[3].id === 'pin-to-home-screen');
        done();
      });
      var settingObj = {};
      settingObj[PINNING_PREF] = true;
      MockNavigatorSettings.mSet(settingObj);
      md1.showDefaultMenu();
      MockNavigatorSettings.mReplyToRequests();
    });

    test('Does not show pinning when longpressing link', function(done) {
      this.sinon.stub(md1.contextMenuView, 'show', function(items) {
        assert.isFalse(items[2].id === 'add-to-homescreen');
        assert.isFalse(items[2].id === 'pin-to-homescreen');
        done();
      });
      var settingObj = {};
      settingObj[PINNING_PREF] = true;
      MockNavigatorSettings.mSet(settingObj);
      md1.handleEvent(fakeSystemContextMenuEvents[0]);
      MockNavigatorSettings.mReplyToRequests();
    });
  });

  test('Check that an app with system menu is not prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();

    app1.isCertified = function() {
      return true;
    };

    for (var i = 0; i < fakeSystemContextMenuEvents.length; i++) {
      var event = fakeSystemContextMenuEvents[i];
      event.defaultPrevented = false;
      md1.handleEvent(event);
      assert.isFalse(event.defaultPrevented);
    }
  });

  test('newWindow() - private browser', function() {
    var app1 = new AppWindow(fakePrivateConfig);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();

    md1.newWindow('http://search.gaiamobile.org/manifest.webapp', true);

    var app = MockAppWindowHelper.mLatest;
    assert.equal(app.isPrivate, true);
  });

  test('bookmark/share buttons hidden in private browser', function(done) {
    var app1 = new AppWindow(fakePrivateConfig);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();
    var app2 = new AppWindow(fakeBrowserConfig);
    var md2 = BaseModule.instantiate('BrowserContextMenu', app2);
    md2.start();

    var md1ShowStub = this.sinon.stub(md1.contextMenuView, 'show');
    var md2ShowStub = this.sinon.stub(md2.contextMenuView, 'show');
    Promise.all([
      md1.showDefaultMenu(),
      md2.showDefaultMenu()
    ]).then(() => {
      MockNavigatorSettings.mReplyToRequests();
      var md1Items = md1ShowStub.getCall(0).args[0];
      var md2Items = md2ShowStub.getCall(0).args[0];
      // We should not show the bookmark or share buttons.
      assert.equal(md2Items.length - md1Items.length, 2);
      done();
    });
    MockNavigatorSettings.mReplyToRequests();
  });


  test('openUrl()', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();

    md1.openUrl('http://example.com');
    assert.equal(MozActivity.calls.length, 1);
    assert.equal(MozActivity.calls[0].name, 'view');
    assert.equal(MozActivity.calls[0].data.type, 'url');
    assert.equal(MozActivity.calls[0].data.url, 'http://example.com');
    assert.ok(!MozActivity.calls[0].data.isPrivate);
  });

  test('openUrl() - private browser', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();

    md1.openUrl('http://example.com', true);
    assert.equal(MozActivity.calls.length, 1);
    assert.equal(MozActivity.calls[0].name, 'view');
    assert.equal(MozActivity.calls[0].data.type, 'url');
    assert.equal(MozActivity.calls[0].data.isPrivate, true);
    assert.equal(MozActivity.calls[0].data.url, 'http://example.com');
  });

  test('focus context menu', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = BaseModule.instantiate('BrowserContextMenu', app1);
    md1.start();

    var focusStub = this.sinon.stub(md1.contextMenuView, 'focus');

    md1.focus();

    assert.isTrue(focusStub.called);

  });
});
