
'use strict';

const DockManager = (function() {

  var container, dock;

  var maxNumAppInDock = 7, maxNumAppInViewPort, numAppsBeforeDrag;
  var windowWidth = window.innerWidth;

  var initialOffsetLeft, cellWidth;
  var isPanning = false, startX, currentX;
  var thresholdForTapping = 10;

  function handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        evt.stopPropagation();
        document.body.dataset.transitioning = 'true';
        initialOffsetLeft = dock.getLeft();
        startX = evt.clientX;
        attachEvents();
        break;

      case 'mousemove':
        evt.stopPropagation();

        if (!isPanning &&
            Math.abs(evt.clientX - startX) < thresholdForTapping) {
          return;
        } else {
          isPanning = true;
        }

        dock.moveBy(initialOffsetLeft + evt.clientX - startX);
        break;

      case 'mouseup':
        evt.stopPropagation();
        releaseEvents();

        if (!isPanning) {
          delete document.body.dataset.transitioning;
        } else {
          isPanning = false;
        }

        var scrollX = evt.clientX - startX;
        if (Math.abs(scrollX) < thresholdForTapping) {
          dock.tap(evt.target);
        } else {
          container.addEventListener('transitionend', function transEnd(e) {
            container.removeEventListener('transitionend', transEnd);
            delete document.body.dataset.transitioning;
          });
          onTouchEnd(initialOffsetLeft + scrollX);
        }

        break;

      case 'contextmenu':
        if (GridManager.pageHelper.getCurrentPageNumber() >= 1) {
          Homescreen.setMode('edit');

          if ('origin' in evt.target.dataset) {
            document.body.dataset.transitioning = true;
            DragDropManager.start(evt, {x: evt.clientX, y: evt.clientY});
          }
        }
        break;
    }
  }

  function goNextIcon() {
    var offsetLeft = dock.getLeft();
    var maxOffsetLeft = windowWidth - dock.getNumApps() * cellWidth;

    if (offsetLeft <= maxOffsetLeft) {
      return;
    }

    var movement = offsetLeft - cellWidth;
    if (movement < maxOffsetLeft) {
      movement = maxOffsetLeft;
    }

    dock.moveByWithEffect(movement, .3);
  }

  function goPreviousIcon() {
    var offsetLeft = dock.getLeft();

    if (offsetLeft >= 0) {
      return;
    }

    var movement = offsetLeft + cellWidth;
    if (movement > 0) {
      movement = 0;
    }

    dock.moveByWithEffect(movement, .3);
  }

  function onTouchEnd(scrollX) {
    var numApps = dock.getNumApps();

    if (numApps > maxNumAppInViewPort) {
      if (scrollX > 0) {
        scrollX = 0;
      } else {
        var maxOffsetLeft = windowWidth - numApps * cellWidth;
        if (scrollX < maxOffsetLeft) {
          scrollX = maxOffsetLeft;
        } else {
          scrollX = applyMagnet(scrollX);
        }
      }
    } else {
      // Centering dock when we have 4 apps of less
      scrollX = (windowWidth - numApps * cellWidth) / 2;
    }

    dock.moveByWithEffect(scrollX, .3);
  }

  function applyMagnet(scrollX) {
    var icons = dock.getChildren();
    var physicalCenter = windowWidth / 2;
    var previousCenter = icons[0].getBoundingClientRect().left + cellWidth / 2;

    var len = icons.length;
    for (var i = 1; i < len; i++) {
      var center = icons[i].getBoundingClientRect().left + cellWidth / 2;
      if (center < 0 || previousCenter < 0 ||
          Math.abs(physicalCenter - previousCenter) >
          Math.abs(physicalCenter - center)) {
        previousCenter = center;
      } else {
        scrollX += physicalCenter - previousCenter;
        break;
      }
    }

    return scrollX;
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

  function placeAfterRemovingApp(numApps) {
    document.body.dataset.transitioning = 'true';

    if (numApps <= maxNumAppInViewPort) {
      dock.moveByWithEffect(Math.abs(numApps * cellWidth - windowWidth) / 2,
                            .3);
    } else {
      dock.moveByWithEffect(dock.getLeft() + cellWidth, .3);
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
        var offsetLeft = Math.abs(numApps * cellWidth - windowWidth) / 2;
        if (numApps > maxNumAppInViewPort) {
          dock.moveBy(-offsetLeft);
          if (numApps % 2 === 0) {
            // Only when the number of icons is even
            dock.moveBy(applyMagnet(-offsetLeft));
          }
        } else {
          dock.moveBy(offsetLeft);
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
      if (numApps === numAppsBeforeDrag ||
          numApps >= maxNumAppInViewPort &&
          (numApps > numAppsBeforeDrag || dock.getRight() >= windowWidth)) {
        return;
      }

      placeAfterRemovingApp(numApps);
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

      var numApps = dock.getNumApps();
      if (numApps >= maxNumAppInViewPort && dock.getRight() >= windowWidth) {
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

    goNextIcon: goNextIcon,

    goPreviousIcon: goPreviousIcon
  };
}());
