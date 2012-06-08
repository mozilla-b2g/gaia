/*
 *  Module: Grid module
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telef—nica I+D S.A.U.
 *
 *  LICENSE: Apache 2.0
 *
 *  @author Cristian Rodriguez
 *
 */
var owd = window.owd || {};

if (!owd.GridManager) {

  (function(doc) {
    'use strict';

    const HOMESCREEN_TEF = owdConfig.homescreen === 'TEF';

    var container, counter, pages, startEvent = 'mousedown',
        moveEvent = 'mousemove', endEvent = 'mouseup', elementTarget, iniPosX, curPosX,
        winInnerWidth = window.innerWidth, threshold = window.innerWidth / 4,
        tapHoldTimeout = 400, tapHoldTimer, status, draggableIcon, draggableIconOrigin,
        limits, canceledTapHoldObserver = false, wmode, px = 'px';

    /*
     * Initializes the component
     */
    function initialize() {
      status = {
        target: undefined, // target element
        iCoords: {},       // inital position
        pCoords: {},       // previous position
        cCoords: {},       // current position
        pDir: undefined,   // last direction
        dropped: undefined // last dropped element
      };

      pages = {
        list: [],
        current: 0,
        total: 0
      };

      container.innerHTML = '';
    }

    /*
     * Creates the HTML-markup for a new page and it is appended as
     * child the main container
     */
    function createPageMarkup() {
      var ret = doc.createElement('div');
      ret.className = 'page';
      container.appendChild(ret);
      return ret;
    }

    /*
     * Returns the coordinates x and y given an event. The returned object
     * is composed of two attributes named x and y
     *
     * @param {Object} the event object
     */
    function getCoordinates(evt) {
      if (evt.touches) {
        return {
          x: evt.touches[0].pageX,
          y: evt.touches[0].pageY
        };
      } else {
        return {
          x: evt.pageX,
          y: evt.pageY
        };
      }
    }

    /*
     * This method moves the pages following the gesture of the user
     *
     * @param {int} the difference between the last and initial position
     */
    function pan(movementX) {
      var currentPage = pages.current;

      pageHelper.getCurrent().moveTo(movementX + px);

      if (movementX > 0 && currentPage > 0) {
        pageHelper.getPrevious().moveTo('-100% + ' + movementX + px);
      }

      if (movementX < 0 && currentPage < pages.total - 1) {
        pageHelper.getNext().moveTo('100% + ' + movementX + px);
      }
    }

    /*
     * This method is in charge of keeping the position of the
     * current page when the swipe is not enough for paginating
     */
    function keepPosition(transEndCallbck) {
      var ix = status.iCoords.x;
      var cx = status.cCoords.x;
      if (ix !== cx) {
        var currentPage = pages.current;

        if (ix < cx && currentPage > 0) {
          pageHelper.getPrevious().moveToLeft();
        } else if (ix > cx && currentPage < pages.total - 1) {
          pageHelper.getNext().moveToRight();
        }

        pageHelper.getCurrent().moveToCenter(transEndCallbck);
      } else if (transEndCallbck) {
        transEndCallbck();
      }
    }

    /*
     * Navigates to next page
     */
    function goNext(transEndCallbck) {
      var nextPage = pageHelper.getNext();
      var curPage = pageHelper.getCurrent();
      curPage.moveToLeft();
      nextPage.moveToCenter(transEndCallbck);
      pages.current++;
      updatePaginationBar();
    }

    /*
     * Navigates to previous page
     */
    function goPrev(transEndCallbck) {
      var prevPage = pageHelper.getPrevious();
      var curPage = pageHelper.getCurrent();
      curPage.moveToRight();
      prevPage.moveToCenter(transEndCallbck);
      pages.current--;
      updatePaginationBar();
    }

    /*
     * It handles touchstart events, dragging and swiping
     *
     * @param{Object} Event object
     */
    function onStartEvent(evt) {
      container.dataset.transitioning = true;
      evt.stopPropagation();
      canceledTapHoldObserver = false;
      addTapHoldObserver(evt);
      status.pCoords = status.cCoords = status.iCoords = getCoordinates(evt);
      window.addEventListener(moveEvent, owd.GridManager);
      window.addEventListener(endEvent, owd.GridManager);
    }

    /*
     * Implements the observer for detecting tap and hold in the grid
     *
     * @param{Object} Event object
     */
    function addTapHoldObserver(evt) {
      tapHoldTimer = setTimeout(function() {
        keepPosition(); // Sadly clicking on icons could fire touchmove events
        owd.GridManager.setMode('edit');
        if ('origin' in evt.target.dataset) {
          dragger.start(evt.target);
        }
      }, tapHoldTimeout);
    }

    /*
     * Removes the tap and hold observer
     */
    function removeTapHoldObserver() {
      clearTimeout(tapHoldTimer);
      canceledTapHoldObserver = true;
    }

    /*
     * Handles touchmove events, dragging and swiping
     *
     * @param{Object} Event object
     */
    function onMoveEvent(evt) {
      evt.stopPropagation();
      status.pCoords = status.cCoords; // save previous coords
      status.cCoords = getCoordinates(evt); // update coords
      if (dragger.dragging) {
        dragger.move(evt.target);
      } else {
        var difX = -(status.iCoords.x - status.cCoords.x);
        if (swipingToCarousel(difX)) {
          removeTapHoldObserver();
          window.removeEventListener(moveEvent, owd.GridManager);
          window.removeEventListener(endEvent, owd.GridManager);
          dispatchGestureToCarousel();
        } else {
          if (!canceledTapHoldObserver && !isTapEvent(difX)) {
            removeTapHoldObserver();
          }
          pan(difX);
        }
      }
    }

    /*
     * Homescreen will dispatch the gesture
     *
     */
    function dispatchGestureToCarousel() {
      var ev = document.createEvent('Event');
      ev.initEvent(startEvent, true, true);
      ev.pageX = status.cCoords.x;
      container.parentNode.dispatchEvent(ev);
    }

    /*
     * Clicks on icons fires touchmove events for poor devices
     */
    var thresholdForTapping = 10;

    /*
     * Returns true if it's the first page and swipe from left to
     * right and not edit mode
     *
     * @param{int} horizontal movement from start and current position
     */
    function swipingToCarousel(difX) {
      if (HOMESCREEN_TEF) {
        return (!owd.GridManager.isEditMode() &&
              pages.current === 0 && difX > thresholdForTapping);
      } else {
        return false;
      }
    }

    /*
     * Returns true if it's a tap event
     *
     * @param{int} horizontal movement from start and current position
     */
    function isTapEvent(difX) {
      return Math.abs(difX) < thresholdForTapping;
    }

    function onTransitionEnd() {
      delete container.dataset.transitioning;
    }

    /*
     * It handles touchend events, dragging and swiping
     *
     * @param{Object} Event object
     */
    function onEndEvent(evt) {
      if (!canceledTapHoldObserver) {
        removeTapHoldObserver();
      }
      evt.stopPropagation();
      window.removeEventListener(moveEvent, owd.GridManager);
      window.removeEventListener(endEvent, owd.GridManager);

      if (dragger.dragging) {
        dragger.stop();
        delete container.dataset.transitioning;
      } else {
        var difX = status.cCoords.x - status.iCoords.x;
        var absDifX = Math.abs(difX);
        if (absDifX > threshold) {
          var currentPage = pages.current;
          if (difX < 0 && currentPage < pages.total - 1) {
            // Swipe from right to left
            goNext(onTransitionEnd);
          } else if (difX > 0 && currentPage > 0) {
            // Swipe from left to right
            goPrev(onTransitionEnd);
          } else {
            // Bouncing effect for first or last page
            keepPosition(onTransitionEnd);
          }
        } else if (absDifX < thresholdForTapping) {
          pageHelper.getCurrent().tap(status.target);
          // Sometime poor devices fire touchmove events when users are only
          // tapping
          keepPosition(onTransitionEnd);
        } else {
          // Keep position when the movement is less than the threshold
          keepPosition(onTransitionEnd);
        }
      }
    }

    /*
     * Renders the homescreen from moz applications
     */
    function renderFromMozApps() {
      var max = pageHelper.getMaxPerPage();
      var list = [];

      var apps = owdAppManager.getAll();
      for (var origin in apps) {
        list.push(apps[origin]);
        if (list.length === max) {
          pageHelper.push(list, true);
          list = [];
        }
      }

      if (list.length > 0) {
        pageHelper.push(list, true);
      }

      // Renders pagination bar
      updatePaginationBar(true);

      addLanguageListener();

      // Saving initial state
      pageHelper.saveAll();
    }

    /*
     * Renders the homescreen from the database
     */
    function renderFromDB() {
      owd.HomeState.getAppsByPage(
        function iterate(apps) {
          console.log('Iterating saved pages');
          pageHelper.push(apps, true);
         }, function(results) {
          if (results === 0) {
            console.log('Empty database -> This is the first time');
            renderFromMozApps();
          } else {
            // Grid was loaded from DB
            updatePaginationBar(true);
            addLanguageListener();
          }
        }, renderFromMozApps // Error recovering info about apps
      );
    }

    /*
     * Renders the homescreen
     */
    function render() {
      initialize();
      owdAppManager.addEventListener('appsready', function() {
        owd.HomeState.init(renderFromDB, renderFromMozApps);
      });
    }

    /*
     * Translates the UI
     *
     * Currently we only translate the app names
     */
    function addLanguageListener() {
      SettingsListener.onPropModified('language.current', function(lang) {
        if (lang && lang.length > 0) {
          document.documentElement.lang = lang;
          var total = pageHelper.total();
          for (var i = 0; i < total; i++) {
            pages.list[i].translate();
          }
        }
      });
    }

    /*
     * Checks empty pages and deletes them
     */
    function checkEmptyPages() {
      var index = 0;
      var total = pages.total;

      while (index < total) {
        var page = pages.list[index];
        if (page.getNumApps() === 0) {
          pageHelper.remove(index);
          break;
        }
        index++;
      }
    }

    var pagBar = owd.PaginationBar;

    function updatePaginationBar(show) {
      pagBar.update(pages.current, pageHelper.total());
      if (show) {
        pagBar.show();
      }
    }

    /*
     * Checks number of apps per page
     *
     * It propagates icons in order to avoiding overflow in
     * pages with a number of apps greater that the maximum
     */
    function checkOverflowPages() {
      var index = 0;
      var total = pages.total;
      var max = pageHelper.getMaxPerPage();

      while (index < total) {
        var page = pages.list[index];
        if (page.getNumApps() > max) {
          var propagateIco = page.popIcon();
          if (index === total - 1) {
            pageHelper.push([propagateIco]); // new page
          } else {
            pages.list[index + 1].prependIcon(propagateIco); // next page
          }
          break;
        }
        index++;
      }
    }

    /*
     * Returns negative values for backwards and positivo for upwards
     */
    function getDirection() {
      var x = status.cCoords.x - status.pCoords.x;
      var y = status.cCoords.y - status.pCoords.y;

      if (Math.abs(x) > Math.abs(y)) {
        if (x > 0) {
          return 1; // right
        } else {
          return -1; // left
        }
      } else {
        if (y > 0) {
          return 2; // down
        } else {
          return -2; // top
        }
      }
    }

    var pageHelper = {

      /*
       * Adds a new page to the grid layout
       *
       * @param {Array} initial list of apps or icons
       */
      push: function(lapps, notUpdatePagBar) {
        var index = this.total() + 1;
        var page = new owd.Page(index - 1);
        page.render(lapps, createPageMarkup());
        if (index === 1) {
          page.moveToCenter();
        } else {
          page.moveToRight();
        }
        pages.list.push(page);
        pages.total = this.total();
        if (!notUpdatePagBar) {
          updatePaginationBar();
        }
      },

      /*
       * Removes an specific page
       *
       * @param {int} index of the page
       */
      remove: function(index) {
        if (pages.current === index) {
          if (index === 0) {
            // If current page is the first -> seconds page to the center
            // Not fear because we cannot have only one page
            pages.list[index + 1].moveToCenter();
          } else {
            // Move to center the previous page
            pages.list[index - 1].moveToCenter();
            pages.current--;
          }
        } else if (pages.current > index) {
          pages.current--;
        }

        pages.list[index].destroy(); // Destroy page
        pages.list.splice(index, 1); // Removes page from the list
        pages.total = this.total(); // Reset total number of pages
        updatePaginationBar();
      },

      /*
       * Returns the total number of pages
       */
      total: function() {
        return pages.list.length;
      },

      /*
       * Saves the page state on the database
       */
      save: function(index) {
        var dummy = function() {};
        owd.HomeState.save({
          id: index,
          apps: pages.list[index].getAppsList()
        }, dummy, dummy);
      },

      /*
       * Saves all pages state on the database
       */
      saveAll: function() {
        var dummy = function() {};
        owd.HomeState.save(pages.list, dummy, dummy);
      },

      /*
       * Returns the total number of apps for each page. It could be
       * more clever. Currently there're twelve apps for page
       */
      getMaxPerPage: function() {
        return 4 * 4;
      },

      /*
       * Returns the next page object
       */
      getNext: function() {
        return pages.list[pages.current + 1];
      },

      /*
       * Returns the previous page object
       */
      getPrevious: function() {
        return pages.list[pages.current - 1];
      },

      /*
       * Returns the current page object
       */
      getCurrent: function() {
        return pages.list[pages.current];
      },

      /*
       * Returns the last page object
       */
      getLast: function() {
        return pages.list[this.total() - 1];
      }
    };

    /*
     * This module leads to dragging feature
     */
    var dragger = {

      /*
       * It's true when an user is dragging
       */
      dragging: false,

      /*
       * Returns true when the drop feature is disabled
       */
      isDropDisabled: false,

      /*
       * Returns true when the current page is changing
       */
      isTranslatingPages: false,

      /*
       * Translating timeout listener
       */
      translatingTimeout: null,

      /*
       * Sets the isTranslatingPages variable
       *
       * @param {Boolean} the value
       */
      setTranslatingPages: function(value) {
        this.isTranslatingPages = value;
        if (value) {
          var that = this;
          that.translatingTimeout = setTimeout(function() {
            that.isTranslatingPages = false;
            that.checkLimits();
          }, 1000);
        }
      },

      /*
       * Detects when users are touching on the limits of a page during
       * the dragging. So we can change the current page and navigate
       * to prev/next page depending on the position.
       * Furthermore, this method is in charge of creating a new page when
       * it's needed
       */
       checkLimits: function() {
        var x = status.cCoords.x;
        this.isDropDisabled = false;
        if (x > limits.max) {
          // Right border
          this.isDropDisabled = true;
          var curPageObj = pageHelper.getCurrent();
          if (pages.current < pages.total - 1 && !this.isTranslatingPages) {
            curPageObj.remove(draggableIcon);
            pageHelper.getNext().prependIcon(draggableIcon);
            goNext();
            this.setTranslatingPages(true);
          } else if (curPageObj.getNumApps() > 1 && !this.isTranslatingPages) {
            // New page if there are two or more icons
            curPageObj.remove(draggableIcon);
            pageHelper.push([draggableIcon]);
            goNext();
            this.setTranslatingPages(true);
          }
        } else if (x < limits.min) {
          // Left border
          this.isDropDisabled = true;
          if (pages.current > 0 && !this.isTranslatingPages) {
            pageHelper.getCurrent().remove(draggableIcon);
            pageHelper.getPrevious().append(draggableIcon);
            goPrev();
            this.setTranslatingPages(true);
          }
        }
      },

      /*
       * This method is executed when dragging starts
       *
       * {Object} This is the DOMElement which was tapped and hold
       */
      start: function(elem) {
        this.dragging = true;
        draggableIconOrigin = elem.dataset.origin;
        draggableIcon = pageHelper.getCurrent().getIcon(draggableIconOrigin);
        draggableIcon.onDragStart(status.iCoords.x, status.iCoords.y);
      },

      /*
       * This method is invoked when dragging is finished. It checks if
       * there is overflow or not in a page and removes the last page when
       * is empty
       */
      stop: function() {
        clearTimeout(this.translatingTimeout);
        this.isTranslatingPages = false;
        this.dragging = false;
        draggableIcon.onDragStop();
        // When the drag&drop is finished we need to check empty pages and overflows
        checkOverflowPages();
        checkEmptyPages();
      },

      /*
       * It's performed when the draggable element is moving
       *
       * @param {Object} DOMElement behind draggable icon
       */
      move: function(overlapElem) {
        draggableIcon.onDragMove(status.cCoords.x, status.cCoords.y);
        this.checkLimits();
        if (!this.isDropDisabled) {
          if (overlapElem.className === 'icon') {
            var overlapElemOrigin = overlapElem.dataset.origin;
            // Draggable cannot be the same element for dropping
            if (overlapElemOrigin !== draggableIconOrigin) {
              var dir = getDirection();
              if (dir !== status.pDir || overlapElemOrigin !== status.dropped) {
                // Changing positions when:
                // 1) User change the direction of the gesture or...
                // 2) It's another element different than previously dropped
                pageHelper.getCurrent().drop(draggableIconOrigin, overlapElemOrigin, dir);
                status.dropped = overlapElemOrigin;
              }
              status.pDir = dir;
            }
          } else {
            // Dragging outside <ol> element -> move to last position
            var currentPage = pageHelper.getCurrent();
            if (overlapElem.className === 'page' &&
              draggableIcon !== currentPage.getLastIcon()) {
              currentPage.remove(draggableIcon);
              currentPage.append(draggableIcon);
            }
          }
        }
      }
    };

    owd.GridManager = {

      /*
       * Initializes the grid manager
       *
       * @param {String} selector of the container for applications
       *
       */
      init: function(tApps) {
        container = typeof tApps === 'object' ? tApps : doc.querySelector(tApps);
        render();
        container.addEventListener(startEvent, this, true);
        container.addEventListener('contextmenu', this);
        // Limits for changing pages during dragging
        limits = {
          min: container.offsetWidth * 0.08, // 8%
          max: container.offsetWidth * 0.92 // 8%
        };
      },

      /*
       * Event handling in the grid layout
       *
       * @param {Object} The event object from browser
       */
      handleEvent: function(evt) {
        status.target = evt.target;
        switch (evt.type) {
          case startEvent:
            onStartEvent(evt);
            break;
          case moveEvent:
            onMoveEvent(evt);
            break;
          case endEvent:
            onEndEvent(evt);
            break;
          case 'contextmenu':
            evt.preventDefault();
            evt.stopPropagation();
            break;
        }
      },

      /*
       * Adds a new application to the layout when the user installed it
       * from market
       *
       * {Object} moz app
       */
      install: function(app) {
        var lastPage = pageHelper.getLast();
        if (lastPage.getNumApps() < pageHelper.getMaxPerPage()) {
          lastPage.append(app);
        } else {
          pageHelper.push([app]);
        }
        // Saving the last page
        pageHelper.save(pages.total - 1);
      },

      /*
       * Removes an application from the layout
       *
       * {Object} moz app
       */
      uninstall: function(app) {
        var index = 0;
        var total = pages.total;
        var origin = app.origin.toString();

        while (index < total) {
          var page = pages.list[index];
          if (page.getIcon(origin)) {
            page.remove(app);
            break;
          }
          index++;
        }

        checkEmptyPages();
        pageHelper.saveAll();
      },

      /*
       * Sets the mode
       *
       * {String} the mode ('edit' or 'mode')
       */
      setMode: function(mode) {
        if (mode === 'normal' && wmode === 'edit') {
          // Save current state after edit mode
          pageHelper.saveAll();
        }

        this.onEditModeChange(mode);

        container.dataset.mode = wmode = mode;
      },

      /*
       * Returns true if we are in edit mode
       */
      isEditMode: function() {
        return wmode === 'edit';
      }
    };
  })(document);
}
