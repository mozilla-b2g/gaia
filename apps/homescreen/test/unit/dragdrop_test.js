'use strict';

requireApp('homescreen/test/unit/mock_grid_manager.js');
requireApp('homescreen/test/unit/mock_dock_manager.js');

requireApp('homescreen/test/unit/mock_dragdrop.html.js');
requireApp('homescreen/js/page.js');
requireApp('homescreen/js/dragdrop.js');

var mocksHelperForDragDrop = new MocksHelper([
  'GridManager',
  'DockManager'
]);

mocksHelperForDragDrop.init();

suite('dragdrop.js >', function() {

  var wrapperNode, page, dock, realElementFromPoint, dragabbleIcon;

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
    node.dispatchEvent(evt);
  }

  // Simulate the movement of an icon
  function move(node, x, y, elementFromPoint) {
    HTMLDocument.prototype.elementFromPoint = function() {
      // y >= 10000 -> over the dock
      return (y >= 10000 ? dock : page).olist.children[x];
    };

    var coords = {
      x: x,
      y: y
    };

    sendTouchEvent('touchmove', node, coords);
    sendMouseEvent('mousemove', node, coords);
  }

  function doEnd(node, x, y, done) {
    setTimeout(function() {
      var coords = {
        x: x,
        y: y
      };

      sendTouchEvent('touchend', node, coords);
      sendMouseEvent('mouseup', node, coords);
      setTimeout(done, 0);
    }, 0);
  }

  // Simulate when users release the finger
  function end(node, x, y, done, _overPage) {
    setTimeout(function() {
      var overPage = _overPage || page;
      // The transition has ended when the page is ready
      if (overPage.ready) {
        doEnd(node, x, y, done);
      } else {
        overPage.container.addEventListener('onpageready', function onReady() {
          overPage.container.removeEventListener('onpageready', onReady);
            doEnd(node, x, y, done);
        });
      }
    }, 50);
  }

  function start(target, x, y) {
    var initCoords = {
      x: x,
      y: y
    };

    var touchstartEvent = {
      target: target
    };

    DragDropManager.start(touchstartEvent, initCoords);
  }

  function checkPositions(container, positions) {
    var index = 0;
    positions.forEach(function(icon) {
      assert.equal(container.olist.children[index++],
       document.querySelector('li[data-manifest-u-r-l="http://' + icon + '"]'));
    });
  }

  suiteSetup(function() {
    realElementFromPoint = HTMLDocument.prototype.elementFromPoint;

    mocksHelperForDragDrop.suiteSetup();
    wrapperNode = document.createElement('section');
    wrapperNode.innerHTML = MockDragDropHtml;
    document.body.appendChild(wrapperNode);

    // Our grid is composed only for one page
    page = new Page(document.getElementById('dragdropPage'));
    page.olist = document.querySelector('#dragdropPage > ol');
    GridManager.init(page);

    // Dock container
    dock = new Dock(document.querySelector('.dockWrapper'));
    dock.olist = document.querySelector('.dockWrapper > ol');
    DockManager.init(document.querySelector('.dockWrapper'), dock);
    DragDropManager.init();

    dragabbleIcon =
                document.querySelector('li[data-manifest-u-r-l="http://app1"]');
  });

  suiteTeardown(function() {
    mocksHelperForDragDrop.suiteTeardown();
    document.body.removeChild(wrapperNode);

    HTMLDocument.prototype.elementFromPoint = realElementFromPoint;
  });

  test('The page has been initialized correctly | ' +
       'Page [app1, app2, app3, app4] > ', function() {
    checkPositions(page, ['app1', 'app2', 'app3', 'app4']);
    assert.equal(page.getNumIcons(), 4);
  });

  test('The dock has been initialized correctly | Dock [app5, app6] > ',
       function() {
    checkPositions(dock, ['app5', 'app6']);
    assert.equal(dock.getNumIcons(), 2);
  });

  test('Dragging app1 to app2 | Page [app2, app1, app3, app4] ' +
      '| Dock [app5, app6] > ', function(done) {
    start(dragabbleIcon, 0, 0);
    move(dragabbleIcon, 1, 0);
    end(dragabbleIcon, 1, 0, function ended() {
      checkPositions(page, ['app2', 'app1', 'app3', 'app4']);
      checkPositions(dock, ['app5', 'app6']);
      assert.equal(page.getNumIcons(), 4);
      assert.equal(dock.getNumIcons(), 2);
      done();
    });
  });

  test('Dragging app1 to app3 | Page [app2, app3, app1, app4] ' +
      '| Dock [app5, app6] > ', function(done) {
    start(dragabbleIcon, 1, 0);
    move(dragabbleIcon, 2, 0);
    end(dragabbleIcon, 2, 0, function ended() {
      checkPositions(page, ['app2', 'app3', 'app1', 'app4']);
      checkPositions(dock, ['app5', 'app6']);
      assert.equal(page.getNumIcons(), 4);
      assert.equal(dock.getNumIcons(), 2);
      done();
    });
  });

  test('Dragging app1 to app4 | Page [app2, app3, app4, app1] ' +
      '| Dock [app5, app6] > ', function(done) {
    start(dragabbleIcon, 1, 0);
    move(dragabbleIcon, 3, 0);
    end(dragabbleIcon, 3, 0, function ended() {
      checkPositions(page, ['app2', 'app3', 'app4', 'app1']);
      checkPositions(dock, ['app5', 'app6']);
      assert.equal(page.getNumIcons(), 4);
      assert.equal(dock.getNumIcons(), 2);
      done();
    });
  });

  test('Dragging app1 to app2 | Page [app1, app2, app3, app4] ' +
      '| Dock [app5, app6] > ', function(done) {
    start(dragabbleIcon, 3, 0);
    move(dragabbleIcon, 0, 0);
    end(dragabbleIcon, 0, 0, function ended() {
      checkPositions(page, ['app1', 'app2', 'app3', 'app4']);
      checkPositions(dock, ['app5', 'app6']);
      assert.equal(page.getNumIcons(), 4);
      assert.equal(dock.getNumIcons(), 2);
      done();
    });
  });

  test('Dragging app1 to dock (from left) | Page [app2, app3, app4] ' +
      '| Dock [app1, app5, app6] > ', function(done) {
    start(dragabbleIcon, 0, 0);
    move(dragabbleIcon, 0, 10000); // y = 10000 -> over the dock
    end(dragabbleIcon, 0, 10000, function ended() {
      checkPositions(page, ['app2', 'app3', 'app4']);
      checkPositions(dock, ['app1', 'app5', 'app6']);
      assert.equal(page.getNumIcons(), 3);
      assert.equal(dock.getNumIcons(), 3);
      done();
    }, dock);
  });

  test('Dragging app1 to app5 | Page [app2, app3, app4] ' +
      '| Dock [app5, app1, app6] > ', function(done) {
    start(dragabbleIcon, 0, 10000);
    move(dragabbleIcon, 1, 10000);
    end(dragabbleIcon, 1, 10000, function ended() {
      checkPositions(page, ['app2', 'app3', 'app4']);
      checkPositions(dock, ['app5', 'app1', 'app6']);
      assert.equal(page.getNumIcons(), 3);
      assert.equal(dock.getNumIcons(), 3);
      done();
    }, dock);
  });

  test('Dragging app1 to app6 | Page [app2, app3, app4] ' +
      '| Dock [app5, app6, app1] > ', function(done) {
    start(dragabbleIcon, 1, 10000);
    move(dragabbleIcon, 2, 10000);
    end(dragabbleIcon, 2, 10000, function ended() {
      checkPositions(page, ['app2', 'app3', 'app4']);
      checkPositions(dock, ['app5', 'app6', 'app1']);
      assert.equal(page.getNumIcons(), 3);
      assert.equal(dock.getNumIcons(), 3);
      done();
    }, dock);
  });

  test('Dragging app1 to grid | Page [app2, app3, app4, app1] ' +
      '| Dock [app5, app6] > ', function(done) {
    start(dragabbleIcon, 2, 10000);
    move(dragabbleIcon, 0, 0);
    end(dragabbleIcon, 0, 0, function ended() {
      checkPositions(page, ['app1', 'app2', 'app3', 'app4']);
      checkPositions(dock, ['app5', 'app6']);
      assert.equal(page.getNumIcons(), 4);
      assert.equal(dock.getNumIcons(), 2);
      done();
    });
  });

  test('Dragging app1 to app2 | Page [app1, app2, app3, app4] ' +
      '| Dock [app5, app6] > ', function(done) {
    start(dragabbleIcon, 3, 0);
    move(dragabbleIcon, 0, 0);
    end(dragabbleIcon, 0, 0, function ended() {
      checkPositions(page, ['app1', 'app2', 'app3', 'app4']);
      checkPositions(dock, ['app5', 'app6']);
      assert.equal(page.getNumIcons(), 4);
      assert.equal(dock.getNumIcons(), 2);
      done();
    });
  });
});
