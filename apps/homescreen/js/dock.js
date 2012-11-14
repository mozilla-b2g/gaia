
'use strict';

const DockManager = (function() {

  var container, dock;

  var MAX_NUM_ICONS = 7;
  var maxNumAppInViewPort, numAppsBeforeDrag, maxOffsetLeft;

  var windowWidth = window.innerWidth;
  var duration = .2;

  var initialOffsetLeft, initialOffsetRight, numApps, cellWidth;
  var isPanning = false, startX, currentX, deltaX;
  var thresholdForTapping = 10;

  function handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        evt.stopPropagation();
        initialOffsetLeft = dock.getLeft();
        initialOffsetRight = dock.getRight();
        numApps = dock.getNumIcons();
        startX = evt.clientX;
        attachEvents();
        break;

      case 'mousemove':
        evt.stopPropagation();

        deltaX = evt.clientX - startX;
        if (!isPanning) {
          if (Math.abs(deltaX) < thresholdForTapping) {
            return;
          } else {
            isPanning = true;
            document.body.dataset.transitioning = 'true';
          }
        }

        // Dock is fixed for 4 or less apps
        if (numApps <= maxNumAppInViewPort) {
          return;
        }

        if (deltaX < 0) {
          // Go forward
          if (initialOffsetRight === windowWidth) {
            return;
          }

          if (initialOffsetRight + deltaX < windowWidth) {
            deltaX = windowWidth - initialOffsetRight;
          }
        } else {
          // Go back
          if (initialOffsetLeft === 0) {
            return;
          }

          if (initialOffsetLeft + deltaX > 0) {
            deltaX = -initialOffsetLeft;
          }
        }

        dock.moveBy(initialOffsetLeft + deltaX);
        break;

      case 'mouseup':
        evt.stopPropagation();
        releaseEvents();

        if (!isPanning) {
          dock.tap(evt.target);
        } else {
          isPanning = false;
          onTouchEnd(deltaX);
        }

        break;

      case 'contextmenu':
        if (GridManager.pageHelper.getCurrentPageNumber() > 1) {
          Homescreen.setMode('edit');

          if ('isIcon' in evt.target.dataset) {
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
    if (dock.getNumIcons() <= maxNumAppInViewPort ||
          dock.getLeft() === 0 || dock.getRight() === windowWidth) {
      // No animation
      delete document.body.dataset.transitioning;
      return;
    }

    dock.moveByWithEffect(scrollX > 0 ? 0 : maxOffsetLeft, duration);
    container.addEventListener('transitionend', function transEnd(e) {
      container.removeEventListener('transitionend', transEnd);
      delete document.body.dataset.transitioning;
    });
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
     * @param {DOMElement} containerEl
     *                     The HTML element that contains the dock.
     *
     * @param {Dock} page
     *               The dock page object.
     */
    init: function dm_init(containerEl, page) {
      container = containerEl;
      container.addEventListener('mousedown', handleEvent);
      dock = this.page = page;

      var numIcons= dock.getNumIcons();
      cellWidth = dock.getWidth() / numIcons;
      maxNumAppInViewPort = Math.floor(windowWidth / cellWidth);
      maxOffsetLeft = windowWidth - numIcons * cellWidth;
      if (numIcons <= maxNumAppInViewPort) {
        dock.moveBy(maxOffsetLeft / 2);
      }
    },

    onDragStop: function dm_onDragStop() {
      var numApps = dock.getNumIcons();
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
      numAppsBeforeDrag = dock.getNumIcons();
    },

    /*
     * Exports the page
     */
    page: null,

    /*
     * Update display after removing an app.
     */
    afterRemovingApp: function dm_afterRemovingApp() {
      maxOffsetLeft = windowWidth - dock.getNumIcons() * cellWidth;
      var numApps = dock.getNumIcons();
      if (numApps > maxNumAppInViewPort && dock.getRight() >= windowWidth) {
        return;
      }
      placeAfterRemovingApp(numApps);
    },

    isFull: function dm_isFull() {
      return dock.getNumIcons() === MAX_NUM_ICONS;
    },

    goNextSet: goNextSet,

    goPreviousSet: goPreviousSet
  };
}());
