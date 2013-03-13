'use strict';

requireApp('homescreen/test/unit/mock_page.js');
requireApp('homescreen/test/unit/mock_dock_manager.js');
requireApp('homescreen/test/unit/mock_home_state.js');
requireApp('homescreen/test/unit/mock_pagination_bar.js');
requireApp('homescreen/test/unit/mock_apps_mgmt.js');
requireApp('homescreen/test/unit/mock_configurator.js');

requireApp('homescreen/js/grid.js');

var mocksHelperForGrid = new MocksHelper([
  'DockManager',
  'HomeState',
  'Page',
  'Dock',
  'PaginationBar',
  'Configurator'
]);

mocksHelperForGrid.init();

suite('grid.js >', function() {
  var TAP_THRESHOLD = 10;
  var SWIPE_THRESHOLD = 0.5;
  var PANNING_DELAY = 200;

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
      setup(function() {
        GridManager.ensurePanning();
        MockPage.mTeardown();
      });

      test('should be able to pan', function(done) {
        var evt = document.createEvent('MouseEvent');

        evt.initMouseEvent('mousedown', true, true, window,
          0, 100, 100, 100, 100, false, false, false, false, 0, null);
        containerNode.dispatchEvent(evt);

        evt = document.createEvent('MouseEvent');

        evt.initMouseEvent('mousemove', true, true, window,
          0, 200, 100, 200, 100, false, false, false, false, 0, null);
        containerNode.dispatchEvent(evt);

        assert.equal(document.body.dataset.transitioning, 'true');
        setTimeout(function() {
          done(function() {
            var currentPage = document.getElementById('landing-page');
            assert.include(currentPage.style.MozTransform, 'translateX');
          });
        }, PANNING_DELAY);
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

});
