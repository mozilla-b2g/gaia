
'use strict';

var DragDropManager = (function() {

  /*
   * It defines the time (in ms) while checking limits is disabled
   */
  var CHECK_LIMITS_DELAY = 700;

  /*
   * It defines the time (in ms) between consecutive rearranges
   */
  var REARRANGE_DELAY = Page.prototype.REARRANGE_DELAY;

  /*
   * It defines the time (in ms) to ensure that the dragend event is performed
   */
  var ENSURE_DRAG_END_DELAY = 1000;

  /*
   * When an icon is over a collection and this threshold is reached, the
   * collection is re-arranged like apps or bookmarks
   */
  var MOVE_COLLECTION_THRESHOLD = 1500;

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

  /*
   * Timeout of the over collection function
   */
  var overCollectionTimeout = null;

  var draggableIcon, previousOverlapIcon, overlapingTimeout, overlapElem,
      originElem, draggableElemStyle, draggableElemClassList,
      draggableIconIsCollection;

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
          (pageHelper.getCurrentPageNumber() > 0) && dirCtrl.limitPrev(cx)) {
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
    draggableIconIsCollection = overlapElem.dataset.isCollection === 'true';
    draggableIcon.onDragStart(sx, sy);
    draggableElemStyle = draggableIcon.draggableElem.style;
    draggableElemClassList = draggableIcon.draggableElem.classList;
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
        sendDragStopToDraggableIcon(callback);
      }
      done();
    }, true);

    // We ensure that there is not an icon lost on the grid
    ensureCallbackID = window.setTimeout(function() {
      ensureCallbackID = null;
      sendDragStopToDraggableIcon(callback);
    }, ENSURE_DRAG_END_DELAY);
  }

  /*
   *  This method implements the draggable icon behavior after releasing the
   *  finger. If user releases an icon over a collection, this will be copied
   *  into collection. Otherwise the icon goes to the new position.
   *
   * @param{Function} Callback will be performed when draggable icon animation
   *                  finishes
   */
  function sendDragStopToDraggableIcon(callback) {
    if (draggableIconIsCollection ||
          overlapElem.dataset.isCollection !== 'true') {
      // If we are dragging an app or bookmark or we aren't over a collection
      // The icon will be placed in the new position
      draggableIcon.onDragStop(callback);
      return;
    }

    // App should be copied
    var overlapRect = overlapElem.getBoundingClientRect(),
        centerX = overlapRect.left + overlapRect.width / 2,
        centerY = overlapRect.top + overlapRect.height / 2;

    var container = draggableIcon.container;

    // The app zooms out to the center of the collection
    draggableIcon.onDragStop(function insertInCollection() {
      container.classList.add('hidden');
      // Calculating original position (page index and position)
      var dataset = draggableIcon.draggableElem.dataset;
      var page = DockManager.page;
      if (dataset.pageType === 'page') {
        page = GridManager.pageHelper.getPage(parseInt(dataset.pageIndex, 10));
        if (page === GridManager.pageHelper.getCurrent()) {
          draggableIcon.remove();
        }
      }

      // We have to reload the icon in order to avoid errors on re-validations
      // because of the object url was revoked
      draggableIcon.loadRenderedIcon(function loaded(url) {
        // The icon reappears without animation
        page.appendIconAt(draggableIcon, parseInt(dataset.iconIndex, 10));
        // Removing hover class for current collection
        removeHoverClass();
        previousElement = undefined;
        sendCollectionDropApp(container.dataset);
        window.URL.revokeObjectURL(url);
        container.classList.remove('hidden');
        callback();
      });
    }, centerX - sx, centerY - sy, 0);
  }

  /*
   * Dispatch an event when a dragged icon is dropped on a collection
   *
   * {Object} descriptor's icon
   */
  function sendCollectionDropApp(dataset) {
    var descriptor = {};
    if ('bookmarkURL' in dataset) {
      descriptor.bookmarkURL = dataset.bookmarkURL;
    }
    if ('manifestURL' in dataset) {
      descriptor.manifestURL = dataset.manifestURL;
    }
    if ('entry_point' in dataset) {
      descriptor.entry_point = dataset.entry_point;
    }

    window.dispatchEvent(new CustomEvent('collectiondropapp', {
      'detail': {
        'descriptor': descriptor,
        'collection': {
          'id': overlapElem.dataset.collectionId
        }
      }
    }));
  }

  function drop(page) {
    overlapElem = document.elementFromPoint(cx, cy);
    addHoverClass(overlapElem);
    doDrop(page);
  }

  function doDrop(page) {
    if (!overlapElem) {
      return;
    }

    if (!draggableIconIsCollection && overlapElem.dataset.isCollection) {
      // If we are dragging an app/bookmark over a collection
      overCollection(draggableIcon,
        GridManager.getIcon(overlapElem.dataset), page);
      return;
    }

    clearOverCollectionTimeout();

    var classList = overlapElem.classList;
    if (classList.contains('icon')) {
      page.drop(draggableIcon, GridManager.getIcon(overlapElem.dataset));
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

  /*
   * This method is executed when an app/bookmark is over a collection. It sets
   * a method that when a specific threshold is reached, the collection will be
   * re-arranged like apps/bookmarks do. If the user releases the icon before
   * the threshold, the app/bookmark will be copied into the collection by a
   * method called stop.
   *
   * @param{Object} App/bookmark icon
   *
   * @param{Object} Collection icon
   *
   * @param{Object} Page container of the collection icon
   */
  function overCollection(icon, collection, page) {
    if (overCollectionTimeout !== null) {
      return;
    }

    overCollectionTimeout = setTimeout(function() {
      if (overlapElem !== collection.container) {
        overCollectionTimeout = null;
        return;
      }
      page.drop(icon, collection);
      removeHoverClass();
      previousElement = overlapElem = icon.container;
      overCollectionTimeout = null;
    }, MOVE_COLLECTION_THRESHOLD);

    if (cx < icon.getLeft() || cy < icon.getTop()) {
      // Rearranging and filling empty slot when the icon has a index bigger
      // than collection in the icons list
      page.drop(icon, page.getLastVisibleIcon());
    }
  }

  /*
   * It clears the timoeout method that is waiting to move the collection
   */
  function clearOverCollectionTimeout() {
    if (overCollectionTimeout === null) {
      return;
    }

    clearTimeout(overCollectionTimeout);
    overCollectionTimeout = null;
  }

  function move() {
    draggableElemStyle.MozTransform =
      'translate(' + (cx - sx) + 'px,' + (cy - sy) + 'px)';
  }

  var previousElement;

  function addHoverClass(elem) {
    if (previousElement === elem) {
      return;
    }

    if (!draggableIconIsCollection && elem && elem.dataset.isCollection) {
      elem.classList.add('hover');
      clearOverCollectionTimeout();
    }

    removeHoverClass();
    previousElement = elem;
  }

  function removeHoverClass() {
    if (previousElement) {
      previousElement.classList.remove('hover');
    }
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
      addHoverClass(newOverlapElem);
    } else {
      // Avoid calling document.elementFromPoint if we are over the same icon
      var rectObject = overlapElem.getBoundingClientRect();
      if (overlapElem.classList.contains('page') ||
          x < rectObject.left || x > rectObject.right ||
          y < rectObject.top || y > rectObject.bottom) {
        newOverlapElem = document.elementFromPoint(x, y);
        addHoverClass(newOverlapElem);
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
    clearOverCollectionTimeout();
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
      if (limitY) {
        return;
      }

      MOVE_COLLECTION_THRESHOLD =
        Configurator.getSection('move_collection_threshold') ||
        MOVE_COLLECTION_THRESHOLD;
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
