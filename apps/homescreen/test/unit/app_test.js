/* jshint nonew: false */
/* global MockNavigatormozApps, MockMozActivity, mockLocalStorage, HomeMetadata,
          Datastore, App */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('mocks/mock_localStorage.js');
require('mocks/mock_metadata.js');
require('mocks/mock_datastore.js');
require('/js/app.js');

suite('Homescreen app', () => {
  var sandbox;
  var realNavigatorMozApps;
  var realMozActivity;
  var realLocalStorage;
  var app;

  var realCreateElement;
  var createElementStub;
  var gaiaAppIconEl;

  var getIcon = manifestURL => {
    var container = document.createElement('div');
    var icon = document.createElement('div');
    icon.style.height = '100px';
    icon.style.width = '100px';
    icon.app = { manifestURL: manifestURL };
    icon.entryPoint = '';
    container.appendChild(icon);
    return container;
  };

  var stubCreateElement = () => {
    realCreateElement = document.createElement.bind(document);
    createElementStub = sinon.stub(document, 'createElement');
    createElementStub.withArgs('div').returns(realCreateElement('div'));
    gaiaAppIconEl = realCreateElement('div');
    gaiaAppIconEl.entryPoint = null;
    gaiaAppIconEl.app = null;
    gaiaAppIconEl.bookmark = null;
    gaiaAppIconEl.refresh = () => {};
    createElementStub.withArgs('gaia-app-icon').returns(gaiaAppIconEl);
  };

  var restoreCreateElement = () => {
    createElementStub.restore();
    gaiaAppIconEl = null;
  };

  setup(() => {
    sandbox = sinon.sandbox.create();
    realNavigatorMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
    realMozActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;

    MockMozActivity.mSetup();
    mockLocalStorage.mSetup();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => mockLocalStorage
    });

    loadBodyHTML('_index.html');
    document.head.innerHTML = `<meta name="theme-color" content="transparent">`;
    app = new App();
  });

  teardown(() => {
    sandbox.restore();
    navigator.mozApps = realNavigatorMozApps;
    window.MozActivity = realMozActivity;

    MockNavigatormozApps.mTeardown();
    MockMozActivity.mTeardown();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => realLocalStorage
    });

    // Remove all icons.
    while (app.icons.children.length) {
      app.icons.removeChild(app.icons.firstElementChild);
    }
    app = null;
  });

  suite('App constructor', () => {
    var stub;

    setup(() => {
      stubCreateElement();
    });

    teardown(() => {
      restoreCreateElement();
      MockNavigatormozApps.mApps = [];
      stub.restore();
    });

    test('should initialise the metadata store', done => {
      stub = sinon.stub(HomeMetadata.prototype, 'init', () => {
        done();
      });
      new App();
    });

    test('should initialise the bookmark stores', done => {
      stub = sinon.stub(Datastore.prototype, 'init', () => {
        done();
      });
      new App();
    });

    test('should get the list of installed apps', done => {
      stub = sinon.stub(MockNavigatormozApps.mgmt, 'getAll', () => {
        done();
      });
      new App();
    });

    test('should get the list of bookmarked pages', done => {
      stub = sinon.stub(Datastore.prototype, 'getAll', () => {
        done();
      });
      new App();
    });

    test('should remove unknown app entries from metadata store', done => {
      stub = sinon.stub(HomeMetadata.prototype, 'remove', id => {
        assert.equal(id, 'def/');
        metadataGetAllStub.restore();
        datastoreGetAllStub.restore();
        done();
      });
      var metadataGetAllStub = sinon.stub(HomeMetadata.prototype, 'getAll',
        () => {
          return Promise.resolve([
            { id: 'abc/', icon: 'abc', order: 0 },
            { id: 'def/', icon: 'def', order: 1 }
          ]);
        });
      var datastoreGetAllStub = sinon.stub(Datastore.prototype, 'getAll',
        () => {
          return Promise.resolve([
            { id: 'abc/', data: {} },
            { id: 'def/', data: {} }
          ]);
        });
      MockNavigatormozApps.mApps = [{
        id: 0,
        manifest: {},
        manifestURL: 'abc',
        order: 0,
        addEventListener: () => {}
      }];

      app = new App();
    });
  });

  suite('App#saveSettings()', () => {
    test('should restore data', () => {
      app.small = true;
      app.saveSettings();
      app.small = false;
      app.restoreSettings();

      assert.equal(app.small, true);
    });

    test('should not restore data if version number differs', () => {
      app.small = true;
      app.saveSettings();
      var tmp = JSON.parse(mockLocalStorage.mRawContent.settings);
      tmp.version = 'UnknownVersionNumber';
      mockLocalStorage.mRawContent.settings = JSON.stringify(tmp.settings);
      app.small = false;
      app.restoreSettings();

      assert.equal(app.small, false);
    });
  });

  suite('App#addApp()', () => {
    var addAppIconStub;

    setup(() => {
      addAppIconStub = sinon.stub(app, 'addAppIcon');
    });

    teardown(() => {
      addAppIconStub.restore();
    });

    test('should only accept valid apps', () => {
      app.addApp({});
      assert.isFalse(addAppIconStub.called, 'Empty app objects');

      app.addApp({ origin: 'app://privacy-panel.gaiamobile.org' });
      assert.isFalse(addAppIconStub.called, 'Blacklisted app');

      app.addApp({ manifest: {} });
      assert.isTrue(addAppIconStub.calledOnce);
    });

    test('should add all entry points', () => {
      app.addApp({ manifest: { entry_points: { a: {}, b: {}, c: {} } } });
      assert.isTrue(addAppIconStub.calledThrice);
    });

    test('should be called on app install', () => {
      var addAppStub = sinon.stub(app, 'addApp');
      app.handleEvent(new CustomEvent('install', {
        detail: {
          application: { manifest: {} }
        }
      }));
      assert.isTrue(addAppStub.calledOnce);
      addAppStub.restore();
    });
  });

  suite('App#addIconContainer()', () => {
    test('should return a HTML element with an order property', () => {
      app.startupMetadata = [{ order: 1 }];
      var container = app.addIconContainer(0);

      assert.isTrue(container instanceof HTMLDivElement);
      assert.isTrue(container instanceof HTMLElement);
      assert.isNumber(container.order);
    });

    test('should call snapScrollPositionSub() on first child', done => {
      var appendChildStub = sinon.stub(app.icons, 'appendChild', (el, cb) => {
        cb();
      });
      var snapScrollPositionStub = sinon.stub(app, 'snapScrollPosition', () => {
        assert.isTrue(appendChildStub.called);
        assert.isTrue(snapScrollPositionStub.called);
        appendChildStub.restore();
        snapScrollPositionStub.restore();
        done();
      });

      app.startupMetadata = [{ order: 1 }];
      app.addIconContainer(0);
    });

    test('should not call snapScrollPositionSub() if has children', done => {
      app.startupMetadata = [{ order: 1 }, { order: 2 }];
      assert.equal(app.icons.children.length, 0);
      app.addIconContainer(0);
      assert.equal(app.icons.children.length, 1);
      var appendChildSpy = sinon.spy(app.icons, 'appendChild');
      app.addIconContainer(1);

      setTimeout(() => {
        assert.isTrue(appendChildSpy.called);
        var spyCall = appendChildSpy.getCall(0);
        assert.isNull(spyCall.args[1]);
        appendChildSpy.restore();
        done();
      });
    });

    test('should insert a container in the right order', () => {
      app.startupMetadata = [{ order: 1 }, { order: 2 }, { order: 3 }];
      app.addIconContainer(0);
      app.addIconContainer(2);

      assert.equal(app.icons.children.length, 2);

      app.addIconContainer(1);

      assert.equal(app.icons.children.length, 3);
      assert.equal(app.icons.children[0].order, 1);
      assert.equal(app.icons.children[1].order, 2);
      assert.equal(app.icons.children[2].order, 3);
    });
  });

  suite('App#addAppIcon()', () => {
    var appIcon;

    setup(() => {
      appIcon = { manifestURL: {}, addEventListener: () => {} };
      stubCreateElement();
    });

    teardown(() => {
      restoreCreateElement();
    });

    test('should call refresh() on a gaia-app-icon element', () => {
      var refreshStub = sinon.stub(gaiaAppIconEl, 'refresh');
      app.addAppIcon(appIcon);
      assert.isTrue(refreshStub.called);
    });

    test('should set entry points', () => {
      app.addAppIcon(appIcon, { entryPoint1: {}, entryPoint2: {} });
      assert.isNotNull(gaiaAppIconEl.entryPoint);
    });

    test('should be an app', () => {
      app.addAppIcon(appIcon);
      assert.isNotNull(gaiaAppIconEl.app);
      assert.isNull(gaiaAppIconEl.bookmark);
    });

    test('should be a bookmark', () => {
      app.addAppIcon({});
      assert.isNull(gaiaAppIconEl.app);
      assert.isNotNull(gaiaAppIconEl.bookmark);
    });
  });

  suite('App#storeAppOrder()', () => {
    setup(() => {
      app.metadata.mSetup();
    });

    test('should persist apps in sorted order', () => {
      app.icons.appendChild(getIcon('abc'));
      app.icons.appendChild(getIcon('def'));
      app.icons.appendChild(getIcon('ghi'));
      app.storeAppOrder();
      assert.deepEqual(app.metadata._data, [
        { id: 'abc/', order: 0 },
        { id: 'def/', order: 1 },
        { id: 'ghi/', order: 2 }
      ]);
    });
  });

  suite('App#snapScrollPosition()', () => {
    test('should do nothing when there are no icons', () => {
      app.snapScrollPosition(0);
      assert.equal(app.scrollable.style.scrollSnapPointsY, '');
    });

    suite('with icons', () => {
      setup(() => {
        app.icons.appendChild(getIcon('abc'));
        sinon.stub(app.icons.firstElementChild,
          'getBoundingClientRect', () => {
            return { height: 100 };
          });
        app.scrollable = {
          clientHeight: 200,
          style: {},
          scrollTop: 0,
          scrollTo: () => {}
        };
      });

      test('should snap to 3 icon rows when the screen is 399px', () => {
        app.scrollable.clientHeight = 399;
        app.snapScrollPosition(0);
        assert.equal(app.scrollable.style.scrollSnapPointsY, 'repeat(300px)');
      });

      test('should snap to 4 icon rows when the screen is 400px', () => {
        app.scrollable.clientHeight = 400;
        app.snapScrollPosition(0);
        assert.equal(app.scrollable.style.scrollSnapPointsY, 'repeat(400px)');
      });

      test('should snap to 4 icon rows when the screen is 401px', () => {
        app.scrollable.clientHeight = 401;
        app.snapScrollPosition(0);
        assert.equal(app.scrollable.style.scrollSnapPointsY, 'repeat(400px)');
      });

      test('should scroll to snap if required', () => {
        var scrollToSy = sinon.spy(app.scrollable, 'scrollTo');
        app.scrollable.scrollTop = 0;
        app.snapScrollPosition(0);
        assert.isFalse(scrollToSy.called);

        app.scrollable.scrollTop = 50;
        app.snapScrollPosition(0);
        assert.isTrue(scrollToSy.called);
      });
    });
  });

  suite('App#showActionDialog()', () => {
    var clock;

    setup(function() {
      clock = sinon.useFakeTimers();
    });

    teardown(function() {
      clock.restore();
    });

    test('should attach events on click', () => {
      var dialog = app.settingsDialog;
      dialog.open = () => {};
      app.showActionDialog(dialog, null, [() => {}]);
      assert.ok(dialog.querySelector('button').onclick);
    });

    test('should set the title of the dialog', () => {
      var dialog = app.cancelDownload;
      dialog.open = () => {};
      assert.isFalse(dialog.querySelector('.body')
        .hasAttribute('data-l10n-args'));
      app.showActionDialog(dialog, 'abc', []);
      assert.isTrue(dialog.querySelector('.body')
        .hasAttribute('data-l10n-args'));
      clock.tick(10000); // Using a long number to avoid exporting the const.
    });

    test('should show the dialog after a little while', done => {
      var dialog = {
        style: { display: 'none' },
        getElementsByClassName: () => [],
        querySelector: () => {},
        open: () => {
          done();
        }
      };

      app.showActionDialog(dialog, null, []);
      clock.tick(10000);
    });
  });

  suite('App#handleEvent()', () => {
    var showActionDialogStub;

    suite('contextmenu', () => {
      setup(function() {
        showActionDialogStub = sinon.stub(app, 'showActionDialog',
          (dialog, args, callbacks) => {
            callbacks[0]();
          });
        app.settingsDialog = {
          open: () => {},
          close: () => {}
        };
      });

      teardown(function() {
        showActionDialogStub.restore();
      });

      test('should open a dialog', () => {
        app.handleEvent(new CustomEvent('contextmenu'));
        assert.isTrue(showActionDialogStub.called);
      });

      test('should attach a configure web activity to a button click', () => {
        app.handleEvent(new CustomEvent('contextmenu'));
        assert.isTrue(showActionDialogStub.called);
        assert.equal(MockMozActivity.calls.length, 1);
        assert.equal(MockMozActivity.calls[0].name, 'configure');
      });
    });

    suite('scroll', () => {
      test('should show and hide the drop shadow accordingly', () => {
        assert.isFalse(app.scrolled);
        app.scrollable = {
          scrollTop: 50
        };
        app.handleEvent(new CustomEvent('scroll'));
        assert.isTrue(app.scrolled);
        assert.isTrue(app.shadow.classList.contains('visible'));

        app.scrollable.scrollTop = 0;
        app.handleEvent(new CustomEvent('scroll'));
        assert.isFalse(app.scrolled);
        assert.isFalse(app.shadow.classList.contains('visible'));
      });
    });

    suite('activate', () => {
      test('unrecoverable app should be removed', () => {
        var uninstallStub = sinon.stub(MockNavigatormozApps.mgmt, 'uninstall');
        var icon = getIcon('abc');
        icon.firstElementChild.state = 'unrecoverable';
        app.handleEvent(new CustomEvent('activate',
          { detail: { target: icon } }));
        assert.isTrue(uninstallStub.called);
      });

      test('installing app should open a cancel download dialog', () => {
        var showActionDialogStub = sinon.stub(app, 'showActionDialog');
        var icon = getIcon('abc');
        icon.firstElementChild.state = 'installing';
        icon.firstElementChild.name = 'Name';
        app.handleEvent(new CustomEvent('activate',
          { detail: { target: icon } }));
        assert.isTrue(showActionDialogStub.called);
        var stubCall = showActionDialogStub.getCall(0);
        assert.equal(stubCall.args[0], app.cancelDownload);
      });

      suite('error and paused', () => {
        var showActionDialogStub;

        var testApp = state => {
          showActionDialogStub = sinon.stub(app, 'showActionDialog');
          var icon = getIcon('abc');
          icon.firstElementChild.state = state;
          icon.firstElementChild.name = 'Name';
          app.handleEvent(new CustomEvent('activate',
            { detail: { target: icon } }));
        };

        test('error app should open a resume download dialog', () => {
          testApp('error');
          assert.isTrue(showActionDialogStub.called);
          var stubCall = showActionDialogStub.getCall(0);
          assert.equal(stubCall.args[0], app.resumeDownload);
        });

        test('paused app should open a resume download dialog', () => {
          testApp('paused');
          assert.isTrue(showActionDialogStub.called);
          var stubCall = showActionDialogStub.getCall(0);
          assert.equal(stubCall.args[0], app.resumeDownload);
        });
      });

      suite('drag-finish', () => {
        test('auto-scroll timeout should be cancelled', () => {
          var clearTimeoutStub = sinon.stub(window, 'clearTimeout');
          app.autoScrollTimeout = 'abc';
          app.handleEvent(new CustomEvent('drag-finish'));
          clearTimeoutStub.restore();

          assert.isTrue(clearTimeoutStub.calledWith('abc'));
          assert.equal(app.autoScrollTimeout, null);
        });
      });

      test('app with default state should be launched', done => {
        var icon = getIcon('abc');
        icon.firstElementChild.state = 'unknownState';
        icon.firstElementChild.name = 'Name';
        icon.firstElementChild.launch = () => {
          done();
        };
        app.handleEvent(new CustomEvent('activate',
          { detail: { target: icon } }));
      });
    });
  });

  suite('install', () => {
    test('newly installed apps should be added to the homescreen', done => {
      var addAppStub = sinon.stub(app, 'addApp', () => {
        addAppStub.restore();
        done();
      });
      app.handleEvent(new CustomEvent('install',
        { detail: { application: {} } }));
    });
  });

  suite('hashchange', () => {
    test('should scroll to the top of the page', done => {
      app.scrollable = {
        scrollTo: (obj) => {
          assert.equal(obj.top, 0);
          assert.equal(obj.left, 0);
          done();
        }
      };
      app.handleEvent(new CustomEvent('hashchange'));
    });
  });
});
