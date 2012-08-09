
'use strict';

const GridManager = (function() {
  var container;

  var windowWidth = window.innerWidth;
  var thresholdForPanning = window.innerWidth / 4;
  var thresholdForTapping = 10;

  var dragging = false;

  var overlay = document.querySelector('#overlay');
  var opacityMax = .7;

  var pages = [];
  var currentPage = 0;

  // Limits for changing pages during dragging
  var limits = {
    left: 0,
    right: 0
  };

  var startEvent, isPanning = false;

  function handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        evt.stopPropagation();
        document.body.dataset.transitioning = 'true';

        startEvent = evt;
        attachEvents();
        break;

      case 'mousemove':
        evt.stopPropagation();

        // Starts dragging only when tapping does not make sense
        // anymore. The drag will then start from this point to avoid
        // a jump effect.
        if (!isPanning &&
            Math.abs(evt.clientX - startEvent.clientX) < thresholdForTapping) {
          return;
        } else if (!isPanning) {
          isPanning = true;
          startEvent = evt;
        }

        var deltaX = evt.clientX - startEvent.clientX;
        var len = pages.length;
        for (var i = 0; i < len; i++) {
          pages[i].moveBy((-currentPage + i) * windowWidth + deltaX);
        }
        setOverlayPanning(deltaX);
        break;

      case 'mouseup':
        evt.stopPropagation();
        if (!isPanning) {
          delete document.body.dataset.transitioning;
        } else {
          isPanning = false;
        }

        onTouchEnd(evt.clientX - startEvent.clientX, evt.target);
        break;

      case 'contextmenu':
        if (currentPage !== 0) {
          evt.stopPropagation();
          evt.preventDefault();
          Homescreen.setMode('edit');
          if ('origin' in evt.target.dataset) {
            DragDropManager.start(evt, {
              'x': startEvent.clientX,
              'y': startEvent.clientY
            });
          }
        }
        break;
    }
  }

  function setOverlayPanning(deltaX) {
    if (Homescreen.isInEditMode()) {
      return;
    }
    var forward = dirCtrl.goesForward(deltaX);
    if (currentPage === 0 && forward) {
      applyEffectOverlay((deltaX / windowWidth) * -opacityMax);
    } else if (currentPage === 1 && !forward) {
      applyEffectOverlay(opacityMax - ((deltaX / windowWidth) * opacityMax));
    }
  }

  function applyEffectOverlay(value, duration) {
    var style = overlay.style;
    if (duration) {
      style.MozTransition = 'opacity ' + duration + 's ease';
      overlay.addEventListener('transitionend', function end(e) {
        overlay.removeEventListener('transitionend', end);
        style.MozTransition = '';
      });
    }
    style.opacity = value;

  }

  function onTouchEnd(deltaX, target) {
    releaseEvents();

    if (Math.abs(deltaX) > thresholdForPanning) {
      var forward = dirCtrl.goesForward(deltaX);
      if (forward && currentPage < pageHelper.total() - 1) {
        goToPage(currentPage + 1);
      } else if (!forward && currentPage > 0) {
        goToPage(currentPage - 1);
      } else {
        goToPage(currentPage);
      }
    } else if (Math.abs(deltaX) < thresholdForTapping) {
      pageHelper.getCurrent().tap(target);
    } else {
      goToPage(currentPage);
    }
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

  function goToPage(index, callback) {
    if (index === 0 && currentPage === 1 && Homescreen.isInEditMode()) {
      index = 1;
    }

    var isSamePage = currentPage === index;
    if (!isSamePage) {
      delete pages[currentPage].container.dataset.currentPage;
      currentPage = index;
      pages[currentPage].container.dataset.currentPage = 'true';
    }

    container.addEventListener('transitionend', function transitionEnd(e) {
      container.removeEventListener('transitionend', transitionEnd);
      if (!dragging) {
        delete document.body.dataset.transitioning;
      }
      if (callback) {
        callback();
      }
    });

    var len = pages.length;
    for (var i = 0; i < len; i++) {
      pages[i].moveByWithEffect((-currentPage + i) * windowWidth, .3);
    }
    if (index === 0) {
      applyEffectOverlay(0, .3);
    } else if (index === 1) {
      applyEffectOverlay(opacityMax, .3);
    }

    if (!isSamePage) {
      updatePaginationBar();
    }
  }

  function goToNextPage(callback) {
    goToPage(currentPage + 1, callback);
  }

  function goToPreviousPage(callback) {
    goToPage(currentPage - 1, callback);
  }

  function updatePaginationBar() {
    PaginationBar.update(currentPage, pages.length);
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
   * UI Localization
   *
   */
  var dirCtrl = {};
  function getDirCtrl() {
    function goesLeft(x) { return (x > 0); }
    function goesRight(x) { return (x < 0); }
    function limitLeft(x) { return (x < limits.left); }
    function limitRight(x) { return (x > limits.right); }
    var rtl = (document.documentElement.dir == 'rtl');
    return {
      offsetPrev: rtl ? -1 : 1,
      offsetNext: rtl ? 1 : -1,
      limitPrev: rtl ? limitRight : limitLeft,
      limitNext: rtl ? limitLeft : limitRight,
      translatePrev: rtl ? 'translateX(100%)' : 'translateX(-100%)',
      translateNext: rtl ? 'translateX(-100%)' : 'translateX(100%)',
      goesForward: rtl ? goesLeft : goesRight
    };
  }

  function localize() {
    // switch RTL-sensitive methods accordingly
    dirCtrl = getDirCtrl();

    pages.forEach(function translate(page) {
      page.translate();
    });
  }

  function getFirstPageWithEmptySpace() {
    var maxPerPage = pageHelper.getMaxPerPage();

    var pagesCount = pageHelper.total();
    for (var i = 1; i < pagesCount; i++) {
      if (pages[i].getNumApps() < maxPerPage) {
        return i;
      }
    }

    return pagesCount;
  }

  function removeEmptyPages() {
    pages.forEach(function checkIsEmpty(page, index) {
      // ignore the search page
      if (index === 0) {
        return;
      }

      if (page.getNumApps() === 0) {
        pageHelper.remove(index);
      }
    });
  }

  /*
   * Checks number of apps per page
   *
   * It propagates icons in order to avoiding overflow in
   * pages with a number of apps greater that the maximum
   */
  function ensurePagesOverflow() {
    var max = pageHelper.getMaxPerPage();

    pages.forEach(function checkIsOverflow(page, index) {
      // ignore the search page
      if (index === 0) {
        return;
      }

      // if the page is not full
      if (page.getNumApps() <= max) {
        return;
      }

      var propagateIco = page.popIcon();
      if (index === pageHelper.total() - 1) {
        pageHelper.push([propagateIco]); // new page
      } else {
        pages[index + 1].prependIcon(propagateIco); // next page
      }
    });
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
      pages.push(page);

      var pageElement = document.createElement('div');
      pageElement.className = 'page';
      container.appendChild(pageElement);

      page.render(apps, pageElement);

      updatePaginationBar();
    },

    /*
     * Removes an specific page
     *
     * @param {int} index of the page
     */
    remove: function gm_remove(index) {
      goToPage(index - 1);

      pages[index].destroy(); // Destroy page
      pages.splice(index, 1); // Removes page from the list
      updatePaginationBar();
    },

    /*
     * Returns the total number of pages
     */
    total: function() {
      return pages.length;
    },

    /*
     * Saves the page state on the database
     */
    save: function(index) {
      HomeState.saveGrid({
        id: index,
        apps: pages[index].getAppsList()
      });
    },

    /*
     * Saves all pages state on the database
     */
    saveAll: function() {
      HomeState.saveGrid(pages.slice(1));
    },

    /*
     * Returns the total number of apps for each page. It could be
     * more clever. Currently there're twelve apps for page
     */
    getMaxPerPage: function() {
      return 4 * 4;
    },

    getNext: function() {
      return pages[currentPage + 1];
    },

    getPrevious: function() {
      return pages[currentPage - 1];
    },

    getCurrent: function() {
      return pages[currentPage];
    },

    getLast: function() {
      return pages[this.total() - 1];
    },

    getCurrentPageNumber: function() {
      return currentPage;
    },

    getTotalPagesNumber: function() {
      return pageHelper.total();
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
      for (var i = 0; i < container.children.length; i++) {
        var page = i === 0 ? new SearchPage(i) : new Page(i);
        page.render([], container.children[i]);
        pages.push(page);
      }

      container.addEventListener('mousedown', handleEvent, true);

      limits.left = container.offsetWidth * 0.05;
      limits.right = container.offsetWidth * 0.95;

      dirCtrl = getDirCtrl();
      renderFromDB(finish);
    },

    onDragStart: function gm_onDragSart() {
      releaseEvents();
      dragging = document.body.dataset.dragging = true;
    },

    onDragStop: function gm_onDragStop() {
      delete document.body.dataset.dragging;
      dragging = false;
      delete document.body.dataset.transitioning;
      ensurePagesOverflow();
      removeEmptyPages();
    },

    /*
     * Adds a new application to the layout when the user installed it
     * from market
     *
     * {Object} moz app
     */
    install: function gm_install(app, animation) {
      var index = getFirstPageWithEmptySpace();
      var origin = Applications.getOrigin(app);
      if (animation) {
        Applications.getManifest(origin).hidden = true;
      }

      if (index < pageHelper.total()) {
        pages[index].append(app);
      } else {
        pageHelper.push([app], true);
      }

      if (animation) {
        goToPage(index, function ins_goToPage() {
          pageHelper.getCurrent().
                    applyInstallingEffect(Applications.getOrigin(app));
        });
      }

      pageHelper.saveAll();
    },

    /*
     * Removes an application from the layout
     *
     * {Object} moz app
     */
    uninstall: function gm_uninstall(app) {
      var index = 0;
      var total = pageHelper.total();
      var origin = Applications.getOrigin(app).toString();

      while (index < total) {
        var page = pages[index];
        if (page.getIcon(origin)) {
          page.remove(app);
          break;
        }
        index++;
      }

      removeEmptyPages();
      pageHelper.saveAll();
    },

    saveState: function gm_saveState() {
      pageHelper.saveAll();
    },

    goToPage: goToPage,

    goToPreviousPage: goToPreviousPage,

    goToNextPage: goToNextPage,

    localize: localize,

    get dirCtrl() {
      return dirCtrl;
    },

    get pageHelper() {
      return pageHelper;
    }
  };
})();
