
'use strict';

const GridManager = (function() {
  var container, homeContainer;

  var thresholdForPanning = window.innerWidth / 4;
  var thresholdForTapping = 10;

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

  var startEvent, currentEvent;

  function handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        evt.stopPropagation();

        startEvent = currentEvent = getCoordinates(evt);
        onTouchStart(currentEvent.x - startEvent.x);
        break;

      case 'mousemove':
        evt.stopPropagation();

        currentEvent = getCoordinates(evt);
        if (onTouchMove(currentEvent.x - startEvent.x)) {
          // Forward a mouse event to the homecontainer so it can
          // start to drag if needed.
          var e = document.createEvent('Event');
          e.initEvent('mousedown', true, true);
          e.pageX = currentEvent.x;
          homeContainer.dispatchEvent(e);
        }
        break;

      case 'mouseup':
        evt.stopPropagation();

        currentEvent = getCoordinates(evt);
        onTouchEnd(currentEvent.x - startEvent.x, evt.target);
        break;

      case 'resize':
        limits.left = container.offsetWidth * 0.05;
        limits.right = container.offsetWidth * 0.95;
        break;

      case 'contextmenu':
        evt.stopPropagation();
        evt.preventDefault();

        keepPosition(); // Sadly clicking on icons could fire touchmove events

        document.body.dataset.mode = 'edit';
        if ('origin' in evt.target.dataset) {
          DragDropManager.start(evt, startEvent);
        }
        break;
    }
  }

  function onTouchStart(deltaX) {
    document.body.dataset.transitioning = true;
    attachEvents();
  }

  function onTouchMove(deltaX) {
    if (!isRequestToLandingPage(deltaX)) {
      pan(deltaX);
      return true;
    }

    releaseEvents();
    keepPosition();
    return false;
  }

  function onTouchEnd(deltaX, target) {
    releaseEvents();
    
    var callback = function() {
      delete document.body.dataset.transitioning;
    }

    if (Math.abs(deltaX) > thresholdForPanning) {
      var currentPage = pages.current;
      var forward = dirCtrl.goesForward(deltaX);
      if (forward && currentPage < pages.total - 1) {
        goToNextPage(callback);
      } else if (!forward && currentPage > 0) {
        goToPreviousPage(callback);
      } else {
        keepPosition(callback);
      }
    } else if (Math.abs(deltaX) < thresholdForTapping) {
      pageHelper.getCurrent().tap(target);

      // Sometime poor devices fire touchmove events when users are only
      // tapping
      keepPosition(callback);
    } else {
      keepPosition(callback);
    }
  }

  // right-to-left compatibility
  var dirCtrl = {};
  function getDirCtrl() {
    function goesLeft(x) { return (x > 0); }
    function goesRight(x) { return (x < 0); }
    function limitLeft(x) { return (x < limits.left); }
    function limitRight(x) { return (x > limits.right); }
    var rtl = (document.documentElement.dir == 'rtl');
    return {
      offsetPrev: rtl ? 1 : -1,
      offsetNext: rtl ? -1 : 1,
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
    if ('touches' in evt) {
      evt = evt.touches[0];
    }

    return { x: evt.pageX, y: evt.pageY, timestamp: evt.timeStamp };
  }

  /*
   * This method moves the pages following the gesture of the user
   *
   * @param {int} the difference between the last and initial position
   */
  function pan(deltaX) {
    pageHelper.getCurrent().moveTo(deltaX);

    var currentPage = pages.current;
    if (currentPage > 0) {
      pageHelper.getPrevious().moveTo(dirCtrl.offsetPrev * deltaX);
    }

    if (currentPage < pages.total - 1) {
      pageHelper.getNext().moveTo(dirCtrl.offsetNext * deltaX);
    }
  }

  /*
   * This method is in charge of keeping the position of the
   * current page when the swipe is not enough for paginating
   */
  function keepPosition(callback) {
    var deltaX = startEvent.x - currentEvent.x;
    if (deltaX === 0) {
      if (callback) {
        callback();
      }
      return;
    }

    var currentPage = pages.current;

    if (currentPage > 0) {
      pageHelper.getPrevious().moveToBegin();
    }

    if (currentPage < pages.total - 1) {
      pageHelper.getNext().moveToEnd();
    }

    pageHelper.getCurrent().moveToCenter(callback);
  }

  /*
   * Page Navigation utils.
   */
  function goToPage(index, callback) {
    var currentPage = pages.current;

    if (currentPage === index) {
      callback();
      return;
    }

    if (currentPage < index) {
      pageHelper.getCurrent().moveToBegin();
    } else {
      pageHelper.getCurrent().moveToEnd();
    }

    pages.current = index;
    pageHelper.getCurrent().moveToCenter(callback);

    updatePaginationBar();
  }

  function goToNextPage(callback) {
    var currentPage = pageHelper.getCurrent();
    currentPage.moveToBegin();

    var nextPage = pageHelper.getNext();
    nextPage.moveToCenter(callback);

    pages.current++;
    updatePaginationBar();
  }

  function goToPreviousPage(callback) {
    var currentPage = pageHelper.getCurrent();
    currentPage.moveToEnd();

    var previousPage = pageHelper.getPrevious();
    previousPage.moveToCenter(callback);

    pages.current--;
    updatePaginationBar();
  }

  /*
   * Returns true when we are in the first page swiping from left to
   * right and not edit mode
   *
   * @param {int} horizontal movement from start and current position
   */
  function isRequestToLandingPage(deltaX) {
    return pages.current === 0 && deltaX >= thresholdForTapping &&
           document.body.dataset.mode === 'normal';
  }

  function attachEvents() {
    container.addEventListener('contextmenu', handleEvent);
    window.addEventListener('mousemove', handleEvent);
    window.addEventListener('mouseup', handleEvent);
  }

  function releaseEvents() {
    container.removeEventListener('contextmenu', handleEvent);
    window.removeEventListener('mousemove', handleEvent);
    window.removeEventListener('mouseup', handleEvent);
  }


  /*
   * Renders the homescreen from moz applications
   */
  function renderFromMozApps(finish) {
    DockManager.getShortcuts(function getShortcuts(shortcuts) {
      var max = pageHelper.getMaxPerPage();
      var list = [];

      var apps = Applications.getAll();
      for (var origin in apps) {
        if (shortcuts.indexOf(origin) === -1) {
          list.push(apps[origin]);
          if (list.length === max) {
            pageHelper.push(list);
            list = [];
          }
        }
      }

      if (list.length > 0) {
        pageHelper.push(list);
      }

      // Renders pagination bar
      updatePaginationBar();
      finish();

      // Saving initial state
      pageHelper.saveAll();
    });
  }

  /*
   * Renders the homescreen from the database
   */
  function renderFromDB(finish) {
    var appsInDB = [];
    HomeState.getAppsByPage(
      function iterate(apps) {
        pageHelper.push(apps);
        appsInDB = appsInDB.concat(apps);
      },
      function onsuccess(results) {
        if (results === 0) {
          renderFromMozApps(finish);
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

        DockManager.getShortcuts(function getShortcuts(shortcuts) {
          var len = shortcuts.length;
          for (var i = 0; i < len; i++) {
            var origin = shortcuts[i];
            if (origin in installedApps) {
              delete installedApps[origin];
            }
          }

          for (var origin in installedApps) {
            GridManager.install(installedApps[origin]);
          }

          updatePaginationBar();
          finish();
        });
      },
      function onerror() {
        // Error recovering info about apps
        renderFromMozApps(finish);
      }
    );
  }

  /*
   * Renders the homescreen
   */
  function render(finish) {
    dirCtrl = getDirCtrl();
    renderFromDB(finish);
    localize();
  }

  /*
   * UI Localization
   *
   * Currently we only translate the app names
   */
  function localize() {
    // switch RTL-sensitive methods accordingly
    dirCtrl = getDirCtrl();

    // translate each page
    var total = pageHelper.total();
    for (var i = 0; i < total; i++) {
      pages.list[i].translate();
    }
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

  var gridPageNumber = 1;

  function updatePaginationBar() {
    PaginationBar.update(pages.current + gridPageNumber,
                         pageHelper.total() + gridPageNumber);
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
      HomeState.saveGrid({
        id: index,
        apps: pages.list[index].getAppsList()
      });
    },

    /*
     * Saves all pages state on the database
     */
    saveAll: function() {
      HomeState.saveGrid(pages.list);
    },

    /*
     * Returns the total number of apps for each page. It could be
     * more clever. Currently there're twelve apps for page
     */
    getMaxPerPage: function() {
      return 4 * 4;
    },

    getNext: function() {
      return pages.list[pages.current + 1];
    },

    getPrevious: function() {
      return pages.list[pages.current - 1];
    },

    getCurrent: function() {
      return pages.list[pages.current];
    },

    getLast: function() {
      return pages.list[this.total() - 1];
    },

    getCurrentPageNumber: function() {
      return pages.current;
    },

    getTotalPagesNumber: function() {
      return pages.total;
    }
  };

  return {
    /*
     * Initializes the grid manager
     *
     * @param {String} selector of the container for applications
     *
     */
    init: function gm_init(selector, finish) {
      container = document.querySelector(selector);
      container.innerHTML = '';

      homeContainer = container.parentNode.parentNode;

      limits.left = container.offsetWidth * 0.05;
      limits.right = container.offsetWidth * 0.95;

      container.addEventListener('mousedown', handleEvent, true);
      container.addEventListener('resize', handleEvent, true);

      render(finish);
    },

    onDragStart: function gm_onDragSart() {
      releaseEvents();
      document.body.dataset.dragging = true;
    },

    onDragStop: function gm_onDragStop() {
      delete document.body.dataset.dragging;
      delete document.body.dataset.transitioning;
      checkOverflowPages();
      checkEmptyPages();
    },

    /*
     * Adds a new application to the layout when the user installed it
     * from market
     *
     * {Object} moz app
     */
    install: function gm_install(app, animation) {
      var index = checkFirstPageWithGap();
      var origin = Applications.getOrigin(app);
      if (animation) {
        Applications.getManifest(origin).hidden = true;
      }

      if (index < pages.total) {
        pages.list[index].append(app);
      } else {
        pageHelper.push([app], true);
      }

      if (animation) {
        goToPage(index, function() {
          setTimeout(function() {
            pageHelper.getCurrent().
              applyInstallingEffect(Applications.getOrigin(app));
          }, 200);
        });
      }

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

    saveState: function gm_saveState() {
      pageHelper.saveAll();
    },

    get dirCtrl() {
      return dirCtrl;
    },

    goToPage: goToPage,

    goToPreviousPage: goToPreviousPage,

    goToNextPage: goToNextPage,

    localize: localize,

    get pageHelper() {
      return pageHelper;
    }
  };
})();

