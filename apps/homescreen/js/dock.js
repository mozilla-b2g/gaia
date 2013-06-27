
'use strict';

var DockManager = (function() {

  var container, dock;

  var MAX_NUM_ICONS = 7;
  var maxNumAppInViewPort = 4, maxOffsetLeft;

  var windowWidth;
  var duration = 300;

  var initialOffsetLeft, initialOffsetRight, numApps, cellWidth;
  var isPanning = false, startEvent, currentX, deltaX, tapThreshold;

  var isTouch = 'ontouchstart' in window;
  var touchstart = isTouch ? 'touchstart' : 'mousedown';
  var touchmove = isTouch ? 'touchmove' : 'mousemove';
  var touchend = isTouch ? 'touchend' : 'mouseup';

  var getX = (function getXWrapper() {
    return isTouch ? function(e) { return e.touches[0].pageX } :
                     function(e) { return e.pageX };
  })();

  function addActive(target) {
    if ('isIcon' in target.dataset) {
      target.classList.add('active');
      removeActive = function _removeActive() {
        target.classList.remove('active');
      };
    } else {
      removeActive = function() {};
    }
  }

  var removeActive = function() {};

  function handleEvent(evt) {
    switch (evt.type) {
      case touchstart:
        evt.stopPropagation();
        initialOffsetLeft = dock.getLeft();
        initialOffsetRight = dock.getRight();
        numApps = dock.getNumIcons();
        startEvent = isTouch ? evt.touches[0] : evt;
        attachEvents();
        addActive(evt.target);
        break;

      case touchmove:
        deltaX = getX(evt) - startEvent.pageX;
        if (!isPanning) {
          if (Math.abs(deltaX) < tapThreshold) {
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

      case touchend:
        releaseEvents();

        if (!isPanning) {
          dock.tap(evt.target);
        } else {
          isPanning = false;
          onTouchEnd(deltaX);
        }

        removeActive();

        break;

      case 'contextmenu':
        if (isPanning) {
          evt.stopImmediatePropagation();
          return;
        }

        if (GridManager.pageHelper.getCurrentPageNumber() >
            GridManager.landingPage) {

          Homescreen.setMode('edit');
          removeActive();

          if ('isIcon' in evt.target.dataset) {
            DragDropManager.start(evt, {
              'x': startEvent.pageX,
              'y': startEvent.pageY
            });
          }
        }
        break;
    }
  }

  function goNextSet() {
    calculateDimentions(dock.getNumIcons());

    if (dock.getLeft() <= maxOffsetLeft) {
      return;
    }

    dock.moveByWithDuration(maxOffsetLeft, duration);
  }

  function goPreviousSet() {
    calculateDimentions(dock.getNumIcons());

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
    window.removeEventListener(touchmove, handleEvent);
    window.removeEventListener(touchend, handleEvent);
  }

  function attachEvents() {
    container.addEventListener('contextmenu', handleEvent);
    window.addEventListener(touchmove, handleEvent);
    window.addEventListener(touchend, handleEvent);
  }

  function rePosition(numApps, callback) {
    if (numApps > maxNumAppInViewPort && dock.getLeft() < 0 &&
          dock.getRight() > windowWidth) {
      // The dock takes up the screen width.
      callback && setTimeout(callback);
      return;
    }

    // We are going to place the dock in the middle of the screen
    document.body.dataset.transitioning = 'true';
    var beforeTransform = dock.getTransform();
    dock.moveByWithDuration(maxOffsetLeft / 2, .5);

    if (beforeTransform === dock.getTransform()) {
      delete document.body.dataset.transitioning;
      callback && callback();
      return;
    }

    container.addEventListener('transitionend', function transEnd(e) {
      container.removeEventListener('transitionend', transEnd);
      delete document.body.dataset.transitioning;
      callback && callback();
    });
  }

  function calculateDimentions(numIcons) {
    if (numIcons <= maxNumAppInViewPort) {
      container.classList.remove('scrollable');
    } else {
      container.classList.add('scrollable');
    }

    cellWidth = numIcons ? dock.getFirstIcon().getWidth() : 0;
    maxOffsetLeft = windowWidth - numIcons * cellWidth;
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
    init: function dm_init(containerEl, page, pTapThreshold) {
      windowWidth = window.innerWidth;
      tapThreshold = pTapThreshold;
      container = containerEl;
      container.addEventListener(touchstart, handleEvent);
      dock = this.page = page;

      var numIcons = dock.getNumIcons();
      if (numIcons > maxNumAppInViewPort) {
        container.classList.add('scrollable');
      }

      calculateDimentions(numIcons);

      if (numIcons <= maxNumAppInViewPort) {
        dock.moveBy(maxOffsetLeft / 2);
      }
    },

    onDragStop: function dm_onDragStop(callback) {
      container.addEventListener(touchstart, handleEvent);
      var numApps = dock.getNumIcons();

      if (numApps === 0) {
        callback && setTimeout(callback);
        return;
      }

      calculateDimentions(numApps);
      rePosition(numApps, callback);
    },

    onDragStart: function dm_onDragStart() {
      releaseEvents();
      container.removeEventListener(touchstart, handleEvent);
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
      calculateDimentions(numApps);
      rePosition(numApps);
    },

    isFull: function dm_isFull() {
      return dock.getNumIcons() === MAX_NUM_ICONS;
    },

    goNextSet: goNextSet,

    goPreviousSet: goPreviousSet,

    calculateDimentions: calculateDimentions,

    get cellWidth() {
      return cellWidth;
    },

    get maxOffsetLeft() {
      return maxOffsetLeft;
    }
  };
}());
