'use strict';

mocha.globals(['mozRequestAnimationFrame']);

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');

requireApp('homescreen/test/unit/mock_l10n.js');
requireApp('homescreen/test/unit/mock_page.js');
requireApp('homescreen/test/unit/mock_icon.js');
requireApp('homescreen/test/unit/mock_dock_manager.js');
requireApp('homescreen/test/unit/mock_home_state.js');
requireApp('homescreen/test/unit/mock_pagination_bar.js');
requireApp('homescreen/test/unit/mock_app.js');
requireApp('homescreen/test/unit/mock_apps_mgmt.js');
requireApp('homescreen/test/unit/mock_configurator.js');
requireApp('homescreen/test/unit/mock_hidden_apps.js');
requireApp('homescreen/test/unit/mock_icon_retriever.js');

require('/shared/js/screen_layout.js');
requireApp('homescreen/js/icon_manager.js');
requireApp('homescreen/js/grid_components.js');
requireApp('homescreen/js/grid.js');

var mocksHelperForGrid = new MocksHelper([
  'DockManager',
  'HomeState',
  'Page',
  'Dock',
  'Icon',
  'IconRetriever',
  'TemplateIcon',
  'PaginationBar',
  'Configurator',
  'HIDDEN_APPS',
  'ManifestHelper',
  'getDefaultIcon',
  'Configurator'
]);

mocksHelperForGrid.init();

