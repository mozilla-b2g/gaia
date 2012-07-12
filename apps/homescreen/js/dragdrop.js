
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

  var draggableIcon, draggableIconOrigin;

  var pageHelper = GridManager.pageHelper;

  var dirCtrl;

  var cCoords = {}, iCoords = {};

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

  /*
   * Detects when users are touching on the limits of a page during
   * the dragging. So we can change the current page and navigate
   * to prev/next page depending on the position.
   * Furthermore, this method is in charge of creating a new page when
   * it's needed
   */
  function checkLimits() {
    var x = cCoords.x;
    if (dirCtrl.limitNext(x)) {
      isDisabledDrop = true;
      if (isDisabledCheckingLimits) {
        return;
      }

      var curPageObj = pageHelper.getCurrent();
      if (pageHelper.getCurrentPageNumber() <
          pageHelper.getTotalPagesNumber() - 1) {
        curPageObj.remove(draggableIcon);
        pageHelper.getNext().prependIcon(draggableIcon);
        setDisabledCheckingLimits(true);
        transitioning = true;
        GridManager.goNext(onNavigationEnd);
      } else if (curPageObj.getNumApps() > 1) {
        // New page if there are two or more icons
        curPageObj.remove(draggableIcon);
        pageHelper.push([draggableIcon]);
        setDisabledCheckingLimits(true);
        transitioning = true;
        GridManager.goNext(onNavigationEnd);
      }
    } else if (dirCtrl.limitPrev(x)) {
      isDisabledDrop = true;
      if (pageHelper.getCurrentPageNumber() === 0 || isDisabledCheckingLimits) {
        return;
      }

      var curPageObj = pageHelper.getCurrent();
      curPageObj.remove(draggableIcon);
      var prevPageObj = pageHelper.getPrevious();
      if (prevPageObj.getNumApps() === pageHelper.getMaxPerPage()) {
        prevPageObj.insertBeforeLastIcon(draggableIcon);
      } else {
        prevPageObj.append(draggableIcon);
      }
      setDisabledCheckingLimits(true);
      transitioning = true;
      GridManager.goPrev(onNavigationEnd);
    } else if (transitioning) {
      isDisabledDrop = true;
    } else {
      isDisabledDrop = false;
    }
  };

  /*
   * This method is executed when dragging starts
   *
   * {Object} This is the DOMElement which was tapped and hold
   */
  function init(elem) {
    draggableIconOrigin = elem.dataset.origin;
    draggableIcon = pageHelper.getCurrent().getIcon(draggableIconOrigin);
    draggableIcon.onDragStart(iCoords.x, iCoords.y);
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

    var currentPage = pageHelper.getCurrent();
    if (currentPage.ready) {
      draggableIcon.onDragStop(callback);
    } else {
      // Probably users release the draggable icon before re-arranged
      currentPage.onReArranged = function fn_ready() {
        delete currentPage.onReArranged;
        draggableIcon.onDragStop(callback);
      }
    }
  };

  /*
   * After re-arranged the overlap element could be different so we
   * create a mousemove event with the same coordinates than the last
   * mousedown event
   */
  function dispatchMouseMoveEvent() {
    delete pageHelper.getCurrent().onReArranged;
    var win = document.defaultView;
    var mousemove = document.createEvent('MouseEvent');
    mousemove.initMouseEvent(
      'mousemove', true, true, win, 0,
      cCoords.x + win.mozInnerScreenX, cCoords.y +
      win.mozInnerScreenY, cCoords.x,
      cCoords.y, false, false, false, false, 0, null);
    win.dispatchEvent(mousemove);
  }

  /*
   * It's performed when the draggable element is moving
   *
   * @param {Object} DOMElement behind draggable icon
   */
  function move(overlapElem) {
    draggableIcon.onDragMove(cCoords.x, cCoords.y);

    var currentPage = pageHelper.getCurrent();
    if (!currentPage.ready) {
      currentPage.onReArranged = dispatchMouseMoveEvent;
      return;
    }

    checkLimits();
    if (isDisabledDrop) {
      return;
    }

    var classList = overlapElem.classList;
    if (!classList) {
      return;
    }

    if (classList.contains('icon') || classList.contains('options')) {
      var overlapElemOrigin = overlapElem.dataset.origin;
      currentPage.drop(draggableIconOrigin, overlapElemOrigin);
    } else if (classList.contains('page')) {
      var lastIcon = currentPage.getLastIcon();
      if (lastIcon && cCoords.y > lastIcon.getTop() &&
          overlapElem !== lastIcon) {
        currentPage.drop(draggableIconOrigin, lastIcon.getOrigin());
      }
    }
  }

  function onMove(evt) {
    evt.stopPropagation();
    cCoords.x = evt.pageX;
    cCoords.y = evt.pageY;
    move(evt.target);
  }

  function onEnd(evt) {
    evt.stopPropagation();
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onEnd);
    stop(function dg_stop() {
      GridManager.onDragStop();
    });
  }

  return {

    /*
     * Initializes the drag & drop manager
     */
    init: function ddm_init() {
      dirCtrl = GridManager.dirCtrl;
    },

    /*
     * Starts drag & drop
     *
     * @param {Object} DOM event
     */
    start: function ddm_start(evt, initCoords) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      iCoords = initCoords;
      init(evt.target);
    }
  };
}());
