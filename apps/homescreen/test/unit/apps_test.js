/* jshint nonew: false */
/* global MockNavigatormozApps, MockMozActivity, MockIconsHelper, IconsHelper,
          AppsMetadata, Datastore, Settings, Apps */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_icons_helper.js');
require('mocks/mock_appsmetadata.js');
require('mocks/mock_datastore.js');
require('mocks/mock_settings.js');
require('/shared/js/l10n.js');
require('/js/apps.js');

suite('Homescreen app', () => {
  var sandbox;
  var realNavigatorMozApps;
  var realMozActivity;
  var realLocalStorage;
  var realIconsHelper;
  var app;

  var realCreateElement;
  var createElementStub;
  var gaiaAppIconEl;

  realCreateElement = document.createElement.bind(document);

  var getIcon = manifestURL => {
    var iconChild = document.createElement('div');
    iconChild.style.height = '100px';
    iconChild.style.width = '100px';
    var icon = document.createElement('div');
    icon.style.display = 'block';
    icon.app = { manifestURL: manifestURL };
    icon.entryPoint = '';
    icon.bookmark = null;
    icon.icon = null;
    icon.size = 100;
    icon.launch = () => {};
    icon.appendChild(iconChild);
    var container = document.createElement('div');
    container.appendChild(icon);
    return container;
  };

  var getGroup = () => {
    var group = document.createElement('div');
    Object.defineProperty(group, 'localName', {
      value: 'homescreen-group',
      configurable: true
    });
    group.expand = () => {};
    group.collapse = () => {};
    group.container = document.createElement('div');
    Object.defineProperty(group.container, 'localName', {
      value: 'gaia-container',
      configurable: true
    });
    var container = document.createElement('div');
    container.appendChild(group);
    return container;
  };

  var fakeIconParent = icon => {
    Object.defineProperty(icon, 'parentNode', {
      configurable: true,
      get: () => { return { parentNode: app.container }; }
    });
  };

  var stubCreateElement = () => {
    realCreateElement = document.createElement.bind(document);
    createElementStub = sinon.stub(document, 'createElement');
    createElementStub.withArgs('div').returns(realCreateElement('div'));
    var iconChild = realCreateElement('div');
    gaiaAppIconEl = realCreateElement('div');
    gaiaAppIconEl.app = null;
    gaiaAppIconEl.entryPoint = null;
    gaiaAppIconEl.bookmark = null;
    gaiaAppIconEl.icon = null;
    gaiaAppIconEl.refresh = () => {};
    gaiaAppIconEl.updateName = () => {};
    gaiaAppIconEl.appendChild(iconChild);
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
    realIconsHelper = window.IconsHelper;
    window.IconsHelper = MockIconsHelper;

    loadBodyHTML('_index.html');
    document.head.innerHTML = `<meta name="theme-color" content="transparent">`;
    for (var dialog of document.querySelectorAll('.dialog')) {
      dialog.hide = function() {
        this.style.display = 'none';
      };
    }
    var icons = document.getElementById('apps');
    icons.freeze = icons.thaw = () => {};
    icons.getChildOffsetRect = child => {
      return {
        top: child.offsetTop,
        right: child.offsetLeft + child.offsetWidth,
        bottom: child.offsetTop + child.offsetHeight,
        left: child.offsetLeft,
        width: child.offsetWidth,
        height: child.offsetHeight
      };
    };
    icons.getChildFromPoint = () => null;
    app = new Apps();
  });

  teardown(() => {
    sandbox.restore();
    navigator.mozApps = realNavigatorMozApps;
    window.MozActivity = realMozActivity;
    window.IconsHelper = realIconsHelper;

    MockNavigatormozApps.mTeardown();

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

    test('should call freeze and thaw on icon container', done => {
      stub = sinon.stub(app.icons, 'freeze', () => {
        stub.restore();
        stub = sinon.stub(app.icons, 'thaw', () => {
          stub.restore();
          done();
        });
      });
      new Apps();
    });

    test('should initialise the metadata store', done => {
      stub = sinon.stub(AppsMetadata.prototype, 'init', () => {
        done();
        return Promise.resolve();
      });
      new Apps();
    });

    test('should initialise the bookmark stores', done => {
      stub = sinon.stub(Datastore.prototype, 'init', () => {
        done();
        return Promise.resolve();
      });
      new Apps();
    });

    test('should get the list of installed apps', done => {
      stub = sinon.stub(MockNavigatormozApps.mgmt, 'getAll', () => {
        done();
        return Promise.resolve();
      });
      new Apps();
    });

    test('should get the list of bookmarked pages', done => {
      stub = sinon.stub(Datastore.prototype, 'getAll', () => {
        done();
        return Promise.resolve();
      });
      new Apps();
    });

    test('should remove unknown app entries from metadata store', done => {
      stub = sinon.stub(AppsMetadata.prototype, 'remove', id => {
        metadataGetAllStub.restore();
        done(() => {
          assert.equal(id, 'def/');
        });
        return Promise.resolve();
      });
      var metadataGetAllStub = sinon.stub(AppsMetadata.prototype, 'getAll',
        callback => {
          var results = [
            { id: 'abc/', icon: 'abc', order: 0, group: '' },
            { id: 'def/', icon: 'def', order: 1, group: '' }
          ];
          for (var result of results) {
            callback(result);
          }
          return Promise.resolve(results);
        });
      MockNavigatormozApps.mApps = [{
        manifest: {},
        manifestURL: 'abc',
        order: 0,
        addEventListener: () => {}
      }];

      app = new Apps();
    });

    test('should add pending apps that were missed during startup', done => {
      var metadataGetAllStub = sinon.stub(AppsMetadata.prototype, 'getAll',
        callback => {
          var results = [
            { id: 'abc/', icon: 'abc', order: 0, group: '' },
          ];
          for (var result of results) {
            callback(result);
          }

          stub = sinon.stub(app, 'addAppIcon', icon => {
            metadataGetAllStub.restore();
            done(() => {
              assert.equal(icon, results[0]);
            });
          });
          app.pendingIcons[results[0].id] = [results[0]];

          return Promise.resolve(results);
        });

      app = new Apps();
    });

    suite('first run', () => {
      setup(() => {
        window.LazyLoader = {
          load: (files, callback) => {
            callback();
          }
        };

        window.FirstRun = () => {
          return Promise.resolve({ order: [], small: false });
        };

        Settings.firstRun = true;
      });

      teardown(() => {
        Settings.firstRun = false;
      });

      test('should initialise the bookmark stores', done => {
        stub = sinon.stub(Datastore.prototype, 'init', () => {
          done();
          return Promise.resolve();
        });
        new Apps();
      });

      test('should get the list of installed apps', done => {
        stub = sinon.stub(MockNavigatormozApps.mgmt, 'getAll', () => {
          done();
          return Promise.resolve();
        });
        new Apps();
      });

      test('should get the list of bookmarked pages', done => {
        stub = sinon.stub(Datastore.prototype, 'getAll', () => {
          done();
          return Promise.resolve();
        });
        new Apps();
      });
    });
  });

  suite('App#attachInputHandlers', () => {
    var realContainer;

    function createDummyContainer() {
      return {
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    }

    setup(() => {
      realContainer = app.container;
      app.container = null;
    });

    teardown(() => {
      app.container = realContainer;
    });

    test('should set container', () => {
      var container = createDummyContainer();
      app.attachInputHandlers(container);
      assert.equal(app.container, container);
    });

    test('should attach to gaia-container events', () => {
      var container = createDummyContainer();
      var attachSpy = sinon.spy(container, 'addEventListener');
      app.attachInputHandlers(container);

      assert.isTrue(attachSpy.calledWith('activate'));
      assert.isTrue(attachSpy.calledWith('drag-start'));
      assert.isTrue(attachSpy.calledWith('drag-move'));
      assert.isTrue(attachSpy.calledWith('drag-end'));
      assert.isTrue(attachSpy.calledWith('drag-rearrange'));
      assert.isTrue(attachSpy.calledWith('drag-finish'));
    });

    test('should detach old container', () => {
      app.container = createDummyContainer();
      var detachSpy = sinon.spy(app.container, 'removeEventListener');
      app.attachInputHandlers(createDummyContainer());

      assert.isTrue(detachSpy.calledWith('activate'));
      assert.isTrue(detachSpy.calledWith('drag-start'));
      assert.isTrue(detachSpy.calledWith('drag-move'));
      assert.isTrue(detachSpy.calledWith('drag-end'));
      assert.isTrue(detachSpy.calledWith('drag-rearrange'));
      assert.isTrue(detachSpy.calledWith('drag-finish'));
    });
  });

  suite('App#iconSize', () => {
    var size;

    setup(() => {
      app._iconSize = 0;
      app.settings.small = false;
      size = Math.round((app.icons.clientWidth - 12) / 3 - 16);
    });

    test('should be a third of grid width, minus padding', () => {
      assert.equal(app.iconSize, size);
    });

    test('should recalculate when cleared', () => {
      assert.equal(app.iconSize, size);
      assert.equal(app._iconSize, size);
      app._iconSize = 0;
      assert.equal(app.iconSize, size);
      assert.equal(app._iconSize, size);
    });
  });

  suite('App#iterateIcons()', () => {
    var realIcons, fakeIcons;

    function addFakeIcon(group) {
      var fakeIcon = {
        firstElementChild: {
          localName: 'gaia-app-icon'
        }
      };
      if (group) {
        group.firstElementChild.container.children.push(fakeIcon);
      } else {
        fakeIcons.children.push(fakeIcon);
      }
      return fakeIcon;
    }

    function addFakeGroup() {
      var fakeGroup = {
        firstElementChild: {
          localName: 'homescreen-group',
          container: {
            children: []
          }
        }
      };
      fakeIcons.children.push(fakeGroup);
      return fakeGroup;
    }

    setup(() => {
      realIcons = app.icons;
      app.icons = fakeIcons = { children: [] };
    });

    teardown(() => {
      app.icons = realIcons;
    });

    test('should iterate over icons', () => {
      addFakeIcon();
      addFakeIcon();
      var calls = 0;
      app.iterateIcons((icon, container, parent) => {
        assert.equal(container, fakeIcons.children[calls]);
        assert.equal(icon, fakeIcons.children[calls].firstElementChild);
        assert.equal(parent, fakeIcons);
        calls ++;
      });
      assert.equal(calls, 2);
    });

    test('should iterate over icons in groups', () => {
      var group = addFakeGroup();
      addFakeIcon(group);
      addFakeIcon(group);
      addFakeIcon();
      var calls = 0;
      var groupContainer = group.firstElementChild.container;
      app.iterateIcons((icon, container, parent) => {
        if (calls < 2) {
          assert.equal(container, groupContainer.children[calls]);
          assert.equal(icon, groupContainer.children[calls].firstElementChild);
          assert.equal(parent, groupContainer);
        }
        calls ++;
      });
      assert.equal(calls, 3);
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

      app.addApp({ manifest: {} });
      assert.isTrue(addAppIconStub.calledOnce);
    });

    test('should add all entry points', () => {
      app.addApp({ manifest: { entry_points: { a: {}, b: {}, c: {} } } });
      assert.isTrue(addAppIconStub.calledThrice);
    });

    test('should be called on app install', () => {
      var addAppStub = sinon.stub(app, 'addApp');
      app.handleEvent(new CustomEvent('install'));
      assert.isTrue(addAppStub.calledOnce);
      addAppStub.restore();
    });

    test('should not be called when installing a pre-existing app', () => {
      var refreshCalled = false;
      Object.defineProperty(app.icons, 'children', {
        value: [{
          firstElementChild: {
            app: {
              manifestURL: 'abc'
            },
            refresh: () => {
              refreshCalled = true;
            }
          }
        }],
        configurable: true
      });

      var addAppStub = sinon.stub(app, 'addApp');
      app.handleEvent({
        type: 'install',
        application: { manifestURL: 'abc' }
      });

      assert.isFalse(addAppStub.called);
      assert.isTrue(refreshCalled);

      addAppStub.restore();
      delete app.icons.children;
    });
  });

  suite('App#addIconContainer()', () => {
    var refreshGridSizeStub, iconAddedSpy;
    setup(() => {
      refreshGridSizeStub = sinon.stub(app, 'refreshGridSize');
      iconAddedSpy = sinon.spy(app, 'iconAdded');
    });

    teardown(() => {
      refreshGridSizeStub.restore();
      iconAddedSpy.restore();
    });

    suite('element properties', () => {
      var appendChildStub, childIsVisible;
      setup(() => {
        childIsVisible = true;
        appendChildStub = sinon.stub(app.icons, 'appendChild', (el, cb) => {
          if (!childIsVisible) {
            el.style.display = 'none';
          }
          if (cb) {
            cb();
          }
        });
      });

      teardown(() => {
        appendChildStub.restore();
      });

      test('should return a HTML element with an order property', () => {
        app.startupMetadata = [{ order: 1 }];
        var container =
          app.addIconContainer(document.createElement('div'), 0, app.icons);

        assert.isTrue(container instanceof HTMLDivElement);
        assert.isNumber(container.order);
      });

      test('should name icon and group containers accordingly', () => {
        var iconDiv = document.createElement('div');
        var container = app.addIconContainer(iconDiv, -1, app.icons);
        assert.isTrue(container.classList.contains('icon-container'));

        var groupDiv = document.createElement('div');
        Object.defineProperty(groupDiv, 'localName', {
          value: 'homescreen-group',
          configurable: true
        });
        container = app.addIconContainer(groupDiv, -1, app.icons);
        assert.isTrue(container.classList.contains('group-container'));
      });

      test('should call iconAdded() when adding children', () => {
        app.addIconContainer(document.createElement('div'), -1, app.icons);
        app.addIconContainer(document.createElement('div'), -1, app.icons);

        assert.isTrue(appendChildStub.calledTwice);
        assert.isTrue(iconAddedSpy.calledTwice);
      });

      test('should call refreshGridSize() when adding visible children', () => {
        app.addIconContainer(document.createElement('div'), -1, app.icons);

        assert.isTrue(appendChildStub.called);
        assert.isTrue(refreshGridSizeStub.called);
      });

      test('should not call refreshGridSize() when adding ' +
           'invisible children', () => {
        childIsVisible = false;
        app.addIconContainer(document.createElement('div'), -1, app.icons);
        assert.isFalse(refreshGridSizeStub.called);
      });
    });

    test('should insert a container in the right order', () => {
      app.startupMetadata = [{ order: 1 }, { order: 2 }, { order: 3 }];
      app.addIconContainer(document.createElement('div'), 0, app.icons);
      app.addIconContainer(document.createElement('div'), 2, app.icons);

      assert.equal(app.icons.children.length, 2);

      app.addIconContainer(document.createElement('div'), 1, app.icons);

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
      app.addAppIcon({ id: 'abc', manifestURL: 'def' });
      assert.isNull(gaiaAppIconEl.app);
      assert.isNotNull(gaiaAppIconEl.bookmark);
    });

    test('should set the best icon according to the size available', () => {
      var getIconBlobSpy = sinon.spy(IconsHelper, 'setElementIcon');
      app.addAppIcon({ id: 'abc', addEventListener: () => {} });
      assert.isTrue(getIconBlobSpy.called);
      getIconBlobSpy.restore();
    });

    test('icon activated signal should be forwarded', () => {
      var event;
      var handleEventStub = sinon.stub(app, 'handleEvent', e => { event = e; });
      app.addAppIcon({ id: 'abc', manifestURL: 'def' });
      gaiaAppIconEl.dispatchEvent(new CustomEvent('activated'));

      assert.isTrue(handleEventStub.called);
      assert.equal(event.type, 'activate');
      handleEventStub.restore();
    });
  });

  suite('App#refreshIcon()', () => {
    var mockAppIcon, mockBookmarkIcon;
    setup(() => {
      mockAppIcon = { refresh: () => {} };
      mockBookmarkIcon = { bookmark: {}, refresh: () => {} };
    });

    test('sets icon size', () => {
      app._iconSize = 10;
      app.refreshIcon(mockAppIcon);
      assert.equal(mockAppIcon.size, 10);
    });

    test('calls refresh() on app icons', () => {
      var refreshStub = sinon.stub(mockAppIcon, 'refresh');
      app.refreshIcon(mockAppIcon);
      assert.isTrue(refreshStub.calledOnce);
    });

    test('calls IconsHelper.setElementIcon() on bookmark icons', () => {
      var setElementIconStub = sinon.stub(MockIconsHelper, 'setElementIcon',
                                          Promise.resolve.bind(Promise));
      app.refreshIcon(mockBookmarkIcon);
      assert.isTrue(setElementIconStub.calledOnce);
      setElementIconStub.restore();
    });

    test('calls refresh if setElementIcon() Promise rejects', done => {
      var setElementIconStub = sinon.stub(MockIconsHelper, 'setElementIcon',
                                          Promise.reject.bind(Promise));
      sinon.stub(mockBookmarkIcon, 'refresh', () => {
        setElementIconStub.restore();
        done();
      });
      app.refreshIcon(mockBookmarkIcon);
    });
  });

  suite('App#storeAppOrder()', () => {
    var clock;

    setup(() => {
      app.metadata.mSetup();
      clock = sinon.useFakeTimers();
    });

    teardown(() => {
      clock.restore();
    });

    test('should persist apps in sorted order', () => {
      app.icons.appendChild(getIcon('abc'));
      app.icons.appendChild(getIcon('def'));
      app.icons.appendChild(getIcon('ghi'));
      app.storeAppOrder();
      clock.tick(1000);
      assert.deepEqual(app.metadata._data, [
        { id: 'abc/', order: 0, group: '' },
        { id: 'def/', order: 1, group: '' },
        { id: 'ghi/', order: 2, group: '' }
      ]);
    });

    test('should persist group information', () => {
      var group = getGroup();
      group.firstElementChild.container.appendChild(getIcon('abc'));
      group.firstElementChild.container.appendChild(getIcon('def'));
      app.icons.appendChild(group);
      app.icons.appendChild(getIcon('ghi'));
      app.storeAppOrder();
      clock.tick(1000);
      assert.deepEqual(app.metadata._data, [
        { id: 'abc/', order: 0, group: 'abc/' },
        { id: 'def/', order: 1, group: 'abc/' },
        { id: 'ghi/', order: 2, group: '' }
      ]);
    });

    test('should coalesce multiple calls', () => {
      var setMetadataStub = sinon.stub(app.metadata, 'set', () => {
        return Promise.resolve();
      });
      app.storeAppOrder();
      app.storeAppOrder();
      app.storeAppOrder();
      clock.tick(1000);
      assert.isTrue(setMetadataStub.calledOnce);
      setMetadataStub.restore();
    });
  });

  suite('App#refreshGridSize()', () => {
    var realScrollable;
    setup(() => {
      realScrollable = app.scrollable;
      app.scrollable = {
        clientHeight: 200,
        style: {}
      };
    });

    teardown(() => {
      app.scrollable = realScrollable;
    });

    suite('without icons', () => {
      var realIcons;
      setup(() => {
        realIcons = app.icons;
        app.icons = {
          children: [],
          style: {}
        };
      });

      teardown(() => {
        app.icons = realIcons;
      });

      test('should reset snap points when there are no icons', () => {
        app.refreshGridSize();
        assert.equal(app.scrollable.style.scrollSnapPointsY, 'repeat(200px)');
        assert.equal(app.icons.style.backgroundSize, '100% 400px');
      });
    });

    suite('with icons', () => {
      var getBoundingClientRectStub;
      setup(() => {
        app.icons.appendChild(getIcon('abc'));
        app.icons.appendChild(getIcon('def'));
        app.icons.appendChild(getIcon('ghi'));
        app.icons.appendChild(getIcon('jkl'));
        getBoundingClientRectStub = sinon.stub(app.icons.firstElementChild,
          'getBoundingClientRect', () => {
            return { height: 100 };
          });
      });

      teardown(() => {
        getBoundingClientRectStub.restore();
      });

      test('should snap to 3 icon rows when the screen is 399px', () => {
        app.scrollable.clientHeight = 399;
        app.refreshGridSize();
        assert.equal(app.scrollable.style.scrollSnapPointsY, 'repeat(300px)');
        assert.equal(app.icons.style.backgroundSize, '100% 600px');
      });

      test('should snap to 4 icon rows when the screen is 400px', () => {
        app.scrollable.clientHeight = 400;
        app.refreshGridSize();
        assert.equal(app.scrollable.style.scrollSnapPointsY, 'repeat(400px)');
        assert.equal(app.icons.style.backgroundSize, '100% 800px');
      });

      test('should snap to 4 icon rows when the screen is 401px', () => {
        app.scrollable.clientHeight = 401;
        app.refreshGridSize();
        assert.equal(app.scrollable.style.scrollSnapPointsY, 'repeat(400px)');
        assert.equal(app.icons.style.backgroundSize, '100% 800px');
      });

      test('should size to always have a whole page visible', () => {
        app.scrollable.clientHeight = 150;
        app.settings.scrollSnapping = true;
        app.refreshGridSize();
        assert.equal(app.pendingGridHeight, 250);
      });

      test('should size to one extra row with snapping disabled', () => {
        app.scrollable.clientHeight = 150;
        app.settings.scrollSnapping = false;
        app.refreshGridSize();
        assert.equal(app.pendingGridHeight, 300);
      });
    });
  });

  suite('App#snapScrollPosition()', () => {
    var realScrollable, scrollToSpy;
    setup(() => {
      realScrollable = app.scrollable;
      app.scrollable = {
        clientHeight: 100,
        scrollTop: 0,
        style: {},
        scrollTo: () => {}
      };
      scrollToSpy = sinon.spy(app.scrollable, 'scrollTo');
      app.settings.scrollSnapping = true;
    });

    teardown(() => {
      app.settings.scrollSnapping = false;
      app.scrollable = realScrollable;
    });

    test('should do nothing if already aligned', () => {
      app.pendingGridHeight = 500;
      app.pageHeight = 100;

      app.scrollable.scrollTop = 0;
      app.snapScrollPosition();
      assert.isFalse(scrollToSpy.called);

      app.scrollable.scrollTop = 100;
      app.snapScrollPosition();
      assert.isFalse(scrollToSpy.called);
    });

    test('should do nothing if nearly aligned', () => {
      app.pendingGridHeight = 500;
      app.pageHeight = 100;
      app.scrollable.scrollTop = 101;

      app.snapScrollPosition();
      assert.isFalse(scrollToSpy.called);
    });

    test('should remove overflow and scroll to nearest snap point', () => {
      app.pendingGridHeight = 500;
      app.pageHeight = 100;
      app.scrollable.scrollTop = 10;

      app.snapScrollPosition();
      assert.equal(app.scrollable.style.overflow, '');
      assert.isTrue(scrollToSpy.calledWith(
                      { left: 0, top: 0, behavior: 'smooth' }));
    });

    test('should do nothing if snapping disabled', () => {
      app.settings.scrollSnapping = false;
      app.pendingGridHeight = 500;
      app.pageHeight = 100;
      app.scrollable.scrollTop = 10;

      app.snapScrollPosition();
      assert.isFalse(scrollToSpy.called);
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
      var dialog = app.dialogs[0];
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

  suite('App#removeSelectedIcon()', () => {
    var uninstallStub, clock;
    setup(() => {
      MockMozActivity.mSetup();
      uninstallStub = sinon.stub(navigator.mozApps.mgmt, 'uninstall');
      clock = sinon.useFakeTimers();
    });

    teardown(() => {
      MockMozActivity.mTeardown();
      uninstallStub.restore();
      clock.restore();
    });

    test('does nothing with no selected icon', () => {
      app.selectedIcon = null;
      app.removeSelectedIcon();
      assert.isFalse(uninstallStub.called);
      assert.equal(MockMozActivity.calls.length, 0);
    });

    test('does nothing for unremovable apps', () => {
      app.selectedIcon = { app: { removable: false } };
      app.removeSelectedIcon();
      assert.isFalse(uninstallStub.called);
    });

    test('uninstalls app icons', () => {
      app.selectedIcon = { app: { removable: true } };
      app.removeSelectedIcon();
      assert.isTrue(uninstallStub.calledWith(app.selectedIcon.app));
    });

    test('removes bookmark icons', () => {
      app.selectedIcon = { bookmark: { id: 'abc' } };
      app.removeSelectedIcon();
      assert.equal(MockMozActivity.calls.length, 1);
      assert.equal(MockMozActivity.calls[0].name, 'remove-bookmark');
      assert.equal(MockMozActivity.calls[0].data.type, 'url');
      assert.equal(MockMozActivity.calls[0].data.url,
                   app.selectedIcon.bookmark.id);
    });

    test('re-enters edit mode when removing bookmarks', () => {
      var enterEditModeStub = sinon.stub(app, 'enterEditMode');
      app.selectedIcon = { bookmark: { id: 'abc' } };
      app.removeSelectedIcon();

      MockMozActivity.mTriggerOnError();
      assert.isTrue(enterEditModeStub.calledWith(app.selectedIcon));

      clock.tick(50);
      assert.isTrue(enterEditModeStub.calledWith(null));
    });
  });

  suite('App#renameSelectedIcon()', () => {
    var clock;
    setup(() => {
      MockMozActivity.mSetup();
      clock = sinon.useFakeTimers();
    });

    teardown(() => {
      MockMozActivity.mTeardown();
      clock.restore();
    });

    test('does nothing with no selected icon', () => {
      app.selectedIcon = null;
      app.renameSelectedIcon();
      assert.equal(MockMozActivity.calls.length, 0);
    });

    test('does nothing with no bookmark icon selected', () => {
      app.selectedIcon = { app: {} };
      app.renameSelectedIcon();
      assert.equal(MockMozActivity.calls.length, 0);
    });

    test('edits bookmark icons', () => {
      app.selectedIcon = { bookmark: { id: 'abc' } };
      app.renameSelectedIcon();
      assert.equal(MockMozActivity.calls.length, 1);
      assert.equal(MockMozActivity.calls[0].name, 'save-bookmark');
      assert.equal(MockMozActivity.calls[0].data.type, 'url');
      assert.equal(MockMozActivity.calls[0].data.url,
                   app.selectedIcon.bookmark.id);
    });

    test('re-enters edit mode', () => {
      var enterEditModeStub = sinon.stub(app, 'enterEditMode');
      app.selectedIcon = { bookmark: { id: 'abc' } };
      app.renameSelectedIcon();

      MockMozActivity.mTriggerOnError();
      assert.isTrue(enterEditModeStub.calledWith(app.selectedIcon));

      clock.tick(50);
      assert.isTrue(enterEditModeStub.calledWith(app.selectedIcon));
    });
  });

  suite('App#iconIsEditable()', () => {
    var icon;
    test('bookmark icons are editable', () => {
      icon = { bookmark: {} };
      assert.isTrue(app.iconIsEditable(icon));
    });

    test('removable app icons are editable', () => {
      icon = { app: { removable: true } };
      assert.isTrue(app.iconIsEditable(icon));
    });

    test('unremovable app icons are not editable', () => {
      icon = { app: { removable: false } };
      assert.isFalse(app.iconIsEditable(icon));
    });
  });

  suite('App#updateSelectedIcon()', () => {
    var icon;
    setup(() => {
      icon = document.createElement('div');
    });

    test('selects bookmark icons', () => {
      icon.bookmark = {};
      app.selectedIcon = null;
      app.updateSelectedIcon(icon);
      assert.equal(app.selectedIcon, icon);
      assert.isTrue(icon.classList.contains('selected'));
      assert.isTrue(app.remove.classList.contains('active'));
      assert.isTrue(app.rename.classList.contains('active'));
    });

    test('selects removable app icons', () => {
      icon.app = { removable: true };
      app.selectedIcon = null;
      app.updateSelectedIcon(icon);
      assert.equal(app.selectedIcon, icon);
      assert.isTrue(icon.classList.contains('selected'));
      assert.isTrue(app.remove.classList.contains('active'));
      assert.isFalse(app.rename.classList.contains('active'));
    });

    test('deselects old selected icon', () => {
      icon.bookmark = {};
      var oldIcon = document.createElement('div');
      app.selectedIcon = oldIcon;
      app.selectedIcon.classList.add('selected');
      app.updateSelectedIcon(icon);
      assert.isFalse(oldIcon.classList.contains('selected'));
    });

    test('marks unremovable apps as un-editable', () => {
      icon.app = { removable: false };
      app.selectedIcon = null;
      app.updateSelectedIcon(icon);
      assert.notEqual(app.selectedIcon, icon);
      assert.isFalse(icon.classList.contains('selected'));
      assert.isTrue(icon.classList.contains('uneditable'));
    });
  });

  suite('App#enterEditMode()', () => {
    var updateSelectedIconSpy, mockIcon;

    setup(() => {
      mockIcon = document.createElement('div');
      mockIcon.bookmark = {};

      updateSelectedIconSpy = sinon.spy(app, 'updateSelectedIcon');

      app.editMode = false;
      app.selectedIcon = null;
      document.body.classList.remove('edit-mode');
      app.enterEditMode(mockIcon);
    });

    teardown(() => {
      updateSelectedIconSpy.restore();
    });

    test('updates the selected icon', () => {
      assert.isTrue(updateSelectedIconSpy.calledWith(mockIcon));
    });

    test('document is marked as in edit mode', () => {
      assert.isTrue(app.editMode);
      assert.isTrue(document.body.classList.contains('edit-mode'));
    });
  });

  suite('App#exitEditMode()', () => {
    var updateSelectedIconStub;
    setup(() => {
      updateSelectedIconStub = sinon.stub(app, 'updateSelectedIcon');
      app.editMode = true;
      app.exitEditMode();
    });

    teardown(() => {
      updateSelectedIconStub.restore();
    });

    test('document is marked as not in edit mode', () => {
      assert.isFalse(document.body.classList.contains('edit-mode'));
      assert.isFalse(app.rename.classList.contains('active'));
      assert.isFalse(app.remove.classList.contains('active'));
    });

    test('icon is deselected', () => {
      assert.isTrue(updateSelectedIconStub.calledWith(null));
    });
  });

  suite('App#isGroup()', () => {
    test('returns true for groups', () => {
      assert.isTrue(app.isGroup(getGroup()));
    });

    test('returns false for non-groups', () => {
      assert.isFalse(app.isGroup(getIcon('abc')));
    });

    test('handles null parameter', () => {
      assert.isFalse(app.isGroup(null));
    });
  });

  suite('App#closeOpenGroup', () => {
    var freezeStub, thawStub, attachInputHandlersStub, setAttributeStub,
      collapseSpy, storeAppOrderStub;

    setup(() => {
      var fakeGroup = {
        collapse: (icons, callback1, callback2) => {
          assert.equal(icons, app.icons);
          callback1();
          callback2();
        }
      };
      freezeStub = sinon.stub(app.icons, 'freeze');
      thawStub = sinon.stub(app.icons, 'thaw');
      attachInputHandlersStub = sinon.stub(app, 'attachInputHandlers');
      setAttributeStub = sinon.stub(app.icons, 'setAttribute');
      collapseSpy = sinon.spy(fakeGroup, 'collapse');
      storeAppOrderStub = sinon.stub(app, 'storeAppOrder');

      app.openGroup = fakeGroup;
      app.closeOpenGroup();
    });

    teardown(() => {
      freezeStub.restore();
      thawStub.restore();
      attachInputHandlersStub.restore();
      setAttributeStub.restore();
      collapseSpy.restore();
      storeAppOrderStub.restore();
      app.openGroup = null;
    });

    test('Closes group', () => {
      assert.isTrue(freezeStub.calledOnce);
      assert.isTrue(collapseSpy.calledOnce);
      assert.isTrue(thawStub.calledOnce);
      assert.equal(app.openGroup, null);
      assert.isTrue(attachInputHandlersStub.calledWith(app.icons));
      assert.isTrue(setAttributeStub.calledWith('drag-and-drop', ''));
      assert.isTrue(storeAppOrderStub.calledOnce);
    });
  });

  suite('App#handleEvent()', () => {
    suite('activate', () => {
      var icon;

      setup(() => {
        icon = getIcon('abc');
        fakeIconParent(icon);
      });

      test('should be preventDefaulted', () => {
        var defaultPrevented = false;
        app.handleEvent({
          type: 'activate',
          preventDefault: () => { defaultPrevented = true; },
          detail: { target: icon }
        });
        assert.isTrue(defaultPrevented);
      });

      test('group should be expanded', () => {
        var group = getGroup();
        fakeIconParent(group);

        var expandStub = sinon.stub(group.firstElementChild, 'expand');
        var attachInputHandlersStub = sinon.stub(app, 'attachInputHandlers');
        var removeAttributeStub = sinon.stub(app.icons, 'removeAttribute');

        app.handleEvent({
          type: 'activate',
          preventDefault: () => {},
          detail: { target: group }
        });

        assert.equal(app.openGroup, group.firstElementChild);
        assert.isTrue(expandStub.calledWith(app.icons));
        assert.isTrue(removeAttributeStub.calledWith('drag-and-drop'));
        assert.isTrue(attachInputHandlersStub.
          calledWith(group.firstElementChild.container));

        app.openGroup = null;
        attachInputHandlersStub.restore();
        removeAttributeStub.restore();
      });

      test('unrecoverable app should be removed', () => {
        var uninstallStub = sinon.stub(MockNavigatormozApps.mgmt, 'uninstall');
        icon.firstElementChild.state = 'unrecoverable';
        app.handleEvent(new CustomEvent('activate',
          { detail: { target: icon } }));
        assert.isTrue(uninstallStub.called);
      });

      test('installing app should open a cancel download dialog', () => {
        var showActionDialogStub = sinon.stub(app, 'showActionDialog');
        icon.firstElementChild.state = 'installing';
        icon.firstElementChild.name = 'Name';
        app.handleEvent(new CustomEvent('activate',
          { detail: { target: icon } }));
        assert.isTrue(showActionDialogStub.called);
        var stubCall = showActionDialogStub.getCall(0);
        assert.equal(stubCall.args[0], app.cancelDownload);
        showActionDialogStub.restore();
      });

      suite('error and paused', () => {
        var showActionDialogStub;

        var testApp = state => {
          showActionDialogStub = sinon.stub(app, 'showActionDialog');
          var icon = getIcon('abc');
          fakeIconParent(icon);
          icon.firstElementChild.state = state;
          icon.firstElementChild.name = 'Name';
          app.handleEvent(new CustomEvent('activate',
            { detail: { target: icon } }));
        };

        teardown(() => {
          showActionDialogStub.restore();
        });

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

      suite('touchstart', () => {
        var realContainer, closeGroupStub;

        setup(() => {
          realContainer = app.container;
          app.openGroup = getGroup().firstElementChild;
          app.container = app.openGroup.container;
          closeGroupStub = sinon.stub(app, 'closeOpenGroup');
        });

        teardown(() => {
          app.openGroup = null;
          app.container = realContainer;
          closeGroupStub.restore();
        });

        test('touch outside of open group closes group', () => {
          var icon = getIcon('abc');
          app.handleEvent({
            type: 'touchstart',
            preventDefault: () => {},
            target: icon
          });

          assert.isTrue(closeGroupStub.calledOnce);
        });

        test('touch inside open group does nothing', () => {
          var icon = getIcon('abc');
          app.container.appendChild(icon);
          app.handleEvent({
            type: 'touchstart',
            preventDefault: () => {},
            target: icon
          });

          assert.isFalse(closeGroupStub.called);
        });
      });

      suite('drag-move', () => {
        var setIntervalStub, clearIntervalStub;

        setup(() => {
          app.lastWindowWidth = app.lastWindowHeight = 500;
          setIntervalStub = sinon.stub(window, 'setInterval');
          clearIntervalStub = sinon.stub(window, 'clearInterval');

          app.draggingRemovable = app.draggingEditable = true;
        });

        teardown(() => {
          setIntervalStub.restore();
          clearIntervalStub.restore();
        });

        test('Auto-scroll is activated at the top of the screen', () => {
          app.handleEvent(new CustomEvent('drag-move', { detail: {
            clientX: 0,
            clientY: 0
          }}));

          assert.isTrue(setIntervalStub.called);
        });

        test('Auto-scroll is activated at the bottom of the screen', () => {
          app.handleEvent(new CustomEvent('drag-move', { detail: {
            clientX: 0,
            clientY: 500
          }}));

          assert.isTrue(setIntervalStub.called);
        });

        test('Auto-scroll is cancelled when not at the top or bottom', () => {
          app.autoScrollInterval = 'abc';
          app.icons.getChildFromPoint = () => { return null; };

          app.handleEvent(new CustomEvent('drag-move', { detail: {
            clientX: 0,
            clientY: 250
          }}));

          assert.isTrue(clearIntervalStub.calledWith('abc'));
          delete app.icons.getChildFromPoint;
        });

        suite('Icons hint at drop position when dragged', () => {
          var returnChild, getChildIndexStub, getChildFromPointStub,
            getChildOffsetRectStub;

          setup(() => {
            returnChild = getIcon('abc');
            getChildIndexStub = sinon.stub(app,
              'getChildIndex', () => 1);
            getChildFromPointStub = sinon.stub(app.container,
              'getChildFromPoint', () => returnChild);
            getChildOffsetRectStub = sinon.stub(app.container,
              'getChildOffsetRect', () => {
                return {
                  top: 0,
                  right: 100,
                  bottom: 100,
                  left: 0,
                  width: 100,
                  height: 100
                };
              });
          });

          teardown(() => {
            getChildFromPointStub.restore();
            app.hoverIcon = null;
          });

          test('hover-before', () => {
            app.draggedIndex = 2;
            app.handleEvent(new CustomEvent('drag-move', { detail: {
              clientX: 0,
              clientY: 250
            }}));
            assert.isTrue(returnChild.classList.contains('hover-before'));
          });

          test('hover-after', () => {
            app.draggedIndex = 0;
            app.handleEvent(new CustomEvent('drag-move', { detail: {
              clientX: 100,
              clientY: 250
            }}));
            assert.isTrue(returnChild.classList.contains('hover-after'));
          });

          test('hover-over', () => {
            var event = new CustomEvent('drag-move', { detail: {
              clientX: 100,
              clientY: 250
            }});
            app.shouldCreateGroup = true;

            app.draggedIndex = 2;
            app.handleEvent(event);
            assert.isTrue(app.hoverIcon.classList.contains('hover-over'));
            app.hoverIcon.classList.remove('hover-before');

            app.draggedIndex = 0;
            event.detail.clientX = 0;
            app.handleEvent(event);
            assert.isTrue(app.hoverIcon.classList.contains('hover-over'));
          });

          test('hover-over-group', () => {
            var target = getIcon('abc');
            var event = new CustomEvent('drag-move', { detail: {
              clientX: 100,
              clientY: 250,
              target: target
            }});

            app.shouldCreateGroup = false;
            app.draggedIndex = 2;
            app.handleEvent(event);

            assert.isTrue(target.classList.contains('hover-over-group'));
          });

          test('removes hints from old hovered icon', () => {
            returnChild = null;
            var hoverIcon = app.hoverIcon = getIcon('abc');
            app.hoverIcon.classList.add(
              'hover-before', 'hover-after', 'hover-over');
            var target = getIcon('def');
            target.classList.add('hover-over-group');
            var event = new CustomEvent('drag-move', { detail: {
              clientX: 100,
              clientY: 250,
              target: target
            }});
            app.handleEvent(event);

            assert.equal(hoverIcon.className.length, 0);
            assert.equal(target.className.length, 0);
          });
        });
      });

      suite('drag-finish', () => {
        test('dragging classes should be removed', () => {
          app.dragging = true;
          app.container.classList.add('dragging');
          document.body.classList.add('dragging');

          app.handleEvent(new CustomEvent('drag-finish', { detail: {} }));

          assert.isFalse(app.dragging);
          assert.isFalse(app.container.classList.contains('dragging'));
          assert.isFalse(document.body.classList.contains('dragging'));
        });

        test('auto-scroll style should be removed', () => {
          document.body.classList.add('autoscroll');
          app.handleEvent(new CustomEvent('drag-finish', { detail: {} }));
          assert.isFalse(document.body.classList.contains('autoscroll'));
        });

        test('scrollable overflow should be unset', () => {
          app.scrollable.style.overflow = 'hidden';
          app.handleEvent(new CustomEvent('drag-finish', { detail: {} }));
          assert.equal(app.scrollable.style.overflow, '');
        });

        test('auto-scroll interval should be cancelled', () => {
          var clearIntervalStub = sinon.stub(window, 'clearInterval');
          app.autoScrollInterval = 'abc';
          app.handleEvent(new CustomEvent('drag-finish', { detail: {} }));
          clearIntervalStub.restore();

          assert.isTrue(clearIntervalStub.calledWith('abc'));
          assert.equal(app.autoScrollTimeout, null);
        });

        test('auto-scroll overflow timeout should be cancelled', () => {
          var clearTimeoutStub = sinon.stub(window, 'clearTimeout');
          app.autoScrollOverflowTimeout = 'abc';
          app.handleEvent(new CustomEvent('drag-finish', { detail: {} }));
          clearTimeoutStub.restore();

          assert.isTrue(clearTimeoutStub.calledWith('abc'));
          assert.equal(app.autoScrollOverflowTimeout, null);
        });

        test('hoverIcon hover styles should be removed', () => {
          var div = app.hoverIcon = document.createElement('div');
          app.hoverIcon.classList.add(
            'hover-before', 'hover-after', 'hover-over');
          app.handleEvent(new CustomEvent('drag-finish', { detail: {} }));
          assert.equal(div.className.length, 0);
          assert.equal(app.hoverIcon, null);
        });

        test('hover-over-group style should be removed', () => {
          var target = document.createElement('div');
          target.classList.add('hover-over-group');
          app.shouldCreateGroup = false;
          app.handleEvent(new CustomEvent('drag-finish', {
            detail: { target: target }
          }));
          assert.equal(target.className.length, 0);
        });

        test('restores default drag-and-drop timeout', () => {
          app.container.dragAndDropTimeout = 100;
          app.handleEvent(new CustomEvent('drag-finish', { detail: {} }));
          assert.equal(app.container.dragAndDropTimeout, -1);
        });
      });

      suite('drag-end', () => {
        var realInnerHeight, realInnerWidth, realIcons, reorderChildSpy;
        var mockIconContainer = { firstElementChild: 'icon' };

        setup(() => {
          realInnerHeight =
            Object.getOwnPropertyDescriptor(window, 'innerHeight');
          realInnerWidth =
            Object.getOwnPropertyDescriptor(window, 'innerWidth');
          Object.defineProperty(window, 'innerHeight', {
            value: 500,
            configurable: true
          });
          Object.defineProperty(window, 'innerWidth', {
            value: 500,
            configurable: true
          });

          realIcons = app.icons;
          app.container = app.icons = {
            firstChild: 'abc',
            getChildOffsetRect: () => {
              return { left: 0, top: 0, right: 10, bottom: 10 };
            },
            reorderChild: () => {}
          };
          app.iconsLeft = 10;
          app.iconsRight = 490;

          reorderChildSpy = sinon.spy(app.icons, 'reorderChild');
        });

        teardown(() => {
          app.icons = realIcons;
          app.shouldEnterEditMode = false;
          app.shouldCreateGroup = false;
          reorderChildSpy.restore();
          Object.defineProperty(window, 'innerHeight', realInnerHeight);
          Object.defineProperty(window, 'innerWidth', realInnerWidth);
        });

        test('icon can be dropped at the beginning of the container', () => {
          app.handleEvent(new CustomEvent('drag-end', {
            detail:
              { target: 'def', dropTarget: null, clientX: 250, clientY: -100 }
          }));
          assert.isTrue(reorderChildSpy.calledWith('def', 'abc'));
        });

        test('icon can be dropped at the end of the container', () => {
          app.handleEvent(new CustomEvent('drag-end', {
            detail:
              { target: 'def', dropTarget: null, clientX: 250, clientY: 600 }
          }));
          assert.isTrue(reorderChildSpy.calledWith('def', null));
        });

        test('dropping icon on itself does nothing', () => {
          app.handleEvent(new CustomEvent('drag-end', {
            detail: {
              target: 'abc',
              dropTarget: mockIconContainer,
              clientX: 0,
              clientY: 0
            }
          }));
          assert.isFalse(reorderChildSpy.called);
        });

        test('dropping icon to the side does nothing', () => {
          app.handleEvent(new CustomEvent('drag-end', {
            detail:
              { target: 'def', dropTarget: null, clientX: 5, clientY: 0 }
          }));
          app.handleEvent(new CustomEvent('drag-end', {
            detail:
              { target: 'def', dropTarget: null, clientX: 495, clientY: 0 }
          }));
          assert.isFalse(reorderChildSpy.called);
        });

        test('dropping icon without moving activates edit mode', () => {
          var enterEditModeStub = sinon.stub(app, 'enterEditMode');
          var iconEditableStub = sinon.stub(app, 'iconIsEditable', () => true);

          app.shouldEnterEditMode = true;
          app.handleEvent(new CustomEvent('drag-end', {
            detail: { target: mockIconContainer,
                      dropTarget: mockIconContainer,
                      clientX: 0, clientY: 0 }
          }));
          assert.isTrue(
            enterEditModeStub.calledWith(mockIconContainer.firstElementChild));

          enterEditModeStub.restore();
          iconEditableStub.restore();
        });

        suite('app grouping', () => {
          var refreshGridSizeStub, snapScrollPositionStub, addGroupStub,
              mockGroup, transferFromContainerStub, transferToContainerStub;

          setup(() => {
            refreshGridSizeStub = sinon.stub(app, 'refreshGridSize');
            snapScrollPositionStub = sinon.stub(app, 'snapScrollPosition');

            mockGroup = {
              container: {
                getBoundingClientRect: () => {
                  return {
                    top: 100,
                    bottom: 200
                  };
                },
                children: {
                  length: 10
                }
              },
              transferFromContainer: () => {},
              transferToContainer: () => {}
            };

            addGroupStub = sinon.stub(app, 'addGroup', () => mockGroup);
            transferFromContainerStub =
              sinon.stub(mockGroup, 'transferFromContainer');
            transferToContainerStub =
              sinon.stub(mockGroup, 'transferToContainer');
          });

          teardown(() => {
            refreshGridSizeStub.restore();
            snapScrollPositionStub.restore();
            addGroupStub.restore();
          });

          test('dropping icon onto another icon creates group', () => {
            app.shouldCreateGroup = true;
            app.handleEvent(new CustomEvent('drag-end', {
              detail: { target: 'abc', dropTarget: 'def' }
            }));
            assert.isTrue(addGroupStub.calledOnce);
            assert.equal(transferFromContainerStub.firstCall.args[0], 'def');
            assert.equal(transferFromContainerStub.secondCall.args[0], 'abc');
          });

          test('dropping icon onto group adds icon to group', () => {
            var isGroupStub = sinon.stub(app, 'isGroup', () => true);
            var fakeGroupContainer = { firstElementChild: mockGroup };
            app.shouldCreateGroup = true;
            app.handleEvent(new CustomEvent('drag-end', {
              detail: { target: 'abc', dropTarget: fakeGroupContainer }
            }));
            assert.isTrue(transferFromContainerStub.calledOnce);
            assert.isTrue(transferFromContainerStub.calledWith('abc'));
            isGroupStub.restore();
          });

          test('dropping icon outside of group removes icon from group', () => {
            app.openGroup = mockGroup;
            app.handleEvent(new CustomEvent('drag-end', {
              detail: { target: 'abc', dropTarget: null, clientY: 0 }
            }));
            assert.isTrue(transferToContainerStub.calledOnce);
            assert.isTrue(transferToContainerStub.calledWith('abc'));
          });

          test('dropping penultimate icon outside group closes group', () => {
            var closeGroupStub = sinon.stub(app, 'closeOpenGroup');
            app.openGroup = mockGroup;
            mockGroup.container.children.length = 1;
            app.handleEvent(new CustomEvent('drag-end', {
              detail: { target: 'abc', dropTarget: null, clientY: 0 }
            }));
            assert.isTrue(closeGroupStub.calledOnce);
            closeGroupStub.restore();
          });
        });
      });

      test('app with default state should be launched', done => {
        var icon = getIcon('abc');
        fakeIconParent(icon);
        icon.firstElementChild.state = 'unknownState';
        icon.firstElementChild.name = 'Name';
        icon.firstElementChild.launch = () => {
          done();
        };
        app.handleEvent(new CustomEvent('activate',
          { detail: { target: icon } }));
      });
    });

    suite('resize', () => {
      var synchroniseStub, refreshGridSizeStub, snapScrollPositionStub,
        oldIconSize;

      setup(() => {
        oldIconSize = app._iconSize = app.iconSize + 100;
        app.icons.synchronise = () => {};
        synchroniseStub = sinon.stub(app.icons, 'synchronise');
        refreshGridSizeStub = sinon.stub(app, 'refreshGridSize');
        snapScrollPositionStub = sinon.stub(app, 'snapScrollPosition');
        app.lastWindowWidth = app.lastWindowHeight = null;
        app.handleEvent(new CustomEvent('resize'));
      });

      teardown(() => {
        synchroniseStub.restore();
        refreshGridSizeStub.restore();
        snapScrollPositionStub.restore();
        delete app.icons.synchronise;
      });

      test('should call icons.synchronise()', () => {
        assert.isTrue(synchroniseStub.called);
      });

      test('should call refreshGridSize()', () => {
        assert.isTrue(refreshGridSizeStub.called);
      });

      test('should call snapScrollPosition()', () => {
        assert.isTrue(snapScrollPositionStub.called);
      });

      test('should reset icon size', () => {
        assert.notEqual(app.iconSize, oldIconSize);
      });

      test('should refresh incorrectly sized icons', () => {
        app._iconSize = 1000;
        var refreshIconStub = sinon.stub(app, 'refreshIcon');
        Object.defineProperty(app.icons, 'children', {
          value: [{
            firstElementChild: 'abc',
            style: { display: 'block' }
          }],
          configurable: true
        });

        app.lastWindowWidth = app.lastWindowHeight = null;
        app.handleEvent(new CustomEvent('resize'));
        assert.isTrue(refreshIconStub.calledWith('abc'));

        refreshIconStub.restore();
        delete app.icons.children;
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
});