suite('grid.js >', function() {
  var TAP_THRESHOLD = 10;
  var SWIPE_THRESHOLD = 0.5;
  var SAVE_STATE_WAIT_TIMEOUT = 200;

  var wrapperNode, containerNode;
  var realMozApps;
  var realMozSettings;

  var mocksHelper = mocksHelperForGrid;

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    realMozApps = window.navigator.mozApps;
    window.navigator.mozApps = {
      mgmt: MockAppsMgmt
    };
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

  });

  suiteTeardown(function() {
    window.navigator.mozApps = realMozApps;
    navigator.mozSettings = realMozSettings;

    mocksHelper.suiteTeardown();
  });

  suite('Default icons have be initialized correctly >', function() {

    test('App icon by default is defined', function() {
      var appBlob = GridManager.getBlobByDefault(new MockApp());
      assert.ok(appBlob);
    });

    test('Bookmark icon by default is defined', function() {
      var bookmarkBlob = GridManager.getBlobByDefault(new MockApp({
        iconable: true
      }));
      assert.ok(bookmarkBlob);
    });

    test('App and bookmark icons by default are different', function() {
      var appBlob = GridManager.getBlobByDefault(new MockApp());
      var bookmarkBlob = GridManager.getBlobByDefault(new MockApp({
        iconable: true
      }));
      assert.isTrue(appBlob !== bookmarkBlob);
    });

  });

  setup(function(done) {
    mocksHelper.setup();

    var fakeMarkup =
      '<div id="icongrid" class="apps" role="main">' +
        '<div id="landing-page" data-current-page="true">' +
        '</div>' +
      '</div>' +
      '<div class="dockWrapper"></div>' +
      '<div id="landing-overlay"></div>';

    wrapperNode = document.createElement('div');
    wrapperNode.innerHTML = fakeMarkup;
    document.body.appendChild(wrapperNode);

    containerNode = document.getElementById('icongrid');

    var options = {
      gridSelector: '.apps',
      dockSelector: '.dockWrapper',
      tapThreshold: TAP_THRESHOLD,
      swipeThreshold: SWIPE_THRESHOLD,
      swipeFriction: 0.1,
      swipeTransitionDuration: 300
    };

    GridManager.init(options, done);
  });

  teardown(function() {
    mocksHelper.teardown();

    wrapperNode.parentNode.removeChild(wrapperNode);
  });

  function sendTouchEvent(type, node, coords) {
    if (typeof document.createTouch === 'function') {
      var touch = document.createTouch(window, node, 1,
        coords.x, coords.y, coords.x, coords.y);
      var touchList = document.createTouchList(touch);

      var evt = document.createEvent('TouchEvent');
      evt.initTouchEvent(type, true, true, window,
        0, false, false, false, false,
        touchList, touchList, touchList);
      node.dispatchEvent(evt);
    }
  }

  function sendMouseEvent(type, node, coords) {
    var evt = document.createEvent('MouseEvent');

    evt.initMouseEvent(type, true, true, window,
      0, coords.x, coords.y, coords.x, coords.y,
      false, false, false, false, 0, null);
    containerNode.dispatchEvent(evt);
  }

  function ensurePanningSuite() {
    suite('ensurePanning >', function() {
      var realRequestAnimationFrame;

      suiteSetup(function() {
        realRequestAnimationFrame = window.mozRequestAnimationFrame;
        window.mozRequestAnimationFrame = function(func) {
          setTimeout(function() {
            func();
          });
        };
      });

      setup(function() {
        GridManager.ensurePanning();
        MockPage.mTeardown();
      });

      suiteTeardown(function() {
        window.mozRequestAnimationFrame = realRequestAnimationFrame;
        realRequestAnimationFrame = null;
      });

      test('should not be able to pan if user is on landing page', function() {
        this.sinon.useFakeTimers();

        var start = { x: 100, y: 100 };
        var move = { x: 200, y: 100 };

        // sending both events because depending on the context we may listen to
        // one or the other
        // the real code is listening only to one of those so we can safely send
        // both (this might change but it's unlikely)

        sendTouchEvent('touchstart', containerNode, start);
        sendMouseEvent('mousedown', containerNode, start);

        sendTouchEvent('touchmove', containerNode, move);
        sendMouseEvent('mousemove', containerNode, move);

        assert.equal(document.body.dataset.transitioning, 'true');

        this.sinon.clock.tick();
        var currentPage = document.getElementById('landing-page');
        assert.equal(currentPage.style.MozTransform, '');
        sendTouchEvent('touchend', containerNode, move);
        sendMouseEvent('mouseup', containerNode, move);
      });
    });
  }

  ensurePanningSuite();

  suite('ensureTapping >', function() {
    var page, icons = [];

    function createIcons(num) {
      for (var i = 0; i < num; i++) {
        var icon = (new MockIcon()).render();
        icons.push(icon);
        page.appendChild(icon);
      }
    }

    function removeIcons() {
      icons.forEach(function(icon) {
        page.removeChild(icon);
      });
    }

    suiteSetup(function() {
      page = wrapperNode.querySelector('.page');
      createIcons(2);
    });

    suiteTeardown(function() {
      removeIcons();
    });

    test('Clicking on an icon > it should be active ', function() {
      this.sinon.useFakeTimers();

      var icon = icons[0];
      var rect = icon.getBoundingClientRect();
      var point = { x: rect.left + 1, y: rect.top + 1 };

      // Tap on icon
      sendTouchEvent('touchstart', icon, point);
      sendMouseEvent('mousedown', icon, point);

      assert.isTrue(icon.classList.contains('active'));

      this.sinon.clock.tick();

      sendTouchEvent('touchend', containerNode, point);
      sendMouseEvent('mouseup', containerNode, point);

      // Icon lost the focus
      IconManager.removeActive();
      assert.isFalse(icon.classList.contains('active'));
    });

    test('Clicking two icons at the same time > just one is active ',
         function() {
      this.sinon.useFakeTimers();

      var icon1 = icons[0];
      var icon2 = icons[1];

      var rect = icon1.getBoundingClientRect();
      var point1 = { x: rect.left + 1, y: rect.top + 1 };

      // Tap on first icon
      sendTouchEvent('touchstart', icon1, point1);
      sendMouseEvent('mousedown', icon1, point1);

      rect = icon2.getBoundingClientRect();
      var point2 = { x: rect.left + 1, y: rect.top + 1 };

      assert.isTrue(icon1.classList.contains('active'));

      // Tap on second icon
      sendTouchEvent('touchstart', icon2, point2);
      sendMouseEvent('mousedown', icon2, point2);

      assert.isFalse(icon1.classList.contains('active'));
      assert.isTrue(icon2.classList.contains('active'));

      this.sinon.clock.tick();

      sendTouchEvent('touchend', containerNode, point2);
      sendMouseEvent('mouseup', containerNode, point2);

      // No one is active
      assert.isFalse(icon1.classList.contains('active'));
      IconManager.removeActive();
      assert.isFalse(icon2.classList.contains('active'));
    });

  });

  suite('onDragStart >', function() {
    setup(function() {
      GridManager.onDragStart();
    });

    ensurePanningSuite();
  });

  suite('install app >', function() {
    var mockApp;

    setup(function(done) {
      // we want to test only this call
      MockHomeState.mLastSavedGrid = null;
      mockApp = new MockApp();
      MockAppsMgmt.mTriggerOninstall(mockApp);
      setTimeout(done.bind(null, undefined), SAVE_STATE_WAIT_TIMEOUT);
    });

    test('should save the state', function() {
      assert.ok(MockHomeState.mLastSavedGrid);
    });

    suite('updating app >', function() {
      setup(function(done) {
        // we want to test only this call
        MockHomeState.mLastSavedGrid = null;
        mockApp.mTriggerDownloadApplied();
        setTimeout(done.bind(null, undefined), SAVE_STATE_WAIT_TIMEOUT);
      });

      test('should save the state', function() {
        assert.ok(MockHomeState.mLastSavedGrid);
      });
    });
  });

  suite('install single variant apps >', function() {
    var prevMaxIconNumber;

    suiteSetup(function() {
      prevMaxIconNumber = MockPage.prototype.mMAX_ICON_NUMBER;
      MockPage.prototype.mMAX_ICON_NUMBER = 3;
    });

    suiteTeardown(function() {
      MockPage.prototype.mMAX_ICON_NUMBER = prevMaxIconNumber;
    });

    var mockAppSV;

    // This var shoud match the content of mock_configurator
    var svApps = [
      {
        'screen': 1,
        'manifest' : 'https://aHost/aMan1',
        'location' : 15
      },
      {
        'screen' : 2,
        'manifest' : 'https://aHost/aMan2',
        'location' : 6
      },
      {
        'screen' : 2,
        'manifest' : 'https://aHost/aMan3',
        'location': 0
      }
    ];

    svApps.forEach((function(svApp) {
      test('Should save the icon with desiredPos in the correct page',
           function(done) {
        Configurator.mSimPresentOnFirstBoot = true;
        MockHomeState.mLastSavedGrid = null;
        mockAppSV = new MockApp({'manifestURL': svApp.manifest});
        MockAppsMgmt.mTriggerOninstall(mockAppSV);

        setTimeout(function() {
          var grd = MockHomeState.mLastSavedGrid;

          assert.ok(grd, 'Grid is not set');
          assert.equal(grd.length, svApp.screen + 2,
                       'Grid does not have the right number of screens');
          assert.equal(grd[svApp.screen].index, svApp.screen,
                       'App was not installed on the correct screen');
          assert.ok(grd[svApp.screen].icons,
                    'The screen does not have a icons structure');

          var icns = grd[svApp.screen + 1].icons[0];
          assert.ok(icns, 'The screen does not have any icons');
          assert.isTrue(icns.desiredPos !== undefined,
                        'The single variant app does not have a desiredPos');
          assert.equal(icns.desiredPos, svApp.location,
                       'App does not have the correct DesiredPosition');
          done();
        }, SAVE_STATE_WAIT_TIMEOUT);
      });
    }));
  });

  suite('install single variant apps without SIM on first run >', function() {
    var prevMaxIconNumber;
    var mockAppSV;

    suiteSetup(function() {
      prevMaxIconNumber = MockPage.prototype.mMAX_ICON_NUMBER;
      MockPage.prototype.mMAX_ICON_NUMBER = 3;
      MockHomeState.mUseTestGrids = true;
    });

    suiteTeardown(function() {
      MockPage.prototype.mMAX_ICON_NUMBER = prevMaxIconNumber;
      MockHomeState.mUseTestGrids = false;
    });

    // This var shoud match the content of mock_configurator
    // If we want to change a use Case, we need to change it here and in its
    // definition in mock_configurator
    var testCases = [
      {
        'name': 'One grid with space',
        'manifest' : 'https://aHost/aMan5',
        'expectedPage': 2,
        'expectedNumberOfPages': 4
      },
      {
        'name': 'One grid without space',
        'manifest' : 'https://aHost/aMan6',
        'expectedPage': 3,
        'expectedNumberOfPages': 4
      },
      {
        'name': '1st grid with space, 2nd without space',
        'manifest' : 'https://aHost/aMan7',
        'expectedPage': 4,
        'expectedNumberOfPages': 5
      },
      {
        'name': '1st and 3rd with space, 2nd without it',
        'manifest' : 'https://aHost/aMan8',
        'expectedPage': 4,
        'expectedNumberOfPages': 6
      }
    ];

    testCases.forEach(function(testCase) {
     test('Should save the icon with desiredPos in the first page with space:' +
          testCase.name, function(done) {
        Configurator.mSimPresentOnFirstBoot = false;
        mockAppSV = new MockApp({'manifestURL': testCase.manifest});
        MockAppsMgmt.mTriggerOninstall(mockAppSV);

        setTimeout(function() {
          var grd = MockHomeState.mLastSavedGrid;
          var expectedPage = grd[testCase.expectedPage];
          assert.ok(grd, 'Grid is not set');

          assert.equal(grd.length, testCase.expectedNumberOfPages,
                       'Grid does not have the right number of screens');
          assert.ok(expectedPage,
                    'The expected screen does not exist');
          assert.ok(expectedPage.icons && expectedPage.icons[0],
                    'The screen does not have a icons structure');

          var expectedIcon = expectedPage && expectedPage.icons &&
                             expectedPage.icons[expectedPage.icons.length - 1];
          assert.equal(expectedIcon.manifestURL, testCase.manifest,
                       'App was not installed on the correct screen');
          done();
        }, SAVE_STATE_WAIT_TIMEOUT);
      });
    });
  });

  suite('#getApps >', function() {
      var manifests = [
        {
          role: 'app'
        },
        {
          role: 'keyboard'
        },
        {
          role: 'app',
          entry_points: {
            'dialer': {
              'icons': {}
            },
            'contacts' : {
              'icons': {}
            }
          }
        }
      ];

      // Install a few fake applications
      setup(function(done) {
        manifests.forEach(function(manifest, idx) {
          GridManager.install(new MockApp({
            origin: 'fake' + idx,
            manifest: manifest
          }));
        });

        // Install something with updateManifest, but not manifest
        GridManager.install(new MockApp({
          origin: 'updateManifestOnly',
          manifest: undefined,
          updateManifest: {
            role: 'keyboard'
          }
        }));

        setTimeout(done.bind(null, undefined), SAVE_STATE_WAIT_TIMEOUT);
      });

      test('returns all apps', function() {
        var allApps = GridManager.getApps();
        assert.equal(allApps.length, 4);
      });

      test('filters apps', function() {
        var visibleApps = GridManager.getApps(false, true);
        assert.equal(visibleApps.length, 2);
      });

      test('flattens entry points', function() {
        var allApps = GridManager.getApps(true);
        assert.equal(allApps.length, 5);
      });

      test('filters and flattens entry points', function() {
        var visibleApps = GridManager.getApps(true, true);
        assert.equal(visibleApps.length, 3);
      });
  });

});
