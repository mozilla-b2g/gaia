
'use strict';

const DragDropManager = (function() {

  /*
   * Drop feature is disabled (in the borders of the icongrid)
   */
  var isDisabledDrop = false;

  /*
   * Checking limits is disabled
   */
  var isDisabledCheckingLimits = false;

  /*
   * Timeout of the checking limits function
   */
  var disabledCheckingLimitsTimeout = null;

  var draggableIcon,
      previousOverlapIcon,
      overlapingTimeout;

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
        }
      , 1000);
    }
  };

  var transitioning = false;

  function onNavigationEnd() {
    transitioning = false;
  };

  function overDock(overlapElem) {
    if (!overlapingDock && !DockManager.isFull()) {
      // I've just entered
      draggableIcon.addClassToDragElement('overDock');
      var needsRender = false;
      DockManager.page.appendIcon(draggableIcon, needsRender);
      drop(overlapElem, DockManager.page);
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
    var currentX = currentEvent.x;

    if (overlapingDock) {
      draggableIcon.removeClassToDragElement('overDock');
      overlapingDock = false;
      var curPageObj = pageHelper.getCurrent();
      if (curPageObj.getNumIcons() < pageHelper.maxIconsPerPage) {
        var needsRender = false;
        curPageObj.appendIcon(draggableIcon, needsRender);
      } else {
        curPageObj.insertBeforeLastIcon(draggableIcon);
      }
    } else if (dirCtrl.limitNext(currentX)) {
      isDisabledDrop = true;
      if (isDisabledCheckingLimits) {
        return;
      }

      var curPageObj = pageHelper.getCurrent();
      if (pageHelper.getCurrentPageNumber() <
          pageHelper.getTotalPagesNumber() - 1) {
        pageHelper.getNext().prependIcon(draggableIcon);
        setDisabledCheckingLimits(true);
        transitioning = true;
        GridManager.goToNextPage(onNavigationEnd);
      } else if (curPageObj.getNumIcons() > 1) {
        // New page if there are two or more icons
        pageHelper.addPage([draggableIcon]);
        setDisabledCheckingLimits(true);
        transitioning = true;
        GridManager.goToNextPage(onNavigationEnd);
      }
    } else if (dirCtrl.limitPrev(currentX)) {
      isDisabledDrop = true;
      if (pageHelper.getCurrentPageNumber() === 2 || isDisabledCheckingLimits) {
        return;
      }

      var curPageObj = pageHelper.getCurrent();
      var prevPageObj = pageHelper.getPrevious();
      if (prevPageObj.getNumIcons() === pageHelper.maxIconsPerPage) {
        prevPageObj.insertBeforeLastIcon(draggableIcon);
      } else {
        var needsRender = false;
        prevPageObj.appendIcon(draggableIcon, needsRender);
      }
      setDisabledCheckingLimits(true);
      transitioning = true;
      GridManager.goToPreviousPage(onNavigationEnd);
    } else if (transitioning) {
      isDisabledDrop = true;
    } else {
      isDisabledDrop = false;
    }
  }

  /*
   * Detects when users are touching on the limits of a page during
   * the dragging. So we can change the current page and navigate
   * to prev/next page depending on the position.
   * Furthermore, this method is in charge of creating a new page when
   * it's needed
   */
  function checkLimits(overlapElem) {
    if (currentEvent.y >= limitY) {
      overDock(overlapElem);
    } else {
      overIconGrid();
    }
  };

  /*
   * This method is executed when dragging starts
   *
   * {Object} This is the DOMElement which was tapped and hold
   */
  function onStart(elem) {
    draggableIcon = GridManager.getIcon(elem.dataset);
    draggableIcon.onDragStart(startEvent.x, startEvent.y);
    if (overlapingDock) {
      draggableIcon.addClassToDragElement('overDock');
    }
  };

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
      }
    }
  };

  function drop(overlapElem, page) {
    var classList = overlapElem.classList;
    if (classList.contains('icon') || classList.contains('options')) {
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
  function move(overlapElem) {
    draggableIcon.onDragMove(currentEvent.x, currentEvent.y);

    var page = getPage();
    if (!page.ready) {
      return;
    }

    checkLimits(overlapElem);
    if (isDisabledDrop) {
      clearTimeout(overlapingTimeout);
      return;
    }

    var classList = overlapElem.classList;
    if (!classList) {
      return;
    }

    if (previousOverlapIcon !== overlapElem) {
      clearTimeout(overlapingTimeout);
      if (classList.contains('page')) {
        var lastIcon = page.getLastIcon();
        if (currentEvent.y > lastIcon.getTop() && draggableIcon !== lastIcon) {
          page.drop(draggableIcon, lastIcon);
        }
      } else {
        overlapingTimeout = setTimeout(drop, 500, overlapElem, page);
      }
    }

    previousOverlapIcon = overlapElem;
  }

  function onMove(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    currentEvent.x = evt.pageX;
    currentEvent.y = evt.pageY;
    move(evt.target);
  }

  function onEnd(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    clearTimeout(overlapingTimeout);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onEnd);
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
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      GridManager.onDragStart();
      DockManager.onDragStart();
      startEvent = initCoords;
      overlapingDock = (initCoords.y >= limitY) ? true : false;
      onStart(evt.target);
    }
  };
}());
