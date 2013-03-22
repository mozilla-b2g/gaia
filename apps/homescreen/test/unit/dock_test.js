'use strict';

requireApp('homescreen/test/unit/mock_app.js');
requireApp('homescreen/test/unit/mock_home_state.js');

requireApp('homescreen/js/dock.js');
requireApp('homescreen/js/grid.js');
requireApp('homescreen/js/page.js');

var mocksHelper = new MocksHelper([
  'HomeState'
]);

mocksHelper.init();

suite('dock.js >', function() {

  var wrapperNode;
  var dock;
  var dockContainer;
  var iconsContainer;
  var tapThreshold = 10;

  var defaultGridGetIcon;

  var tinyImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///' +
                  'ywAAAAAAQABAAACAUwAOw==';

  function getIcon() {
    var app = new MockApp();
    var icon = new Icon(
      {
        manifestURL: app.manifestURL,
        name: app.name,
        icon: tinyImage
      },
      app
    );
    //testSupport.renderIcon(iconsContainer, icon, next);
    icon.render(iconsContainer);
    return icon;
  }

  /**
   * Gets a number of icons
   * @param {Integer} number of icons to create.
   */
  function getIcons(numIcons) {

    if (numIcons === 0) {
      return [];
    }

    var allIcons = [];
    var pending = numIcons;

    for (var i = 0; i < numIcons; i++) {
      allIcons.push(getIcon());
    }

    return allIcons;
  }

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    defaultGridGetIcon = GridManager.getIcon;
    GridManager.getIcon = function(descriptor) {
      return {
        descriptor: descriptor
      };
    };
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    GridManager.getIcon = defaultGridGetIcon;
  });

  function setupDom() {
    var fakeMarkup =
      '<div id="fake-icon-name-wrapper">' +
        '<div id="fake-icon-name">' +
      '</div>' +
      '<div class="dockWrapper"></div>';

    wrapperNode = document.createElement('div');
    wrapperNode.id = 'footer';
    wrapperNode.innerHTML = fakeMarkup;
    document.body.appendChild(wrapperNode);
    iconsContainer = document.createElement('ol');

    dockContainer = document.querySelector('.dockWrapper');
  }

  function teardownDom() {
    wrapperNode.parentNode.removeChild(wrapperNode);
  }

  suite('with 1 icon >', function() {

    setup(function(done) {
      setupDom();
      dock = new Dock(dockContainer, getIcons(1));
      DockManager.init(dockContainer, dock, tapThreshold);
      done();
    });

    teardown(teardownDom);

    test('looks ok', function() {
      assert.ok(dock);
      assert.equal(1, dock.getNumIcons());
    });

    test('#calculateDimentions', function() {
      DockManager.calculateDimentions(dock.getNumIcons());
      assert.notEqual(0, DockManager.cellWidth);
    });

    test('#getRight', function() {
      assert.ok(dock.getRight() > 0);
    });
  });

  suite('with 0 icons >', function() {

    setup(function() {
      setupDom();
      dock = new Dock(dockContainer, getIcons(0));
      DockManager.init(dockContainer, dock, tapThreshold);
    });

    teardown(teardownDom);

    test('looks ok', function() {
      assert.ok(dock);
      assert.equal(0, dock.getNumIcons());
    });

    test('#calculateDimentions', function() {
      DockManager.calculateDimentions(dock.getNumIcons());
      assert.equal(0, DockManager.cellWidth);
    });

    test('#getRight', function() {
      assert.equal(dock.getRight(), 0);
    });
  });
});
