
'use strict';

const GridManager = (function() {
  var container, draggableIcon, draggableIconOrigin;

  // Mode can be:
  //   - normal: the mode used to navigate and launch applications
  //   - edit: the mode used after a long press to manage applications
  var currentMode = 'normal';

  var status = {
    target: undefined, // target element
    iCoords: {},       // inital position
    pCoords: {},       // previous position
    cCoords: {}       // current position
  };

  var pages = {
    list: [],
    current: 0,
    total: 0
  };

  // Limits for changing pages during dragging
  var limits = {
    left: 0,
    right: 0
  };

  // right-to-left compatibility
  var dirCtrl = {};
  function getDirCtrl() {
    function goesLeft(x) { return (x > 0); }
    function goesRight(x) { return (x < 0); }
    function limitLeft(x) { return (x < limits.left); }
    function limitRight(x) { return (x > limits.right); }
    var rtl = (document.documentElement.dir == 'rtl');
    return {
      offsetPrev: rtl ? '100%' : '-100%',
      offsetNext: rtl ? '-100%' : '100%',
      limitPrev: rtl ? limitRight : limitLeft,
      limitNext: rtl ? limitLeft : limitRight,
      translatePrev: rtl ? 'translateX(100%)' : 'translateX(-100%)',
      translateNext: rtl ? 'translateX(-100%)' : 'translateX(100%)',
      goesForward: rtl ? goesLeft : goesRight
    };
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
    var move = movementX + 'px';

    pageHelper.getCurrent().moveTo(move);

    if (currentPage > 0) {
      pageHelper.getPrevious().moveTo(dirCtrl.offsetPrev + ' + ' + move);
    }

    if (currentPage < pages.total - 1) {
      pageHelper.getNext().moveTo(dirCtrl.offsetNext + ' + ' + move);
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

      if (currentPage > 0) {
        pageHelper.getPrevious().moveToBegin();
      }

      if (currentPage < pages.total - 1) {
        pageHelper.getNext().moveToEnd();
      }

      pageHelper.getCurrent().moveToCenter(transEndCallbck);
    } else if (transEndCallbck) {
      transEndCallbck();
    }
  }

  /*
   * Navigates to one page
   */
  function goTo(index, transEndCallbck) {
    var currentPage = pages.current;

    if (currentPage !== index) {
      if (currentPage < index) {
        pageHelper.getCurrent().moveToBegin();
      } else {
        pageHelper.getCurrent().moveToEnd();
      }
      pages.current = index;

      pageHelper.getCurrent().moveToCenter(transEndCallbck);

      updatePaginationBar();
    } else {
      transEndCallbck();
    }
  }

  /*
   * Navigates to next page
   */
  function goNext(transEndCallbck) {
    var nextPage = pageHelper.getNext();
    var curPage = pageHelper.getCurrent();
    curPage.moveToBegin();
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
    curPage.moveToEnd();
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

    status.pCoords = status.cCoords = status.iCoords = getCoordinates(evt);
    window.addEventListener('mousemove', GridManager);
    window.addEventListener('mouseup', GridManager);
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
      pan(difX);
    }
  }

  /*
   * Clicks on icons fires touchmove events for poor devices
   */
  var thresholdForTapping = 10;

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
    evt.stopPropagation();
    window.removeEventListener('mousemove', GridManager);
    window.removeEventListener('mouseup', GridManager);

    if (dragger.dragging) {
      dragger.stop();
      delete container.dataset.transitioning;
      return;
    }

    var difX = status.cCoords.x - status.iCoords.x;
    var absDifX = Math.abs(difX);
    var threshold = window.innerWidth / 4;
    var forward = dirCtrl.goesForward(difX);
    if (absDifX > threshold) {
      var currentPage = pages.current;
      if (forward && currentPage < pages.total - 1) {
        // Swipe to next page
        goNext(onTransitionEnd);
      } else if (!forward && currentPage > 0) {
        // Swipe to previous page
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

  /*
   * Renders the homescreen from moz applications
   */
  function renderFromMozApps() {
    var max = pageHelper.getMaxPerPage();
    var list = [];

    var apps = Applications.getAll();
    for (var origin in apps) {
      list.push(apps[origin]);
      if (list.length === max) {
        pageHelper.push(list);
        list = [];
      }
    }

    if (list.length > 0) {
      pageHelper.push(list);
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
    var appsInDB = [];
    HomeState.getAppsByPage(
        function iterate(apps) {
          pageHelper.push(apps);
          appsInDB = appsInDB.concat(apps);
        },
        function onsuccess(results) {
          if (results === 0) {
            renderFromMozApps();
            return;
          }

          var installedApps = Applications.getInstalledApplications();
          var len = appsInDB.length;
          for (var i = 0; i < len; i++) {
            var origin = appsInDB[i];
            if (origin in installedApps) {
              delete installedApps[origin];
            }
          }

          for (var origin in installedApps) {
            GridManager.install(installedApps[origin]);
          }

          // Grid was loaded from DB
          updatePaginationBar(true);
          addLanguageListener();
        },
        function onerror() {
          // Error recovering info about apps
          renderFromMozApps();
        }
    );
  }

  /*
   * Renders the homescreen
   */
  function render() {
    Applications.addEventListener('ready', function onAppsReady() {
      dirCtrl = getDirCtrl();
      HomeState.init(renderFromDB, renderFromMozApps);
      localize();
    });
  }

  /*
   * UI Localization
   *
   * Currently we only translate the app names
   */
  function localize() {
    // set the 'lang' and 'dir' attributes to <html> when the page is translated
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;

    // switch RTL-sensitive methods accordingly
    dirCtrl = getDirCtrl();

    // translate each page
    var total = pageHelper.total();
    for (var i = 0; i < total; i++) {
      pages.list[i].translate();
    }
  }

  function addLanguageListener() {
    window.addEventListener('localized', localize);
  }

  /*
   * Checks empty pages and deletes them
   */
  function checkFirstPageWithGap() {
    var index = 0;
    var total = pages.total;

    var maxPerPage = pageHelper.getMaxPerPage();
    while (index < total) {
      var page = pages.list[index];
      if (page.getNumApps() < maxPerPage) {
        break;
      }
      index++;
    }

    return index;
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

  function updatePaginationBar(show) {
    PaginationBar.update(pages.current, pageHelper.total());
    if (show) {
      PaginationBar.show();
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

  var pageHelper = {
    /*
     * Adds a new page to the grid layout
     *
     * @param {Array} initial list of apps or icons
     */
    push: function(apps, appsFromMarket) {
      var index = this.total();
      var page = new Page(index);

      var pageElement = document.createElement('div');
      pageElement.className = 'page';
      container.appendChild(pageElement);

      page.render(apps, pageElement);

      if (!appsFromMarket) {
        if (index === 0) {
          page.moveToCenter();
        } else {
          page.moveToEnd();
        }
      }

      pages.list.push(page);
      pages.total = index + 1;

      if (!appsFromMarket) {
        updatePaginationBar();
      }
    },

    /*
     * Removes an specific page
     *
     * @param {int} index of the page
     */
    remove: function gm_remove(index) {
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
      pages.total--; // Reset total number of pages
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
      HomeState.save({
        id: index,
        apps: pages.list[index].getAppsList()
      });
    },

    /*
     * Saves all pages state on the database
     */
    saveAll: function() {
      HomeState.save(pages.list);
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

      if (dirCtrl.limitNext(x)) {
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
      } else if (dirCtrl.limitPrev(x)) {
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
      container.dataset.dragging = true;
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
      delete container.dataset.dragging;
      draggableIcon.onDragStop();
      // When the drag&drop is finished we need to check empty pages
      // and overflows
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
        var className = overlapElem.className;
        if (className === 'icon' || className === 'options') {
          var overlapElemOrigin = overlapElem.dataset.origin;
          pageHelper.getCurrent().drop(draggableIconOrigin, overlapElemOrigin);
        } else if (overlapElem.className === 'page') {
            var currentPage = pageHelper.getCurrent();
            var lastIcon = currentPage.getLastIcon();
            if (status.cCoords.y > lastIcon.getTop()
                && overlapElem !== lastIcon) {
              currentPage.drop(draggableIconOrigin, lastIcon.getOrigin());
            }
        }
      }
    }
  };

  return {
    /*
     * Initializes the grid manager
     *
     * @param {String} selector of the container for applications
     *
     */
    init: function gm_init(selector) {
      container = document.querySelector(selector);
      container.innerHTML = '';

      limits.left = container.offsetWidth * 0.08;
      limits.right = container.offsetWidth * 0.92;

      container.addEventListener('mousedown', this, true);
      container.addEventListener('resize', this, true);
      container.addEventListener('contextmenu', this);

      render();
    },

    /*
     * Event handling in the grid layout
     *
     * @param {Object} The event object from browser
     */
    handleEvent: function gm_handleEvent(evt) {
      status.target = evt.target;
      switch (evt.type) {
        case 'mousedown':
          onStartEvent(evt);
          break;
        case 'mousemove':
          onMoveEvent(evt);
          break;
        case 'mouseup':
          onEndEvent(evt);
          break;
        case 'resize':
          limits.left = container.offsetWidth * 0.08;
          limits.right = container.offsetWidth * 0.92;
          break;
        case 'contextmenu':
          keepPosition(); // Sadly clicking on icons could fire touchmove events
          GridManager.setMode('edit');
          if ('origin' in evt.target.dataset) {
            dragger.start(evt.target);
          }

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
    install: function gm_install(app) {
      var index = checkFirstPageWithGap();
      var origin = Applications.getOrigin(app);
      Applications.getManifest(origin).hidden = true;

      if (index < pages.total) {
        pages.list[index].append(app);
      } else {
        pageHelper.push([app], true);
      }

      goTo(index, function() {
        setTimeout(function() {
          pageHelper.getCurrent().
              applyInstallingEffect(Applications.getOrigin(app));
        }, 200);
      });

      // Saving the page
      pageHelper.save(index);
    },

    /*
     * Removes an application from the layout
     *
     * {Object} moz app
     */
    uninstall: function gm_uninstall(app) {
      var index = 0;
      var total = pages.total;
      var origin = Applications.getOrigin(app).toString();

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
    setMode: function gm_setMode(mode) {
      if (mode === 'normal' && this.isEditMode()) {
        // Save current state after edit mode
        pageHelper.saveAll();
      }

      if (this.onEditModeChange)
        this.onEditModeChange(mode);

      container.dataset.mode = currentMode = mode;
    },

    /*
     * Returns true if we are in edit mode
     */
    isEditMode: function gm_isEditMode() {
      return currentMode === 'edit';
    },

    /*
     * Exports the dirCtrl utils
     */
    get dirCtrl() { return dirCtrl; }
  };
})();
