
'use strict';

const DockManager = (function() {

  var container, dock;

  var maxNumAppInDock = 7, maxNumAppInViewPort, numAppsBeforeDrag,
      maxOffsetLeft;

  var windowWidth = window.innerWidth;
  var duration = .2;

  var initialOffsetLeft, cellWidth;
  var isPanning = false, startX, currentX;
  var thresholdForTapping = 10;

  function handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        evt.stopPropagation();
        initialOffsetLeft = dock.getLeft();
        startX = evt.clientX;
        attachEvents();
        break;

      case 'mousemove':
        evt.stopPropagation();

        if (!isPanning) {
          if (Math.abs(evt.clientX - startX) < thresholdForTapping) {
            return;
          } else {
            isPanning = true;
            document.body.dataset.transitioning = 'true';
          }
        }

        dock.moveBy(initialOffsetLeft + evt.clientX - startX);
        break;

      case 'mouseup':
        evt.stopPropagation();
        releaseEvents();

        if (!isPanning) {
          dock.tap(evt.target);
        } else {
          isPanning = false;
          onTouchEnd(evt.clientX - startX);
        }

        break;

      case 'contextmenu':
        if (GridManager.pageHelper.getCurrentPageNumber() >= 1) {
          Homescreen.setMode('edit');

          if ('origin' in evt.target.dataset) {
            DragDropManager.start(evt, {x: evt.clientX, y: evt.clientY});
          }
        }
        break;
    }
  }

  function goNextSet() {
    if (dock.getLeft() <= maxOffsetLeft) {
      return;
    }

    dock.moveByWithDuration(maxOffsetLeft, duration);
  }

  function goPreviousSet() {
    if (dock.getLeft() >= 0) {
      return;
    }

    dock.moveByWithDuration(0, duration);
  }

  function onTouchEnd(scrollX) {
    var numApps = dock.getNumApps();

    if (numApps > maxNumAppInViewPort) {
      scrollX = scrollX > 0 ? 0 : maxOffsetLeft;
    } else {
      scrollX = maxOffsetLeft / 2;
    }

    dock.moveByWithEffect(scrollX, duration);
    container.addEventListener('transitionend', function transEnd(e) {
      container.removeEventListener('transitionend', transEnd);
      delete document.body.dataset.transitioning;
    });
  }

  /*
   * UI Localization
   *
   * Currently we only translate the app names
   */
  function localize() {
    dock.translate();
  }

  function releaseEvents() {
    container.removeEventListener('contextmenu', handleEvent);
    window.removeEventListener('mousemove', handleEvent);
    window.removeEventListener('mouseup', handleEvent);
  }

  function attachEvents() {
    container.addEventListener('contextmenu', handleEvent);
    window.addEventListener('mousemove', handleEvent);
    window.addEventListener('mouseup', handleEvent);
  }

  function initialize(elem) {
    container = elem;
    container.addEventListener('mousedown', handleEvent);
  }

  function render(apps) {
    dock = new Dock();
    dock.render(apps, container);
    localize();
  }

  function placeAfterRemovingApp(numApps, centering) {
    document.body.dataset.transitioning = 'true';

    if (centering || numApps <= maxNumAppInViewPort) {
      dock.moveByWithDuration(maxOffsetLeft / 2, .5);
    } else {
      dock.moveByWithDuration(dock.getLeft() + cellWidth, .5);
    }

    container.addEventListener('transitionend', function transEnd(e) {
      container.removeEventListener('transitionend', transEnd);
      delete document.body.dataset.transitioning;
    });
  }

  return {
    /*
     * Initializes the dock
     *
     * @param {DOMElement} container
     */
    init: function dm_init(elem) {
      initialize(elem);
      this.getShortcuts(function dm_getShortcuts(apps) {
        render(apps);
        var numApps = dock.getNumApps();
        cellWidth = dock.getWidth() / numApps;
        maxNumAppInViewPort = Math.floor(windowWidth / cellWidth);
        maxOffsetLeft = windowWidth - numApps * cellWidth;
        if (numApps <= maxNumAppInViewPort) {
          dock.moveBy(maxOffsetLeft / 2);
        }
      });
    },

    /*
     * Returns list of shortcuts
     *
     * @param {Object} the callback
     */
    getShortcuts: function dm_getShortcuts(callback) {
      HomeState.getShortcuts(callback,
        function gs_fail() {
          callback([]);
        }
      );
    },

    onDragStop: function dm_onDragStop() {
      var numApps = dock.getNumApps();
      maxOffsetLeft = windowWidth - numApps * cellWidth;
      if (numApps === numAppsBeforeDrag ||
          numApps > maxNumAppInViewPort &&
          (numApps < numAppsBeforeDrag && dock.getRight() >= windowWidth ||
           numApps > numAppsBeforeDrag && dock.getLeft() < 0)
         ) {
        return;
      }

      placeAfterRemovingApp(numApps, numApps > numAppsBeforeDrag);
    },

    onDragStart: function dm_onDragStart() {
      releaseEvents();
      numAppsBeforeDrag = dock.getNumApps();
    },

    /*
     * Exports the page
     */
    get page() {
      return dock;
    },

    contains: function dm_contains(app) {
      return dock.getIcon(Applications.getOrigin(app));
    },

    /*
     * Removes an application from the dock
     *
     * {Object} moz app
     */
    uninstall: function dm_uninstall(app) {
      if (!this.contains(app)) {
        return;
      }

      dock.remove(app);
      this.saveState();

      maxOffsetLeft = windowWidth - dock.getNumApps() * cellWidth;
      var numApps = dock.getNumApps();
      if (numApps > maxNumAppInViewPort && dock.getRight() >= windowWidth) {
        return;
      }

      placeAfterRemovingApp(numApps);
    },

    isFull: function dm_isFull() {
      return dock.getNumApps() === maxNumAppInDock;
    },

    localize: localize,

    /*
     * Save current state
     *
     * {String} the mode ('edit' or 'mode')
     */
    saveState: function dm_saveState() {
      var nop = function f_nop() {};
      HomeState.saveShortcuts(dock.getAppsList(), nop, nop);
    },

    goNextSet: goNextSet,

    goPreviousSet: goPreviousSet
  };
}());
