
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
   * It defines the time (in ms) to ensure that the dragend event is performed
   */
  var ENSURE_DRAG_END_DELAY = 1000;

  /*
   * Drop feature is disabled (in the borders of the icongrid)
   */
  var isDisabledDrop = false;

  /*
   * Drag feature is disabled during re-arrange
   */
  var isDisabledDrag = false;

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
      originElem, draggableElemStyle;

  var pageHelper;

  var dirCtrl, limitY, overlapingDock;

  // Current and start positions
  var cx, cy, sx, sy;

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
    transitioning = isDisabledDrop = false;
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
      // User has just entered
      overlapingDock = true;
      draggableIcon.addClassToDragElement('overDock');
      DragLeaveEventManager.send(pageHelper.getCurrent(), function end(done) {
        DockManager.page.appendIcon(draggableIcon);
        drop(DockManager.page);
        done();
      });
    }

    if (dirCtrl.limitNext(cx)) {
      DockManager.goNextSet();
    } else if (dirCtrl.limitPrev(cx)) {
      DockManager.goPreviousSet();
    }
  }

  function overIconGrid() {
    isDisabledDrop = false;
    var curPageObj = pageHelper.getCurrent();

    if (overlapingDock) {
      overlapingDock = false;
      draggableIcon.removeClassToDragElement('overDock');
      DragLeaveEventManager.send(DockManager.page, function end(done) {
        curPageObj.appendIconVisible(draggableIcon);
        drop(pageHelper.getCurrent());
        done();
      });
    } else if (!isDisabledCheckingLimits) {
      if (dirCtrl.limitNext(cx)) {
        isDisabledDrop = true;
        DragLeaveEventManager.send(curPageObj, function end(done) {
          if (pageHelper.getCurrentPageNumber() <
            pageHelper.getTotalPagesNumber() - 1) {
            pageHelper.getNext().appendIconVisible(draggableIcon);
          } else if (curPageObj.getNumIcons() > 1) {
            // New page if there are two or more icons
            pageHelper.addPage([draggableIcon]);
          }

          setDisabledCheckingLimits(true);
          if (pageHelper.getNext()) {
            transitioning = true;
            GridManager.goToNextPage(onNavigationEnd);
          }

          done();
        });
      } else if (
          (pageHelper.getCurrentPageNumber() > GridManager.landingPage + 1) &&
          dirCtrl.limitPrev(cx)) {
        isDisabledDrop = true;
        DragLeaveEventManager.send(curPageObj, function end(done) {
          pageHelper.getPrevious().appendIconVisible(draggableIcon);
          setDisabledCheckingLimits(true);
          transitioning = true;
          GridManager.goToPreviousPage(onNavigationEnd);
          done();
        });
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
    if (transitioning) {
      return;
    }

    if (cy >= limitY) {
      overDock();
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
    overlapElem = elem;
    draggableIcon = GridManager.getIcon(elem.dataset);
    draggableIcon.onDragStart(sx, sy);
    draggableElemStyle = draggableIcon.draggableElem.style;
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
    var ensureCallbackID = null;
    DragLeaveEventManager.send(page, function(done) {
      if (ensureCallbackID !== null) {
        window.clearTimeout(ensureCallbackID);
        draggableIcon.onDragStop(callback);
      }
      done();
    }, true);

    // We ensure that there is not an icon lost on the grid
    ensureCallbackID = window.setTimeout(function() {
      ensureCallbackID = null;
      draggableIcon.onDragStop(callback);
    }, ENSURE_DRAG_END_DELAY);
  }

  function drop(page) {
    overlapElem = document.elementFromPoint(cx, cy);
    doDrop(page);
  }

  function doDrop(page) {
    if (!overlapElem) {
      return;
    }

    var classList = overlapElem.classList;
    if (classList.contains('icon')) {
      var overlapIcon = GridManager.getIcon(overlapElem.dataset);
      page.drop(draggableIcon, overlapIcon);
    } else if (classList.contains('dockWrapper')) {
      var firstIcon = page.getFirstIcon();
      if (cx < firstIcon.getLeft()) {
        if (firstIcon && draggableIcon !== firstIcon) {
          page.drop(draggableIcon, firstIcon);
        }
      } else {
        var lastIcon = page.getLastIcon();
        if (lastIcon && draggableIcon !== lastIcon) {
          page.drop(draggableIcon, lastIcon);
        }
      }
    }
    previousOverlapIcon = undefined;
  }

  function move() {
    draggableElemStyle.MozTransform =
                          'translate(' + (cx - sx) + 'px,' + (cy - sy) + 'px)';
  }

  /*
   * It's performed when the draggable element is moving
   *
   * @param {Object} DOMElement behind draggable icon
   */
  function onMove(evt) {
    var x = cx = getTouch(evt).pageX;
    var y = cy = getTouch(evt).pageY;

    window.mozRequestAnimationFrame(move);

    var page = getPage();
    if (isDisabledDrag || !page.ready) {
      if (overlapingTimeout !== null) {
        clearTimeout(overlapingTimeout);
        overlapingTimeout = null;
      }
      return;
    }

    var newOverlapElem = overlapElem;
    if (!newOverlapElem) {
      return;
    }

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
      if (overlapingTimeout !== null) {
        clearTimeout(overlapingTimeout);
        overlapingTimeout = null;
      }
      return;
    }

    checkLimits(overlapElem);
    if (isDisabledDrop || !getPage().ready) {
      if (overlapingTimeout !== null) {
        clearTimeout(overlapingTimeout);
        overlapingTimeout = null;
      }
      return;
    }

    if (previousOverlapIcon !== overlapElem) {
      clearTimeout(overlapingTimeout);
      if (classList.contains('page')) {
        var lastIcon = page.getLastIcon();
        if (lastIcon && y > lastIcon.getTop() && draggableIcon !== lastIcon) {
          overlapingTimeout = setTimeout(function() {
            page.drop(draggableIcon, lastIcon);
          }, REARRANGE_DELAY);
        }
      } else {
        overlapingTimeout = setTimeout(doDrop, REARRANGE_DELAY, page);
      }
    }

    previousOverlapIcon = overlapElem;
  }

  function onEnd(evt) {
    if (overlapingTimeout !== null) {
      clearTimeout(overlapingTimeout);
    }
    window.removeEventListener(touchmove, onMove);
    window.removeEventListener(touchend, onEnd);
    stop(function dg_stop() {
      DockManager.onDragStop(GridManager.onDragStop);
      window.dispatchEvent(new CustomEvent('dragend'));
    });
  }

  function getPage() {
    return overlapingDock ? DockManager.page : pageHelper.getCurrent();
  }

  // It implements a stack of re-arrange operations in order to avoid
  // appendChild's collisions between pages and/or pages and dock
  var DragLeaveEventManager = (function() {

    // List of pending events
    var events = [], working = false;

    var DragLeaveEvent = function(page, callback, reflow) {
      this.page = page;
      this.callback = callback;
      this.reflow = reflow;
    };

    DragLeaveEvent.prototype.send = function() {
      working = true;
      var self = this;

      // For some reason, moving a node re-triggers the blob URI to be validated
      // after inserting this one in other position of the DOM
      draggableIcon.loadRenderedIcon(function loaded(url) {
        self.page.onDragLeave(function done() {
          self.callback(function() {
            // Check pending operations
            events.length == 0 ? isDisabledDrag = working = false :
                                 events.shift().send();
            setTimeout(function() {
              window.URL.revokeObjectURL(url);
            });
          });
        }, self.reflow);
      });
    };

    return {
     /*
      * This method initializes the component
      */
      init: function init() {
        events = [];
        working = false;
      },

     /*
      * This method performs all operations needed before changing of page
      *
      * @param{Object}   Page object that will receive the event
      *
      * @param{Function} This callback will be invoked when the page finishes
      *                  the re-arrange of icons. It returns a callback what
      *                  should be invoked when the caller finishes in order to
      *                  revoke the url and continue with next perding event
      *
      * @param{Function} This flag defines if the page has to do reflow
      *                  inserting the draggable node in the DOM. Tipically
      *                  this operation is only performed when users release
      *                  the icon
      */
      send: function(page, callback, reflow) {
        isDisabledDrag = true;
        var event = new DragLeaveEvent(page, callback, reflow);
        events.length === 0 && !working ? event.send() : events.push(event);
      }
    };
  }());

  return {

    /*
     * Initializes the drag & drop manager
     */
    init: function ddm_init() {
      dirCtrl = GridManager.dirCtrl;
      limitY = window.innerHeight -
               document.querySelector('#footer').offsetHeight;
      pageHelper = GridManager.pageHelper;
    },

    /*
     * Starts drag & drop
     *
     * @param {Object} DOM event
     */
    start: function ddm_start(evt, initCoords) {
      window.addEventListener(touchend, onEnd);
      window.addEventListener(touchmove, onMove);
      DragLeaveEventManager.init();
      GridManager.onDragStart();
      DockManager.onDragStart();
      sx = initCoords.x;
      sy = initCoords.y;
      isDockDisabled = isDisabledDrag = isDisabledDrop = false;
      overlapingDock = (initCoords.y >= limitY) ? true : false;
      originElem = evt.target;
      onStart(originElem.classList.contains('options') ? originElem.parentNode :
                                                         originElem);
    }
  };
}());
