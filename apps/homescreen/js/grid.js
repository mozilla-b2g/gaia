'use strict';

var GridManager = (function() {
  // Be aware that the current manifest icon description syntax does
  // not distinguish between 60@1.5x and 90@1x, so we would have to use
  // the latter as the former.

  // use 100px icons for tablet
  var notTinyLayout = !ScreenLayout.getCurrentLayout('tiny');
  var PREFERRED_ICON_SIZE =
      (notTinyLayout ? 90 : 60) * (window.devicePixelRatio || 1);

  var SAVE_STATE_TIMEOUT = 100;
  var BASE_HEIGHT = 460; // 480 - 20 (status bar height)
  var DEVICE_HEIGHT = window.innerHeight;

  var HIDDEN_ROLES = ['system', 'input', 'homescreen', 'search'];

  // Store the pending apps to be installed until SingleVariant conf is loaded
  var pendingInstallRequests = [];

  function isHiddenApp(role) {
    if (!role) {
      return false;
    }
    return (HIDDEN_ROLES.indexOf(role) !== -1);
  }

  // Holds the list of single variant apps that have been installed
  // previously already
  var svPreviouslyInstalledApps = [];

  // XXX bug 911696 filter out launch_path
  var launchPathBlacklist = [];

  var container;

  var windowWidth = window.innerWidth;
  var swipeThreshold, swipeFriction, tapThreshold;

  var dragging = false;

  var defaultAppIcon, defaultBookmarkIcon;

  var kPageTransitionDuration;

  var pages = [];
  var currentPage = 0;

  var saveStateTimeout = null;

  var _ = navigator.mozL10n.get;

  // Limits for changing pages during dragging
  var limits = {
    left: 0,
    right: 0
  };

  var EVME_PAGE_STATE_INDEX = 1;

  var MAX_ICONS_PER_PAGE = 4 * 4;

  // Check if there is space for another row of icons
  // For WVGA, 800x480, we also want to show 4 x 5 grid on homescreen
  // the homescreen size would be 770 x 480, and 770/480 ~= 1.6
  if (DEVICE_HEIGHT - BASE_HEIGHT > BASE_HEIGHT / 5 ||
      DEVICE_HEIGHT / windowWidth >= 1.6) {
    MAX_ICONS_PER_PAGE += 4;
  }

  // tablet+ devices are stricted to 6 x 3 grid
  if (notTinyLayout) {
    MAX_ICONS_PER_PAGE = 6 * 3;
  }

  // The same number of icons by default
  var MAX_ICONS_PER_EVME_PAGE = MAX_ICONS_PER_PAGE;

  function setMaxIconsToSearchPage() {
    if (!document.body.classList.contains('searchPageEnabled')) {
      return;
    }

    // One row is consumed by the search bar
    MAX_ICONS_PER_EVME_PAGE -= 4;

    if (notTinyLayout) {
      MAX_ICONS_PER_EVME_PAGE -= 6;
    }
  }

  var startEvent, isPanning = false, startX, currentX, deltaX, removePanHandler,
      noop = function() {};

  var isTouch = 'ontouchstart' in window;
  var touchstart = isTouch ? 'touchstart' : 'mousedown';
  var touchmove = isTouch ? 'touchmove' : 'mousemove';
  var touchend = isTouch ? 'touchend' : 'mouseup';

  var getX = (function getXWrapper() {
    return isTouch ? function(e) { return e.touches[0].pageX; } :
                     function(e) { return e.pageX; };
  })();

  var panningResolver;

  function createPanningResolver() {
    // Get our configuration data from build/applications-data.js
    var configuration = Configurator.getSection('prediction') ||
      { enabled: false };

    // This algorithm is based on the change between events, so we need to
    // remember some things from the previous invocation
    var lookahead, lastPrediction, x0, t0, x1, t1 = 0, dx, velocity;

    function calculateVelocity(evt) {
      if (t1 < touchStartTimestamp) {
        // If this is the first move of this series, use the start event
        x0 = startX;
        t0 = touchStartTimestamp;
      } else {
        x0 = x1;
        t0 = t1;
      }

      x1 = currentX;
      t1 = evt.timeStamp;

      dx = x1 - x0;
      velocity = dx / (t1 - t0); // px/ms
    }

    var getDeltaX;
    // Assume that if we're using mouse events we're on a desktop that
    // is fast enough that we don't need to do this prediction.
    if (!isTouch || !configuration.enabled) {
      getDeltaX = function getDeltaX(evt) {
        calculateVelocity(evt);
        return currentX - startX;
      };
    } else {
      getDeltaX = function getDeltaX(evt) {
        calculateVelocity(evt);

        // If we've overshot too many times, don't predict anything
        if (lookahead === 0) {
          return currentX - startX;
        }

        // Guess how much extra motion we will have by the time the redraw
        // happens
        var adjustment = velocity * lookahead;

        // predict deltaX based on that extra motion
        var prediction = Math.round(x1 + adjustment - startX);

        // Make sure we don't return a prediction greater than the screen width
        if (prediction >= windowWidth) {
          prediction = windowWidth - 1;
        }
        else if (prediction <= -windowWidth) {
          prediction = -windowWidth + 1;
        }

        // If the change in the prediction has a different sign than the
        // change in the user's finger position, then we overshot: the
        // previous prediction was too large. So temporarily reduce the
        // lookahead so we don't overshoot as easily next time. Also,
        // return the last prediction to give the user's finger a chance
        // to catch up with where we've already panned to. If we don't
        // do this, the panning changes direction and looks jittery.
        if (lastPrediction !== null) {
          var deltaP = prediction - lastPrediction;
          if ((deltaP > 0 && dx < 0) || (deltaP < 0 && dx > 0)) {
            lookahead = lookahead >> 1;  // avoid future overshoots for this pan
            startX += deltaP;            // adjust for overshoot
            prediction = lastPrediction; // alter our prediction
          }
        }

        // Remember this for next time.
        lastPrediction = prediction;
        return prediction;
      };
    }

    return {
      reset: function reset() {
        lastPrediction = null;
        // Start each new touch with the configured lookahead value
        lookahead = configuration.lookahead;
        t1 = 0;
        velocity = 0;
      },

      // This will be a function that returns an actual or predicted deltaX
      // from a mouse or touch event
      getDeltaX: getDeltaX,

      // Returns the velocity of the swipe gesture in px/ms
      getVelocity: function getVelocity() {
        return velocity;
      }
    };
  }

  function tap(element) {
    releaseEvents();
    IconManager.cancelActive();
    pageHelper.getCurrent().tap(element, IconManager.removeActive);
  }

  function handleEvent(evt) {
    switch (evt.type) {
      case touchstart:
        if (currentPage)
          evt.stopPropagation();
        touchStartTimestamp = evt.timeStamp;
        startEvent = isTouch ? evt.touches[0] : evt;
        deltaX = 0;
        attachEvents();
        removePanHandler = noop;
        isPanning = false;
        IconManager.addActive(evt.target);
        panningResolver.reset();
        break;

      case touchmove:
        if (evt.preventPanning === true) {
          return;
        }

        // Start panning immediately but only disable
        // the tap when we've moved far enough.
        startX = startEvent.pageX;
        currentX = getX(evt);

        if (currentX === startX)
          return;

        document.body.dataset.transitioning = 'true';

        // Panning time! Stop listening here to enter into a dedicated
        // method for panning only the 2 relevants pages based on the
        // direction of the inputs. The code here is carefully written
        // to avoid as much as possible allocations while panning.
        window.removeEventListener(touchmove, handleEvent);

        var current = pages[currentPage].container.style;
        var forward = deltaX < 0;

        // Since we're panning, the icon we're over shouldn't be active
        IconManager.removeActive();

        var refresh;

        var previous, next, pan;

        if (currentPage === 0) {
          next = pages[currentPage + 1].container.style;
          refresh = function(e) {
            if (deltaX <= 0) {
              next.MozTransform =
                'translateX(' + (windowWidth + deltaX) + 'px)';
              current.MozTransform = 'translateX(' + deltaX + 'px)';
            } else {
              startX = currentX;
            }
          };
        } else if (currentPage === pages.length - 1) {
          previous = pages[currentPage - 1].container.style;
          refresh = function(e) {
            if (deltaX >= 0) {
              previous.MozTransform =
                'translateX(' + (-windowWidth + deltaX) + 'px)';
              current.MozTransform = 'translateX(' + deltaX + 'px)';
            } else {
              startX = currentX;
            }
          };
        } else {
          previous = pages[currentPage - 1].container.style;
          next = pages[currentPage + 1].container.style;
          refresh = function(e) {
            if (deltaX >= 0) {
              previous.MozTransform =
                'translateX(' + (-windowWidth + deltaX) + 'px)';

              // If we change direction make sure there isn't any part
              // of the page on the other side that stays visible.
              if (forward) {
                forward = false;
                next.MozTransform = 'translateX(' + windowWidth + 'px)';
              }
            } else {
              next.MozTransform =
                'translateX(' + (windowWidth + deltaX) + 'px)';

              // If we change direction make sure there isn't any part
              // of the page on the other side that stays visible.
              if (!forward) {
                forward = true;
                previous.MozTransform = 'translateX(-' + windowWidth + 'px)';
              }
            }

            current.MozTransform = 'translateX(' + deltaX + 'px)';
          };
        }

        pan = function(e) {
          e.preventDefault();
          e.stopImmediatePropagation();

          currentX = getX(e);
          deltaX = panningResolver.getDeltaX(e);

          if (!isPanning && Math.abs(deltaX) >= tapThreshold) {
            isPanning = true;
          }
          window.mozRequestAnimationFrame(refresh);
        };

        window.addEventListener(touchmove, pan, true);

        removePanHandler = function removePanHandler(e) {
          touchEndTimestamp = e ? e.timeStamp : 0;
          window.removeEventListener(touchend, removePanHandler, true);

          window.removeEventListener(touchmove, pan, true);

          window.mozRequestAnimationFrame(function panTouchEnd() {
            onTouchEnd(deltaX, e);
          });
        };

        window.addEventListener(touchend, removePanHandler, true);
        window.removeEventListener(touchend, handleEvent);

        // immediately start to pan
        pan(evt);

        break;

      case touchend:
        tap(evt.target);

        break;

      case 'wheel':
        if (evt.deltaMode === evt.DOM_DELTA_PAGE && evt.deltaX) {
          // XXX: Scroll one page at a time
          if (evt.deltaX > 0 && currentPage < pages.length - 1) {
            GridManager.goToNextPage();
          } else if (evt.deltaX < 0 && currentPage > 0) {
            GridManager.goToPreviousPage();
          }
          evt.stopPropagation();
          evt.preventDefault();
        }
        break;
    }
  }

  function contextmenu(evt) {
    if (isPanning) {
      return;
    }

    removePanHandler();
    Homescreen.setMode('edit');
    IconManager.removeActive();
    LazyLoader.load(['style/dragdrop.css', 'js/dragdrop.js'], function() {
      DragDropManager.init();
      DragDropManager.start(evt, {
        'x': startEvent.pageX,
        'y': startEvent.pageY
      });
    });
  }

  function cancelPanning() {
    removePanHandler();
  }

  function onTouchEnd(deltaX, evt) {
    var page = currentPage;

    var velocity = panningResolver.getVelocity();
    var distanceToTravel = 0.5 * Math.abs(velocity) * velocity / swipeFriction;
    // If the actual distance plus the coast distance is more than 40% the
    // screen, transition to the next page
    if (Math.abs(deltaX + distanceToTravel) > swipeThreshold) {
      var forward = dirCtrl.goesForward(deltaX);
      if (forward && currentPage < pages.length - 1) {
        page = page + 1;
      } else if (!forward && page > 0) {
        page = page - 1;
      }
    } else if (!isPanning && evt) {
      tap(evt.target);
    }

    goToPage(page);
  }

  function attachEvents() {
    window.addEventListener(touchmove, handleEvent);
    window.addEventListener(touchend, handleEvent);
  }

  function releaseEvents() {
    window.removeEventListener(touchmove, handleEvent);
    window.removeEventListener(touchend, handleEvent);
  }

  function exitFromEditMode() {
    markDirtyState();
    goToPage(currentPage);
  }

  function ensurePanning() {
    container.addEventListener(touchstart, handleEvent, true);
  }

  function markDirtyState() {
    if (saveStateTimeout != null) {
      window.clearTimeout(saveStateTimeout);
    }
    saveStateTimeout = window.setTimeout(function saveStateTrigger() {
      saveStateTimeout = null;
      pageHelper.saveAll();
      HomeState.saveSVInstalledApps(GridManager.svPreviouslyInstalledApps);
    }, SAVE_STATE_TIMEOUT);
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

  function goToPageCallback(index, fromPage, toPage, dispatchEvents, callback) {
    delete document.body.dataset.transitioning;

    if (dispatchEvents) {
      fromPage.container.dispatchEvent(new CustomEvent('gridpagehideend'));
      toPage.container.dispatchEvent(new CustomEvent('gridpageshowend'));
    }

    // We are going to prepare pages that are next to current page
    // for panning.

    if (index) {
      var previous = pages[index - 1].container.style;
      previous.MozTransition = '';
      previous.MozTransform = 'translateX(-' + windowWidth + 'px)';
    }

    if (index < pages.length - 1) {
      var next = pages[index + 1].container.style;
      next.MozTransition = '';
      next.MozTransform = 'translateX(' + windowWidth + 'px)';
    }

    var current = toPage.container.style;
    current.MozTransition = '';
    current.MozTransform = 'translateX(0)';

    fromPage.container.setAttribute('aria-hidden', true);
    toPage.container.removeAttribute('aria-hidden');

    togglePagesVisibility(index - 1, index + 1);

    if (callback) {
      setTimeout(callback, 0);
    }
  }

  var touchStartTimestamp = 0;
  var touchEndTimestamp = 0;
  var lastGoingPageTimestamp = 0;

  function goToPage(index, callback) {
    if (index < 0 || index >= pages.length)
      return;

    touchEndTimestamp = touchEndTimestamp || lastGoingPageTimestamp;
    var delay = touchEndTimestamp - lastGoingPageTimestamp ||
                kPageTransitionDuration;
    lastGoingPageTimestamp += delay;
    var duration = delay < kPageTransitionDuration ?
                   delay : kPageTransitionDuration;

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

    currentPage = index;
    updatePaginationBar();

    if (previousPage === newPage) {
      if (newPage.container.getBoundingClientRect().left !== 0) {
        // Pages are translated in X
        if (index > 0) {
          pages[index - 1].moveByWithEffect(-windowWidth, duration);
        }

        newPage.moveByWithEffect(0, duration);

        if (index < pages.length - 1) {
          pages[index + 1].moveByWithEffect(windowWidth, duration);
        }

        container.addEventListener('transitionend', function transitionEnd(e) {
          container.removeEventListener('transitionend', transitionEnd);
          goToPageCallback(index, previousPage, newPage, false, callback);
        });
      } else {
        // Swipe from rigth to left on the last page on the grid
        goToPageCallback(index, previousPage, newPage, false, callback);
      }

      return;
    }

    togglePagesVisibility(start, end);

    previousPage.container.dispatchEvent(new CustomEvent('gridpagehidestart'));
    newPage.container.dispatchEvent(new CustomEvent('gridpageshowstart'));
    previousPage.moveByWithEffect(-forward * windowWidth, duration);
    newPage.moveByWithEffect(0, duration);

    container.addEventListener('transitionend', function transitionEnd(e) {
      container.removeEventListener('transitionend', transitionEnd);
      goToPageCallback(index, previousPage, newPage, true, callback);
    });
  }

  function goToLandingPage() {
    document.body.dataset.transitioning = 'true';
    goToPage(0);
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

  function updatePageSetSize() {
    for (var i in pages) {
      var container = pages[i].container;
      container.setAttribute('aria-setsize', pages.length);
      container.setAttribute('aria-posinset', Number(i) + 1);
    }
  }

  /*
   * UI Localization
   *
   */
  var dirCtrl = {};
  function setDirCtrl() {
    function goesLeft(x) { return (x > 0); }
    function goesRight(x) { return (x < 0); }
    function limitLeft(x) { return (x < limits.left); }
    function limitRight(x) { return (x > limits.right); }
    var rtl = (document.documentElement.dir == 'rtl');

    dirCtrl.offsetPrev = rtl ? -1 : 1;
    dirCtrl.offsetNext = rtl ? 1 : -1;
    dirCtrl.limitPrev = rtl ? limitRight : limitLeft;
    dirCtrl.limitNext = rtl ? limitLeft : limitRight;
    dirCtrl.translatePrev = rtl ? 'translateX(100%)' : 'translateX(-100%)';
    dirCtrl.translateNext = rtl ? 'translateX(-100%)' : 'translateX(100%)';
    dirCtrl.goesForward = rtl ? goesLeft : goesRight;
  }

  var haveLocale = false;

  function localize() {
    // switch RTL-sensitive methods accordingly
    setDirCtrl();

    for (var manifestURL in appIcons) {
      var iconsForApp = appIcons[manifestURL];
      for (var entryPoint in iconsForApp) {
        iconsForApp[entryPoint].translate();
      }
    }

    for (var bookmarkURL in bookmarkIcons) {
      bookmarkIcons[bookmarkURL].translate();
    }

    haveLocale = true;
  }

  function getFirstPageWithEmptySpace(pageOffset) {
    pageOffset = pageOffset !== null && pageOffset ? pageOffset : 0;
    for (var i = pageOffset, page; page = pages[i++];) {
      if (page.hasEmptySlot()) {
        return i - 1;
      }
    }
    return pages.length;
  }

  function removeEmptyPages() {
    var oldCurrentPage = currentPage;

    pages.forEach(function checkIsEmpty(page, index) {
      // ignore the landing page
      if (index === 0) {
        return;
      }

      if (page.getNumIcons() === 0) {
        pageHelper.remove(index);
        if (currentPage >= index)
          currentPage -= 1;
      }
    });

    // If the current page index changes we have to go to that page
    if (oldCurrentPage > currentPage)
      goToPage(currentPage);
  }

  function pageOverflowed(page) {
    return page.getNumIcons() > page.maxIcons;
  }

  /*
   * Checks number of apps per page
   *
   * It propagates icons in order to avoiding overflow in
   * pages with a number of apps greater that the maximum
   */
  function ensurePagesOverflow(callback) {
    ensurePageOverflow(0, callback);
  }

  function ensurePageOverflow(index, callback) {
    var page = pages[index];
    if (!page) {
      callback();
      return; // There are not more pages
    }

    if (!pageOverflowed(page)) {
      ensurePageOverflow(index + 1, callback);
      return;
    }

    var propagateIco = page.popIcon();
    if (index === pages.length - 1) {
      propagateIco.loadRenderedIcon(function loaded(url) {
        pageHelper.addPage([propagateIco]); // new page
        window.URL.revokeObjectURL(url);
        ensurePageOverflow(pageOverflowed(page) ? index : index + 1, callback);
      });
    } else {
      propagateIco.loadRenderedIcon(function loaded(url) {
        pages[index + 1].prependIcon(propagateIco); // next page
        window.URL.revokeObjectURL(url);
        ensurePageOverflow(pageOverflowed(page) ? index : index + 1, callback);
      });
    }
  }

  var pageHelper = {

    maxIconsPerPage: MAX_ICONS_PER_PAGE,

    /*
     * Adds a new page to the grid layout
     *
     * @param {Array} icons
     *                List of Icon objects.
     */
    addPage: function(icons, numberOficons) {
      var pageElement = document.createElement('div');
      var page = new Page(pageElement, icons, numberOficons ||
                          MAX_ICONS_PER_PAGE);
      pages.push(page);

      pageElement.className = 'page';
      pageElement.setAttribute('role', 'region');
      container.appendChild(pageElement);

      // If the new page is situated right after the current displayed page,
      // makes it visible and move it to the right place.
      if (currentPage == pages.length - 2) {
        goToPage(currentPage);
      }

      updatePaginationBar();
      updatePageSetSize();
    },

    /*
     * Removes an specific page
     *
     * @param {int} index of the page
     */
    remove: function gm_remove(index) {
      pages[index].destroy(); // Destroy page
      pages.splice(index, 1); // Removes page from the list
      updatePaginationBar();
      updatePageSetSize();
    },

    /*
     * Saves all pages state on the database
     */
    saveAll: function() {
      var state = pages.slice(0);
      state.unshift(DockManager.page);
      for (var i = 0; i < state.length; i++) {
        var page = state[i];
        state[i] = {
          index: i,
          icons: page.getIconDescriptors()
        };
      }
      HomeState.saveGrid(state);
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
      return pages[pages.length - 1];
    },

    getCurrentPageNumber: function() {
      return currentPage;
    },

    getPage: function(index) {
      return pages[index];
    },

    /*
     * Returns the total number of pages
     */
    getTotalPagesNumber: function() {
      return pages.length;
    }
  };


  /*
   * Look up Icon objects using a descriptor containing 'manifestURL'
   * (optionally 'entry_point') or 'bookmarkURL'.
   */

  // Map 'bookmarkURL' -> Icon object.
  var bookmarkIcons;
  // Map 'manifestURL' + 'entry_point' to Icon object.
  var appIcons;
  // Map 'origin' -> app object.
  var appsByOrigin;
  // Map 'origin' for bookmarks -> bookmark object.
  var bookmarksByOrigin;

  function rememberIcon(icon) {
    var descriptor = icon.descriptor;
    if (descriptor.bookmarkURL) {
      bookmarkIcons[descriptor.bookmarkURL] = icon;
      return;
    }
    var iconsForApp = appIcons[descriptor.manifestURL];
    if (!iconsForApp)
      iconsForApp = appIcons[descriptor.manifestURL] = Object.create(null);

    iconsForApp[descriptor.entry_point || ''] = icon;
  }

  function forgetIcon(icon) {
    var descriptor = icon.descriptor;
    if (descriptor.bookmarkURL) {
      delete bookmarkIcons[descriptor.bookmarkURL];
      return;
    }
    var iconsForApp = appIcons[descriptor.manifestURL];
    if (!iconsForApp)
      return;

    delete iconsForApp[descriptor.entry_point || ''];
  }

  function getIcon(descriptor) {
    if (descriptor.bookmarkURL)
      return bookmarkIcons[descriptor.bookmarkURL];

    var iconsForApp = appIcons[descriptor.manifestURL];
    return iconsForApp && iconsForApp[descriptor.entry_point || ''];
  }

  function getIconByOrigin(origin, entryPoint) {
    var app = appsByOrigin[origin];
    return app ? getIcon(buildDescriptor(app, entryPoint)) : undefined;
  }

  function getIconsForApp(app) {
    return appIcons[app.manifestURL];
  }

  function getIconForBookmark(bookmarkURL) {
    return bookmarkIcons[bookmarkURL];
  }

  /**
   * Ways to enumerate installed apps & bookmarks and find
   * out whether a certain "origin" is available as an existing installed app or
   * bookmark. Only used by Everything.me at this point.
   * @param {Boolean} expands manifests with multiple entry points.
   * @param {Boolean} disallows hidden apps.
   * @return {Array} icon objects.
   */
  function getApps(expandApps, suppressHiddenRoles) {
    var apps = [];
    for (var origin in appsByOrigin) {
      var app = appsByOrigin[origin];

      // app.manifest is null until the downloadsuccess/downloadapplied event
      var manifest = app.manifest || app.updateManifest;

      if (!manifest || app.type === GridItemsFactory.TYPE.COLLECTION ||
          (suppressHiddenRoles && isHiddenApp(manifest.role))) {
        continue;
      }

      if (expandApps && manifest.entry_points) {
        var entryPoints = manifest.entry_points;
        for (var entryPoint in entryPoints) {
          if (!entryPoints[entryPoint].icons) {
            continue;
          }
          apps.push(new Icon(buildDescriptor(app, entryPoint), app));
        }
        continue;
      }

      apps.push(new Icon(buildDescriptor(app), app));
    }
    return apps;
  }

  function getApp(origin) {
    var app = appsByOrigin[origin];
    if (app) {
      return new Icon(buildDescriptor(app), app);
    }
    return null;
  }

  function getCollections() {
    var apps = [], app;
    for (var origin in appsByOrigin) {
      app = appsByOrigin[origin];
      if (app.type === GridItemsFactory.TYPE.COLLECTION) {
        apps.push(app);
      }
    }
    return apps;
  }


  /*
   * Initialize the UI.
   */
  function initUI(selector) {
    container = document.querySelector(selector);
    container.addEventListener('wheel', handleEvent);
    ensurePanning();

    limits.left = container.offsetWidth * 0.05;
    limits.right = container.offsetWidth * 0.95;

    setDirCtrl();

    // Create stub Page objects for the special pages that are
    // not backed by the app database. Note that this creates an
    // offset between these indexes here and the ones in the DB.
    // See also pageHelper.saveAll().
    for (var i = 0; i < container.children.length; i++) {
      var pageElement = container.children[i];
      var page = new Page(pageElement, null);
      pages.push(page);
    }

    panningResolver = createPanningResolver();
  }

  function addSVEventListener() {
    window.addEventListener('singlevariant-ready', function svFileReady(ev) {
      window.removeEventListener('singlevariant-ready', svFileReady);
      pendingInstallRequests.forEach(GridManager.install);
    });
  }

  /*
   * Initialize the mozApps event handlers and synchronize our grid
   * state with the applications known to the system.
   */
  function initApps(callback) {
    var appMgr = navigator.mozApps.mgmt;

    if (!appMgr) {
      setTimeout(callback);
      return;
    }

    appMgr.oninstall = function oninstall(event) {
      if (Configurator.isSingleVariantReady) {
        GridManager.install(event.application);
      } else {
        pendingInstallRequests.push(event.application);
      }
    };

    appMgr.onuninstall = function onuninstall(event) {
      GridManager.uninstall(event.application);
    };

    appMgr.getAll().onsuccess = function onsuccess(event) {
      // Create a copy of all icons we know about so we can find out which icons
      // should be removed.
      var iconsByManifestURL = Object.create(null);
      for (var manifestURL in appIcons) {
        iconsByManifestURL[manifestURL] = appIcons[manifestURL];
      }

      // Add an empty page where we drop the icons for any extra apps we
      // discover at this stage.
      pageHelper.addPage([]);

      var apps = event.target.result;
      apps.forEach(function eachApp(app) {
        delete iconsByManifestURL[app.manifestURL];
        processApp(app, null, EVME_PAGE_STATE_INDEX);
      });

      for (var origin in bookmarksByOrigin) {
        appsByOrigin[origin] = bookmarksByOrigin[origin];
      }
      bookmarksByOrigin = null;

      for (var manifestURL in iconsByManifestURL) {
        var iconsForApp = iconsByManifestURL[manifestURL];
        for (var entryPoint in iconsForApp) {
          if (entryPoint) {
            var icon = iconsForApp[entryPoint];
            icon.remove();
            markDirtyState();
          }
        }
      }

      ensurePagesOverflow(removeEmptyPages);

      callback();
    };
  }

  /*
   * Create Icon objects from the descriptors we save in IndexedDB.
   */
  function convertDescriptorsToIcons(pageState) {
    var icons = pageState.icons;
    for (var i = 0; i < icons.length; i++) {
      var descriptor = icons[i];
      // navigator.mozApps backed app will objects will be handled
      // asynchronously and therefore at a later time.
      var app = null;
      if (descriptor.bookmarkURL && !descriptor.type) {
        // pre-1.3 bookmarks
        descriptor.type = GridItemsFactory.TYPE.BOOKMARK;
      }

      if (descriptor.type === GridItemsFactory.TYPE.BOOKMARK ||
          descriptor.type === GridItemsFactory.TYPE.COLLECTION ||
          descriptor.role === GridItemsFactory.TYPE.COLLECTION) {
        if (descriptor.manifestURL) {
          // At build time this property is manifestURL instead of bookmarkURL
          descriptor.id = descriptor.bookmarkURL = descriptor.manifestURL;
          descriptor.type = GridItemsFactory.TYPE.COLLECTION;
        }
        app = GridItemsFactory.create(descriptor);
        if (haveLocale && app.type === GridItemsFactory.TYPE.COLLECTION) {
          descriptor.localizedName = _(app.manifest.name);
        }
        bookmarksByOrigin[app.origin] = app;
      }

      var icon = icons[i] = new Icon(descriptor, app);
      rememberIcon(icon);
    }
    return icons;
  }

  /*
   * Process an Application object as retrieved from the
   * navigator.mozApps.mgmt API (or a Bookmark object) and create
   * corresponding icon(s) for it (an app can have multiple entry
   * points, each one is represented as an icon.)
   */
  function processApp(app, callback, gridPageOffset, gridPosition) {
    appsByOrigin[app.origin] = app;

    var manifest = app.manifest ? app.manifest : app.updateManifest;
    if (!manifest)
      return;

    var entryPoints = manifest.entry_points;
    if (!entryPoints || manifest.type !== 'certified') {
      createOrUpdateIconForApp(app, null, gridPageOffset, gridPosition);
      return;
    }

    for (var entryPoint in entryPoints) {
      if (!entryPoints[entryPoint].icons)
        continue;

      // do the normal procedure
      if (launchPathBlacklist.length === 0) {
        createOrUpdateIconForApp(app, entryPoint, gridPageOffset, gridPosition);
        continue;
      }

      var found = false;
      // filtering with blacklist
      for (var i = 0, elemNum = launchPathBlacklist.length;
         i < elemNum; i++) {
        if (entryPoints[entryPoint].launch_path === launchPathBlacklist[i]) {
          found = true;
          break;
        }
      }

      if (!found) {
        createOrUpdateIconForApp(app, entryPoint, gridPageOffset, gridPosition);
      }
    }
  }

  /*
    Detect if an app can work offline
  */
  function isHosted(app) {
    if (app.origin) {
      return app.origin.indexOf('app://') === -1;
    }

    return false;
  }

  function hasOfflineCache(app) {
    if (app.type === GridItemsFactory.TYPE.COLLECTION) {
      return true;
    } else {
      var manifest = app ? app.manifest || app.updateManifest : null;
      return manifest.appcache_path != null;
    }
  }

  /*
   * Add the manifest to the array of installed singlevariant apps
   * @param {string} app's manifest to add
   */
  function addPreviouslyInstalled(manifest) {
    if (!isPreviouslyInstalled(manifest)) {
      svPreviouslyInstalledApps.push({'manifest': manifest});
    }
  }

  /*
   * Return true if manifest is in the array of installed singleVariant apps,
   * false otherwise
   * @param {string} app's manifest consulted
   */
  function isPreviouslyInstalled(manifest) {
    for (var i = 0, elemNum = svPreviouslyInstalledApps.length;
         i < elemNum; i++) {
      if (svPreviouslyInstalledApps[i].manifest === manifest) {
        return true;
      }
    }
    return false;
  }

  /*
   * SV - Return the single operator app (identify by manifest) or undefined
   * if the manifesURL doesn't correspond with a SV app
   */
  function getSingleVariantApp(manifestURL) {
    var singleVariantApps = Configurator.getSingleVariantApps();
    if (manifestURL in singleVariantApps) {
      var app = singleVariantApps[manifestURL];
      if (app.screen !== undefined && app.location !== undefined) {
        return app;
      }
    }
  }


  /*
   * Builds a descriptor for an icon object
   */
  function buildDescriptor(app, entryPoint) {
    var manifest = app.manifest ? app.manifest : app.updateManifest;

    if (!manifest)
      return;

    var iconsAndNameHolder = manifest;
    if (entryPoint)
      iconsAndNameHolder = manifest.entry_points[entryPoint];

    iconsAndNameHolder = new ManifestHelper(iconsAndNameHolder);

    var descriptor = {
      bookmarkURL: app.bookmarkURL,
      manifestURL: app.manifestURL,
      entry_point: entryPoint,
      updateTime: app.updateTime,
      removable: app.removable,
      name: iconsAndNameHolder.name,
      icon: bestMatchingIcon(app, iconsAndNameHolder),
      useAsyncPanZoom: app.useAsyncPanZoom,
      isHosted: isHosted(app),
      hasOfflineCache: hasOfflineCache(app),
      type: app.type,
      id: app.id
    };

    if (haveLocale) {
      if (app.type === GridItemsFactory.TYPE.COLLECTION) {
        descriptor.localizedName = _(manifest.name);
      } else if (app.type !== GridItemsFactory.TYPE.BOOKMARK) {
        descriptor.localizedName = iconsAndNameHolder.name;
      }
    }

    return descriptor;
  }

  function createOrUpdateIconForApp(app, entryPoint, gridPageOffset,
                                    gridPosition) {
    // Make sure we update the icon/label when the app is updated.
    if (app.type !== GridItemsFactory.TYPE.COLLECTION &&
        app.type !== GridItemsFactory.TYPE.BOOKMARK) {
      app.ondownloadapplied = function ondownloadapplied(event) {
        createOrUpdateIconForApp(event.application, entryPoint);
        app.ondownloadapplied = null;
        app.ondownloaderror = null;
      };
      app.ondownloaderror = function ondownloaderror(event) {
        createOrUpdateIconForApp(app, entryPoint);
      };
    }

    var descriptor = buildDescriptor(app, entryPoint);

    // If there's an existing icon for this bookmark/app/entry point already,
    // let it update itself.
    var existingIcon = getIcon(descriptor);
    if (existingIcon) {
      if (app.manifest && isHiddenApp(app.manifest.role)) {
        existingIcon.remove();
      } else {
        existingIcon.update(descriptor, app);
      }
      markDirtyState();
      return;
    }

    // If we have manifest and no updateManifest, do not add the icon:
    // this is especially the case for pre-installed hidden apps, like
    // keyboard, system, etc.
    if (app.manifest && !app.updateManifest &&
        isHiddenApp(app.manifest.role)) {
      return;
    }

    var icon = new Icon(descriptor, app);
    rememberIcon(icon);

    var index;
    if (gridPosition) {
      index = gridPosition.page || 0;
      pages[index].appendIconAt(icon, gridPosition.index || 0);
    } else {
      var svApp = getSingleVariantApp(app.manifestURL);
      if (svApp && !isPreviouslyInstalled(app.manifestURL)) {
        index = svApp.screen;
        icon.descriptor.desiredPos = svApp.location;
        if (!Configurator.isSimPresentOnFirstBoot && index < pages.length &&
            !pages[index].hasEmptySlot()) {
          index = getFirstPageWithEmptySpace(index);
        } else {
          icon.descriptor.desiredScreen = index;
        }
      } else {
        index = getFirstPageWithEmptySpace(gridPageOffset);
      }

      var iconLst = [icon];
      while (iconLst.length > 0) {
        icon = iconLst.shift();
        index = icon.descriptor.desiredScreen || index;
        if (index < pages.length) {
          iconLst = iconLst.concat(pages[index].getMisplacedIcons(index));
          pages[index].appendIcon(icon);
        } else {
          pageHelper.addPage([icon]);
        }
      }
    }

    markDirtyState();
  }

  /*
   * Shows a dialog to confirm the download retry
   * calls the method 'download'. That's applied
   * to an icon, that has associated an app already.
   */
  function doShowRestartDownloadDialog(icon) {
    var app = icon.app;
    var confirm = {
      title: _('download'),
      callback: function onAccept() {
        app.download();
        app.ondownloaderror = function(evt) {
          icon.showCancelled();
          icon.updateAppStatus(evt.application);
        };
        app.onprogress = function onProgress(evt) {
          app.onprogress = null;
          icon.updateAppStatus(evt.application);
        };
        icon.showDownloading();
        ConfirmDialog.hide();
      },
      applyClass: 'recommend'
    };

    var cancel = {
      title: _('cancel'),
      callback: ConfirmDialog.hide
    };

    var localizedName = icon.descriptor.localizedName || icon.descriptor.name;
    ConfirmDialog.show(_('restart-download-title'),
      _('restart-download-body', {'name': localizedName}),
      cancel,
      confirm);
    return;
  }

  function showRestartDownloadDialog(icon) {
    LazyLoader.load(['shared/style/buttons.css',
                     'shared/style/headers.css',
                     'shared/style/confirm.css',
                     'style/request.css',
                     document.getElementById('confirm-dialog'),
                     'js/request.js'], function loaded() {
      doShowRestartDownloadDialog(icon);
    });
  }

  function bestMatchingIcon(app, manifest) {
    if (app.installState === 'pending') {
      return app.downloading ?
        Icon.prototype.DOWNLOAD_ICON_URL :
        Icon.prototype.CANCELED_ICON_URL;
    }
    var icons = manifest.icons;
    if (!icons) {
      return getDefaultIcon(app);
    }

    var preferredSize = Number.MAX_VALUE;
    var max = 0;

    for (var size in icons) {
      size = parseInt(size, 10);
      if (size > max)
        max = size;

      if (size >= PREFERRED_ICON_SIZE && size < preferredSize)
        preferredSize = size;
    }
    // If there is an icon matching the preferred size, we return the result,
    // if there isn't, we will return the maximum available size.
    if (preferredSize === Number.MAX_VALUE)
      preferredSize = max;

    var url = icons[preferredSize];
    if (!url) {
      return getDefaultIcon(app);
    }

    // If the icon path is not an absolute URL, prepend the app's origin.
    if (url.indexOf('data:') == 0 ||
        url.indexOf('app://') == 0 ||
        url.indexOf('http://') == 0 ||
        url.indexOf('https://') == 0)
      return url;

    if (url.charAt(0) != '/') {
      console.warn('`' + manifest.name + '` app icon is invalid. ' +
                   'Manifest `icons` attribute should contain URLs -or- ' +
                   'absolute paths from the origin field.');
      return getDefaultIcon(app);
    }

    if (app.origin.slice(-1) == '/')
      return app.origin.slice(0, -1) + url;

    return app.origin + url;
  }

  function calculateDefaultIcons() {
    defaultAppIcon = new TemplateIcon();
    defaultAppIcon.loadDefaultIcon();
    defaultBookmarkIcon = new TemplateIcon(true);
    defaultBookmarkIcon.loadDefaultIcon();
  }

  var defaults = {
    gridSelector: '.apps',
    dockSelector: '.dockWrapper'
  };

  function doInit(options, callback) {
    calculateDefaultIcons();
    pages = [];
    bookmarkIcons = Object.create(null);
    appIcons = Object.create(null);
    appsByOrigin = Object.create(null);
    bookmarksByOrigin = Object.create(null);

    initUI(options.gridSelector);

    tapThreshold = options.tapThreshold;
    swipeThreshold = windowWidth * options.swipeThreshold;
    swipeFriction = options.swipeFriction || defaults.swipeFriction; // Not zero
    kPageTransitionDuration = options.swipeTransitionDuration;

    setMaxIconsToSearchPage();

    IconRetriever.init();

    // Initialize the grid from the state saved in IndexedDB.
    HomeState.init(function eachPage(pageState) {
      // First 'page' is the dock.
      if (pageState.index === 0) {
        var dockContainer = document.querySelector(options.dockSelector);
        var dock = new Dock(dockContainer,
          convertDescriptorsToIcons(pageState));
        DockManager.init(dockContainer, dock, tapThreshold);
        return;
      }

      var pageIcons = convertDescriptorsToIcons(pageState),
          numberOfIcons = pageState.index === EVME_PAGE_STATE_INDEX ?
          MAX_ICONS_PER_EVME_PAGE : MAX_ICONS_PER_PAGE;

      pageHelper.addPage(pageIcons, numberOfIcons);
    }, function onSuccess() {
      initApps(callback);
    }, function onError(error) {
      var dockContainer = document.querySelector(options.dockSelector);
      var dock = new Dock(dockContainer, []);
      DockManager.init(dockContainer, dock, tapThreshold);
      initApps(callback);
    }, function eachSVApp(svApp) {
      GridManager.svPreviouslyInstalledApps.push(svApp);
    });
  }

  return {

    hiddenRoles: HIDDEN_ROLES,

    svPreviouslyInstalledApps: svPreviouslyInstalledApps,
    isPreviouslyInstalled: isPreviouslyInstalled,
    addPreviouslyInstalled: addPreviouslyInstalled,

    /*
     * Initializes the grid manager
     *
     * @param {Object} Hash of options passed from GridManager.init
     *
     * @param {Function} Success callback
     *
     */
    init: function gm_init(options, callback) {
      // Add listener which will alert us when the SingleVariant configuration
      // file has been read
      addSVEventListener();

      // Populate defaults
      for (var key in defaults) {
        if (typeof options[key] === 'undefined') {
          options[key] = defaults[key];
        }
      }

      // XXX bug 911696 get entrypoints blacklist from settings
      // then doInit
      if ('mozSettings' in navigator) {
        var key = 'app.launch_path.blacklist';
        var req = navigator.mozSettings.createLock().get(key);
        req.onsuccess = function onsuccess() {
          launchPathBlacklist = req.result[key] || [];
          doInit(options, callback);
        };
      } else {
        doInit(options, callback);
      }
    },

    onDragStart: function gm_onDragSart() {
      releaseEvents();
      container.removeEventListener(touchstart, handleEvent, true);
      dragging = document.body.dataset.dragging = true;
    },

    onDragStop: function gm_onDragStop() {
      delete document.body.dataset.dragging;
      dragging = false;
      delete document.body.dataset.transitioning;
      ensurePanning();
      ensurePagesOverflow(removeEmptyPages);
    },

    /*
     * Adds a new application to the layout when the user installed it
     * from market
     *
     * @param {Application} app
     *                      The application (or bookmark) object
     * @param {Object}      gridPageOffset
     *                      Position to install the app: number (page index)
     * @param {Object}      extra
     *                      Optional parameters
     */
    install: function gm_install(app, gridPageOffset, extra) {
      extra = extra || {};

      processApp(app, null, gridPageOffset);

      if (extra.callback) {
        extra.callback();
      }
    },

    /*
     * Removes an application from the layout
     *
     * @param {Application} app
     *                      The application object that's to be uninstalled.
     */
    uninstall: function gm_uninstall(app) {
      var updateDock = false;
      var dock = DockManager.page;

      delete appsByOrigin[app.origin];

      if (app.type === GridItemsFactory.TYPE.COLLECTION ||
          app.type === GridItemsFactory.TYPE.BOOKMARK) {
        var icon = bookmarkIcons[app.bookmarkURL];
        updateDock = dock.containsIcon(icon);
        icon.remove();
        delete bookmarkIcons[app.bookmarkURL];
      } else {
        var iconsForApp = appIcons[app.manifestURL];
        if (!iconsForApp)
          return;

        for (var entryPoint in iconsForApp) {
          var icon = iconsForApp[entryPoint];
          updateDock = updateDock || dock.containsIcon(icon);
          icon.remove();
        }
        delete appIcons[app.manifestURL];
      }

      if (app.type === GridItemsFactory.TYPE.COLLECTION) {
        window.dispatchEvent(new CustomEvent('collectionUninstalled', {
          'detail': {
            'collection': app
          }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('appUninstalled', {
          'detail': {
            'descriptor': buildDescriptor(app)
          }
        }));
      }

      if (updateDock)
        DockManager.afterRemovingApp();

      removeEmptyPages();
      markDirtyState();
    },

    markDirtyState: markDirtyState,

    getIcon: getIcon,

    getIconByOrigin: getIconByOrigin,

    getIconsForApp: getIconsForApp,

    getIconForBookmark: getIconForBookmark,

    getApp: getApp,

    getApps: getApps,

    getCollections: getCollections,

    goToPage: goToPage,

    goToPreviousPage: goToPreviousPage,

    goToNextPage: goToNextPage,

    goToLandingPage: goToLandingPage,

    localize: localize,

    dirCtrl: dirCtrl,

    pageHelper: pageHelper,

    getBlobByDefault: function(app) {
      if (app && app.iconable) {
        return defaultBookmarkIcon.descriptor.renderedIcon;
      } else {
        return defaultAppIcon.descriptor.renderedIcon;
      }
    },

    showRestartDownloadDialog: showRestartDownloadDialog,

    exitFromEditMode: exitFromEditMode,

    ensurePanning: ensurePanning,

    ensurePagesOverflow: ensurePagesOverflow,

    contextmenu: contextmenu,

    cancelPanning: cancelPanning,

    get container() {
      return container;
    }
  };
})();
