
'use strict';

const DragDropManager = (function() {

  /*
   * It defines the time (in ms) while checking limits is disabled
   */
  var CHECK_LIMITS_DELAY = 700;

  /*
   * It defines the time (in ms) between consecutive rearranges
   */
  var REARRANGE_DELAY = 50;

  /*
   * Drop feature is disabled (in the borders of the icongrid)
   */
  var isDisabledDrop = false;

  var isDockDisabled = false;

  /*
   * Checking limits is disabled
   */
  var isDisabledCheckingLimits = false;

  /*
   * Timeout of the checking limits function
   */
  var disabledCheckingLimitsTimeout = null;

  var draggableIcon, previousOverlapIcon, overlapingTimeout, overlapElem,
      originElem;

  var pageHelper = GridManager.pageHelper;

  var dirCtrl, limitY, overlapingDock;

  var currentEvent = {}, startEvent = {};

  /*
   * Sets the isTranslatingPages variable
   *
   * @param {Boolean} the value
   */
  function setDisabledCheckingLimits(value) {
    isDisabledCheckingLimits = value;
    if (value) {
      disabledCheckingLimitsTimeout = setTimeout(
        function dg_disabledCheckingLimitsTimeout() {
          isDisabledCheckingLimits = false;
          checkLimits();
        }, CHECK_LIMITS_DELAY);
    }
  }

  var isTouch = 'ontouchstart' in window;
  var touchmove = isTouch ? 'touchmove' : 'mousemove';
  var touchend = isTouch ? 'touchend' : 'mouseup';

  var getTouch = (function getTouchWrapper() {
    return isTouch ? function(e) { return e.touches[0] } :
                     function(e) { return e };
  })();

  var transitioning = false;

  function onNavigationEnd() {
    transitioning = false;
  }

  function overDock() {
    if (isDockDisabled) {
      if (!overlapingDock) {
        // If we are coming from grid -> the drop action is disabled
        draggableIcon.addClassToDragElement('overDock');
        overlapingDock = isDisabledDrop = true;
      }

      return;
    }

    if (!overlapingDock) {
      // I've just entered
      draggableIcon.addClassToDragElement('overDock');
      DockManager.page.appendIcon(draggableIcon);
      drop(DockManager.page);
      previousOverlapIcon = overlapElem;
    }

    if (dirCtrl.limitNext(currentEvent.x)) {
      DockManager.goNextSet();
    } else if (dirCtrl.limitPrev(currentEvent.x)) {
      DockManager.goPreviousSet();
    }

    overlapingDock = true;
  }

  function overIconGrid() {
    if (transitioning) {
      isDisabledDrop = true;
      return;
    }

    isDisabledDrop = false;
    var currentX = currentEvent.x;
    var curPageObj = pageHelper.getCurrent();

    if (overlapingDock) {
      draggableIcon.removeClassToDragElement('overDock');
      overlapingDock = false;
      curPageObj.appendIconVisible(draggableIcon);
    } else if (!isDisabledCheckingLimits) {
      if (dirCtrl.limitNext(currentX)) {
        isDisabledDrop = true;

        if (pageHelper.getCurrentPageNumber() <
            pageHelper.getTotalPagesNumber() - 1) {
          pageHelper.getNext().appendIconVisible(draggableIcon);
        } else if (curPageObj.getNumIcons() > 1) {
          // New page if there are two or more icons
          pageHelper.addPage([draggableIcon]);
        }

        setDisabledCheckingLimits(true);
        if (pageHelper.getNext()) {
          GridManager.goToNextPage(onNavigationEnd);
          transitioning = true;
        }
      } else if (pageHelper.getCurrentPageNumber() > GridManager.landingPage + 1
                 && dirCtrl.limitPrev(currentX)) {
        isDisabledDrop = true;

        pageHelper.getPrevious().appendIconVisible(draggableIcon);
        setDisabledCheckingLimits(true);
        transitioning = true;
        GridManager.goToPreviousPage(onNavigationEnd);
      }
    }
  }

  /*
   * Detects when users are touching on the limits of a page during
   * the dragging. So we can change the current page and navigate
   * to prev/next page depending on the position.
   * Furthermore, this method is in charge of creating a new page when
   * it's needed
   */
  function checkLimits() {
    if (currentEvent.y >= limitY) {
      overDock(overlapElem);
    } else {
      overIconGrid();
    }
  }

  /*
   * This method is executed when dragging starts
   *
   * {Object} This is the DOMElement which was tapped and hold
   */
  function onStart(elem) {
    overlapElem = originElem = elem;
    draggableIcon = GridManager.getIcon(elem.dataset);
    draggableIcon.onDragStart(startEvent.x, startEvent.y);
    if (overlapingDock) {
      draggableIcon.addClassToDragElement('overDock');
    } else if (DockManager.isFull()) {
      isDockDisabled = true;
    }
  }

  /*
   * This method is invoked when dragging is finished. It checks if
   * there is overflow or not in a page and removes the last page when
   * is empty
   */
  function stop(callback) {
    clearTimeout(disabledCheckingLimitsTimeout);
    isDisabledCheckingLimits = false;
    isDisabledDrop = false;
    transitioning = false;

    var page = getPage();
    if (page.ready) {
      draggableIcon.onDragStop(callback);
    } else {
      // Probably users release the draggable icon before re-arranged
      page.onReArranged = function fn_ready() {
        delete page.onReArranged;
        draggableIcon.onDragStop(callback);
      };
    }
  }

  function drop(page) {
    var classList = overlapElem.classList;
    if (classList.contains('icon')) {
      var overlapIcon = GridManager.getIcon(overlapElem.dataset);
      page.drop(draggableIcon, overlapIcon);
    } else if (classList.contains('dockWrapper')) {
      var firstIcon = page.getFirstIcon();
      if (currentEvent.x < firstIcon.getLeft()) {
        if (draggableIcon !== firstIcon) {
          page.drop(draggableIcon, firstIcon);
        }
      } else {
        var lastIcon = page.getLastIcon();
        if (draggableIcon !== lastIcon) {
          page.drop(draggableIcon, lastIcon);
        }
      }
    }
    previousOverlapIcon = undefined;
  }

  /*
   * It's performed when the draggable element is moving
   *
   * @param {Object} DOMElement behind draggable icon
   */
  function onMove(evt) {
    var x = currentEvent.x = getTouch(evt).pageX;
    var y = currentEvent.y = getTouch(evt).pageY;

    draggableIcon.onDragMove(x, y);

    var page = getPage();
    if (!page.ready) {
      return;
    }

    var newOverlapElem = overlapElem;
    if (overlapElem.classList.contains('page')) {
      // We are on the grid but not icon
      newOverlapElem = document.elementFromPoint(x, y);
    } else {
      // Avoid calling document.elementFromPoint if we are over the same icon
      var rectObject = overlapElem.getBoundingClientRect();
      if (overlapElem.classList.contains('page') ||
          x < rectObject.left || x > rectObject.right ||
          y < rectObject.top || y > rectObject.bottom) {
        newOverlapElem = document.elementFromPoint(x, y);
      }
    }

    // elementFromPoint can return null in some situations, most notably when
    // the user's finger goes below the dock, on the soft buttons
    if (newOverlapElem) {
      overlapElem = newOverlapElem;
      handleMove(page, x, y);
    }
  }

  function handleMove(page, x, y) {
    var classList = overlapElem.classList;
    if (!classList) {
      clearTimeout(overlapingTimeout);
      return;
    }

    checkLimits(overlapElem);
    if (isDisabledDrop) {
      clearTimeout(overlapingTimeout);
      return;
    }

    if (previousOverlapIcon !== overlapElem) {
      clearTimeout(overlapingTimeout);
      if (classList.contains('page')) {
        var lastIcon = page.getLastIcon();
        if (y > lastIcon.getTop() && draggableIcon !== lastIcon) {
          page.drop(draggableIcon, lastIcon);
        }
      } else {
        overlapingTimeout = setTimeout(drop, REARRANGE_DELAY, page);
      }
    }

    previousOverlapIcon = overlapElem;
  }

  function onEnd(evt) {
    // No multi-touch
    if (evt.target !== originElem)
      return;

    clearTimeout(overlapingTimeout);
    window.removeEventListener(touchmove, onMove);
    window.removeEventListener(touchend, onEnd);
    stop(function dg_stop() {
      GridManager.onDragStop();
      DockManager.onDragStop();
    });
  }

  function getPage() {
    return overlapingDock ? DockManager.page : pageHelper.getCurrent();
  }

  return {

    /*
     * Initializes the drag & drop manager
     */
    init: function ddm_init() {
      dirCtrl = GridManager.dirCtrl;
      limitY = window.innerHeight -
               document.querySelector('#footer').offsetHeight;
    },

    /*
     * Starts drag & drop
     *
     * @param {Object} DOM event
     */
    start: function ddm_start(evt, initCoords) {
      window.addEventListener(touchmove, onMove);
      window.addEventListener(touchend, onEnd);
      GridManager.onDragStart();
      DockManager.onDragStart();
      startEvent = initCoords;
      isDockDisabled = false;
      overlapingDock = (initCoords.y >= limitY) ? true : false;
      onStart(evt.target.className === 'options' ? evt.target.parentNode :
                                                   evt.target);
    }
  };
}());
