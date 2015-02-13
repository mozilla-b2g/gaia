/*global MocksHelper, MockL10n, AppWindow, BrowserContextMenu,
  MockMozActivity, MozActivity, MockAppWindowHelper, Browser */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_icons_helper.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_app_window.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/js/browser_config_helper.js');
require('/js/browser.js');

var mocksForAppModalDialog = new MocksHelper([
  'AppWindow', 'MozActivity', 'LazyLoader', 'IconsHelper'
]).init();

suite('system/BrowserContextMenu', function() {
  var stubById, realL10n, stubQuerySelector, realMozActivity;
  mocksForAppModalDialog.attachTestHelpers();
  setup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

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

    requireApp('system/js/service.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/browser_context_menu.js', done);
    realMozActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;
    MozActivity.mSetup();
    window.browser = new Browser();
    window.browser.start();
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
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
        }]
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
          items: []
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
        items: []
      }
    }
  };

  test('New', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new BrowserContextMenu(app1);
    assert.isDefined(md1.instanceID);
  });

  test('launch menu', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new BrowserContextMenu(app1);
    this.sinon.stub(app1, 'blur');
    var stubStopPropagation =
      this.sinon.stub(fakeContextMenuEvent, 'stopPropagation');

    md1.handleEvent(fakeContextMenuEvent);
    assert.isTrue(app1.blur.called);
    assert.isTrue(stubStopPropagation.called);
    assert.isTrue(md1.element.classList.contains('visible'));
    assert.equal(
      md1.elements.list.querySelector('button:first-child').textContent,
      fakeContextMenuEvent.detail.contextmenu.items[0].label);
    assert.equal(
      md1.elements.list.querySelector('button:first-child').
        style.backgroundImage,
      'url("' + fakeContextMenuEvent.detail.contextmenu.items[0].icon + '")');
  });

  suite('manually launch menu', function() {
    var md1;

    setup(function(done) {
      var app1 = new AppWindow(fakeAppConfig1);
      md1 = new BrowserContextMenu(app1);
      md1.showDefaultMenu().then(function() {
        done();
      });
    });

    test('Conext Menu is shown', function() {
      assert.isTrue(md1.isShown());
    });

    test('Conext Menu is not shown', function() {
      md1.hide();
      assert.isFalse(md1.isShown());
    });
  });

  test('Check that a context menu containing items is prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new BrowserContextMenu(app1);

    md1.handleEvent(fakeContextMenuEvent);
    assert.isTrue(fakeContextMenuEvent.defaultPrevented);
  });

  test('Check that an empty context menu is not prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new BrowserContextMenu(app1);

    md1.handleEvent(fakeEmptyContextMenuEvent);
    assert.isTrue(!fakeEmptyContextMenuEvent.defaultPrevented);
  });

  test('Check that a context menu without items is not prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new BrowserContextMenu(app1);

    md1.handleEvent(fakeNoItemsContextMenuEvent);
    assert.isTrue(!fakeNoItemsContextMenuEvent.defaultPrevented);
  });


  test('Check that a system menu without items is prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new BrowserContextMenu(app1);

    app1.isBrowser = function() {
      return true;
    };

    for (var i = 0; i < fakeSystemContextMenuEvents.length; i++) {
      var event = fakeSystemContextMenuEvents[i];
      md1.handleEvent(event);
      assert.isTrue(event.defaultPrevented);
    }
  });


  test('Check that an app with system menu is not prevented', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new BrowserContextMenu(app1);

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
    var md1 = new BrowserContextMenu(app1);
    md1.newWindow('http://search.gaiamobile.org/manifest.webapp', true);

    var app = MockAppWindowHelper.mLatest;
    assert.equal(app.isPrivate, true);
  });

  test('openUrl()', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new BrowserContextMenu(app1);
    md1.openUrl('http://example.com');
    assert.equal(MozActivity.calls.length, 1);
    assert.equal(MozActivity.calls[0].name, 'view');
    assert.equal(MozActivity.calls[0].data.type, 'url');
    assert.equal(MozActivity.calls[0].data.url, 'http://example.com');
    assert.ok(!MozActivity.calls[0].data.isPrivate);
  });

  test('openUrl() - private browser', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var md1 = new BrowserContextMenu(app1);
    md1.openUrl('http://example.com', true);
    assert.equal(MozActivity.calls.length, 1);
    assert.equal(MozActivity.calls[0].name, 'view');
    assert.equal(MozActivity.calls[0].data.type, 'url');
    assert.equal(MozActivity.calls[0].data.isPrivate, true);
    assert.equal(MozActivity.calls[0].data.url, 'http://example.com');
  });
});
