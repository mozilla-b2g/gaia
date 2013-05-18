'use strict';

mocha.globals(['mozRequestAnimationFrame']);

requireApp('homescreen/test/unit/mock_page.js');
requireApp('homescreen/test/unit/mock_icon.js');
requireApp('homescreen/test/unit/mock_dock_manager.js');
requireApp('homescreen/test/unit/mock_home_state.js');
requireApp('homescreen/test/unit/mock_pagination_bar.js');
requireApp('homescreen/test/unit/mock_app.js');
requireApp('homescreen/test/unit/mock_apps_mgmt.js');
requireApp('homescreen/test/unit/mock_configurator.js');
requireApp('homescreen/test/unit/mock_hidden_apps.js');
requireApp('homescreen/test/unit/mock_manifest_helper.js');
requireApp('homescreen/test/unit/mock_icon_retriever.js');

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
  'getDefaultIcon'
]);

mocksHelperForGrid.init();

suite('grid.js >', function() {
  var TAP_THRESHOLD = 10;
  var SWIPE_THRESHOLD = 0.5;
  var TINY_TIMEOUT = 50;
  var SAVE_STATE_WAIT_TIMEOUT = 200;

  var wrapperNode, containerNode;
  var realMozApps;

  var mocksHelper = mocksHelperForGrid;

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    realMozApps = window.navigator.mozApps;
    window.navigator.mozApps = {
      mgmt: MockAppsMgmt
    };

  });

  suiteTeardown(function() {
    window.navigator.mozApps = realMozApps;

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

      function sendTouchEvent(type, node, coords) {
        var touch = document.createTouch(window, node, 1,
          coords.x, coords.y, coords.x, coords.y);
        var touchList = document.createTouchList(touch);

        var evt = document.createEvent('TouchEvent');
        evt.initTouchEvent(type, true, true, window,
          0, false, false, false, false,
          touchList, touchList, touchList);
        node.dispatchEvent(evt);
      }

      function sendMouseEvent(type, node, coords) {
        var evt = document.createEvent('MouseEvent');

        evt.initMouseEvent(type, true, true, window,
          0, coords.x, coords.y, coords.x, coords.y,
          false, false, false, false, 0, null);
        containerNode.dispatchEvent(evt);
      }

      test('should be able to pan', function(done) {
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

        setTimeout(function() {
          var currentPage = document.getElementById('landing-page');
          assert.include(currentPage.style.MozTransform, 'translateX');
          sendTouchEvent('touchend', containerNode, move);
          sendMouseEvent('mouseup', containerNode, move);
          done();
        }, TINY_TIMEOUT);
      });
    });
  }

  ensurePanningSuite();

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

});
