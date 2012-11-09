

'use strict';

const GridManager = (function() {
  var container;

  var windowWidth = window.innerWidth;
  var thresholdForPanning = window.innerWidth / 4;
  var thresholdForTapping = 10;

  var dragging = false;

  var opacityOnAppGridPageMax = .7;
  var kPageTransitionDuration = .3;
  var overlay = document.querySelector('#landing-overlay');
  var overlayStyle = overlay.style;
  var overlayTransition = 'opacity ' + kPageTransitionDuration + 's ease';

  var pages = [];
  var currentPage = 1;

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
        startEvent = evt;
        attachEvents();
        break;

      case 'mousemove':
        evt.stopPropagation();

        // Starts panning only when tapping does not make sense
        // anymore. The pan will then start from this point to avoid
        // a jump effect.
        var deltaX = evt.clientX - startEvent.clientX;
        if (!isPanning) {
          if (Math.abs(deltaX) < thresholdForTapping) {
            return;
          } else {
            isPanning = true;
            document.body.dataset.transitioning = 'true';
          }
        }

        // Panning time! Stop listening here to enter into a dedicated
        // method for panning only the 2 relevants pages based on the
        // direction of the inputs. The code here is carefully written
        // to avoid as much as possible allocations while panning.
        window.removeEventListener('mousemove', handleEvent);

        // Before panning pages that are directly next to the current
        // target are set visible.
        togglePagesVisibility(currentPage - 1, currentPage + 1);

        var index = currentPage;
        var previous = index ? pages[index - 1].container.style : {};
        previous.MozTransition = '';
        previous.MozTransform = 'translateX(' + (-windowWidth) + 'px)';

        var current = pages[index].container.style;
        current.MozTransition = '';

        var next =
          index < pages.length - 1 ? pages[index + 1].container.style : {};
        next.MozTransition = '';
        next.MozTransform = 'translateX(' + windowWidth + 'px)';

        var translate = 'translateX($px)';
        var startX = startEvent.clientX;
        var forward = deltaX > 0;

        var refresh;
        if (index === 0) {
          refresh = function(e) {
            if (deltaX <= 0) {
              next.MozTransform = translate.replace('$', windowWidth + deltaX);
              current.MozTransform = translate.replace('$', deltaX);
            }
          };
        } else if (index === pages.length - 1) {
          refresh = function(e) {
            if (deltaX >= 0) {
              previous.MozTransform =
                translate.replace('$', -windowWidth + deltaX);
              current.MozTransform = translate.replace('$', deltaX);
            }
          };
        } else {
          refresh = function(e) {
            if (deltaX >= 0) {
              previous.MozTransform =
                translate.replace('$', -windowWidth + deltaX);

              // If we change direction make sure there isn't any part
              // of the page on the other side that stays visible.
              if (!forward) {
                forward = true;
                next.MozTransform = translate.replace('$', windowWidth);
              }
            } else {
              next.MozTransform = translate.replace('$', windowWidth + deltaX);

              // If we change direction make sure there isn't any part
              // of the page on the other side that stays visible.
              if (forward) {
                forward = false;
                previous.MozTransform = translate.replace('$', -windowWidth);
              }
            }

            current.MozTransform = translate.replace('$', deltaX);
          };
        }

        // Generate a function accordingly to the current page position.
        if (Homescreen.isInEditMode() || currentPage > 2) {
          var pan = function(e) {
            deltaX = e.clientX - startX;
            window.mozRequestAnimationFrame(refresh);
          };
        } else {
          var pan = function(e) {
            deltaX = e.clientX - startX;
            window.mozRequestAnimationFrame(refresh);
            window.mozRequestAnimationFrame(function() {
              setOverlayPanning(index, deltaX, forward);
            });
          }
        }

        var container = pages[index].container;
        container.setCapture(true);
        container.addEventListener('mousemove', pan, true);

        window.addEventListener('mouseup', function removePanHandler(e) {
          window.removeEventListener('mouseup', removePanHandler, true);

          container.removeEventListener('mousemove', pan, true);
          document.releaseCapture();

          window.mozRequestAnimationFrame(function panTouchEnd() {
            onTouchEnd(deltaX);
          });
        }, true);
        break;

      case 'mouseup':
        evt.stopPropagation();
        releaseEvents();
        if (!isPanning) {
          pageHelper.getCurrent().tap(evt.target);
        }
        isPanning = false;
        break;

      case 'contextmenu':
        if (currentPage > 1 && 'origin' in evt.target.dataset) {
          evt.stopImmediatePropagation();
          Homescreen.setMode('edit');
          DragDropManager.start(evt, {
            'x': startEvent.clientX,
            'y': startEvent.clientY
          });
        }

        break;
    }
  }

  function setOverlayPanning(index, deltaX, forward) {
    if (index === 1) {
      overlayStyle.opacity = (Math.abs(deltaX) / windowWidth) * opacityOnAppGridPageMax;
    } else if (index === 0 && !forward || index === 2 && forward) {
      overlayStyle.opacity = opacityOnAppGridPageMax - (Math.abs(deltaX) / windowWidth)
                              * opacityOnAppGridPageMax;
    }
  }

  function applyEffectOverlay(index) {
    overlayStyle.MozTransition = overlayTransition;
    overlayStyle.opacity = index === 1 ? 0 : opacityOnAppGridPageMax;
  }

  function onTouchEnd(deltaX) {
    var page = currentPage;
    if (Math.abs(deltaX) > thresholdForPanning) {
      var forward = dirCtrl.goesForward(deltaX);
      if (forward && currentPage < pageHelper.total() - 1) {
        page = page + 1;
      } else if (!forward &&
                  (page === 1 || page >= 3 ||
                    (page === 2 && !Homescreen.isInEditMode()))) {
        page = page - 1;
      }
    }
    goToPage(page);
  }

  function attachEvents() {
    window.addEventListener('mousemove', handleEvent);
    window.addEventListener('mouseup', handleEvent);
  }

  function releaseEvents() {
    window.removeEventListener('mousemove', handleEvent);
    window.removeEventListener('mouseup', handleEvent);
  }

  function togglePagesVisibility(start, end) {
    for (var i = 0; i < pages.length; i++) {
      var pagediv = pages[i].container;
      if (i < start || i > end) {
        pagediv.style.display = 'none';
      } else {
        pagediv.style.display = 'block';
      }
    }
  }

  function goToPage(index, callback) {
    document.location.hash = (index == 1 ? 'root' : '');
    if (index < 0 || index >= pages.length)
      return;

    var goToPageCallback = function() {
      delete document.body.dataset.transitioning;
      if (callback) {
        callback();
      }

      previousPage.container.dispatchEvent(new CustomEvent('gridpagehideend'));
      newPage.container.dispatchEvent(new CustomEvent('gridpageshowend'));
      overlayStyle.MozTransition = '';
      togglePagesVisibility(index, index);
    }

    var previousPage = pages[currentPage];
    var newPage = pages[index];

    if (index >= currentPage) {
      var forward = 1;
      var start = currentPage;
      var end = index;
    } else {
      var forward = -1;
      var start = index;
      var end = currentPage;
    }
    applyEffectOverlay(index);

    togglePagesVisibility(start, end);

    currentPage = index;
    updatePaginationBar();

    if (previousPage == newPage) {
      goToPageCallback();
      newPage.moveByWithEffect(0, kPageTransitionDuration);
      return;
    }

    // Force a reflow otherwise the newPage appears immediately because it is
    // still considered display: none;
    newPage.container.getBoundingClientRect();

    previousPage.container.dispatchEvent(new CustomEvent('gridpagehidestart'));
    newPage.container.dispatchEvent(new CustomEvent('gridpageshowstart'));
    previousPage.moveByWithEffect(-forward * windowWidth,
                                  kPageTransitionDuration);
    newPage.moveByWithEffect(0, kPageTransitionDuration);

    container.addEventListener('transitionend', function transitionEnd(e) {
      container.removeEventListener('transitionend', transitionEnd);
      goToPageCallback();
    });
  }

  function goToNextPage(callback) {
    document.body.dataset.transitioning = 'true';
    goToPage(currentPage + 1, callback);
  }

  function goToPreviousPage(callback) {
    document.body.dataset.transitioning = 'true';
    goToPage(currentPage - 1, callback);
  }

  function updatePaginationBar() {
    PaginationBar.update(currentPage, pages.length);
  }

  /*
   * Renders the homescreen from moz applications
   */
  function renderFromMozApps(finish) {
    var apps = Applications.getAll();

    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('application/json');
    xhr.open('GET', 'js/init.json', true);
    xhr.send(null);

    xhr.onreadystatechange = function renderFromMozApps_init(evt) {
      if (xhr.readyState != 4)
        return;

      if (xhr.status == 0 || xhr.status == 200) {
        try {
          var init = JSON.parse(xhr.responseText);
          init.grid.forEach(function(page) {
            pageHelper.push(page);

            for (var i = apps.length - 1; i >= 0; i--) {
              if (page.indexOf(apps[i]['origin']) != -1) {
                apps.splice(i, 1);
              }
            }
          });

          for (var i = apps.length - 1; i >= 0; i--) {
            if (init.dock.indexOf(apps[i]['origin']) != -1) {
              apps.splice(i, 1);
            }
          }
          HomeState.saveShortcuts(init.dock);

          for (var i = apps.length - 1; i >= 0; i--) {
            if (init.hidden.indexOf(apps[i]['origin']) != -1) {
              apps.splice(i, 1);
            }
          }
          HomeState.saveHiddens(init.hidden);

        } catch (e) {
          dump('Failed parsing homescreen configuration file: ' + e + '\n');
        }

        var max = pageHelper.getMaxPerPage();
        var list = [];
        for (var i = 0; i < apps.length; i++) {
          list.push(apps[i]);
          if (list.length === max) {
            pageHelper.push(list);
            list = [];
          }
        }

        if (list.length > 0) {
          pageHelper.push(list);
        }

        // Renders pagination bar
        finish();

        // Saving initial state
        pageHelper.saveAll();
      }
    }
  }

  /*
   * Renders the homescreen from the database
   */
  function renderFromDB(finish) {
    var appsInDB = [];
    HomeState.getAppsByPage(
      function iterate(apps) {
        appsInDB = appsInDB.concat(apps);

        for (var app in apps) {
          Applications.cacheIcon(apps[app].origin, apps[app].icon);
        }
        pageHelper.push(apps.map(function(app) { return app.origin; }));
      },
      function onsuccess(results) {
        if (results === 0) {
          renderFromMozApps(finish);
          return;
        }

        var installedApps = Applications.getInstalledApplications();
        var len = appsInDB.length;
        for (var i = 0; i < len; i++) {
          var origin = appsInDB[i].origin;
          if (origin in installedApps) {
            delete installedApps[origin];
          }
        }

        DockManager.getShortcuts(function getShortcuts(shortcuts) {
          var len = shortcuts.length;
          for (var i = 0; i < len; i++) {
            var origin = shortcuts[i].origin || shortcuts[i];
            if (origin in installedApps) {
              Applications.cacheIcon(origin, shortcuts[i].icon);
              delete installedApps[origin];
            }
          }

          HomeState.getHiddens(function(hidden) {

            if (hidden) {
              var len = hidden.length;
              for (var i = 0; i < len; i++) {
                var origin = hidden[i].origin || hidden[i];
                if (origin in installedApps) {
                  delete installedApps[origin];
                }
              }
            }

            for (var origin in installedApps) {
              GridManager.install(installedApps[origin]);
            }

            updatePaginationBar();
            finish();
          });
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
    for (var i = 2; i < pagesCount; i++) {
      if (pages[i].getNumApps() < maxPerPage) {
        return i;
      }
    }

    return pagesCount;
  }

  function removeEmptyPages() {
    pages.forEach(function checkIsEmpty(page, index) {
      // ignore the landing page
      if (index <= 1) {
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
      // ignore the landing page
      if (index <= 1) {
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
      HomeState.saveGrid(pages.slice(2));
    },

    /*
     * Returns the total number of apps for each page. It could be
     * more clever. Currently there're sixteen apps for page
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
        var page = new Page(i);
        page.render([], container.children[i]);
        pages.push(page);
      }

      container.addEventListener('contextmenu', handleEvent);
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
        goToPage(index, function install_goToPage() {
          pageHelper.getCurrent().applyInstallingEffect(origin);
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
