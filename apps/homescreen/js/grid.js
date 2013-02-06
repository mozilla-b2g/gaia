'use strict';

const GridManager = (function() {
  var MAX_ICONS_PER_PAGE = 4 * 4;
  var PREFERRED_ICON_SIZE = 60;
  var SAVE_STATE_TIMEOUT = 100;

  var container;

  var windowWidth = window.innerWidth;
  var panningThreshold = window.innerWidth / 4;
  var tapThreshold = Page.prototype.tapThreshold;

  var dragging = false;

  var opacityOnAppGridPageMax = .7;
  var kPageTransitionDuration = 300;
  var overlay, overlayStyle;
  var overlayTransition = 'opacity ' + kPageTransitionDuration + 'ms ease';

  var numberOfSpecialPages = 0, landingPage, prevLandingPage, nextLandingPage;
  var pages = [];
  var currentPage = 1;

  var saveStateTimeout = null;

  var appMgr = navigator.mozApps.mgmt;

  // Limits for changing pages during dragging
  var limits = {
    left: 0,
    right: 0
  };

  var startEvent, isPanning = false, deltaX, removePanHandler,
      dummy = function() {};

  var isTouch = 'ontouchstart' in window;
  var touchstart = isTouch ? 'touchstart' : 'mousedown';
  var touchmove = isTouch ? 'touchmove' : 'mousemove';
  var touchend = isTouch ? 'touchend' : 'mouseup';

  var getX = (function getXWrapper() {
    return isTouch ? function(e) { return e.touches[0].pageX } :
                     function(e) { return e.pageX };
  })();

  function handleEvent(evt) {
    switch (evt.type) {
      case touchstart:
        touchStartTimestamp = evt.timeStamp;
        startEvent = isTouch ? evt.touches[0] : evt;
        deltaX = 0;
        attachEvents();
        removePanHandler = dummy;
        isPanning = false;
        break;

      case touchmove:
        // Start panning immediately but only disable
        // the tap when we've moved far enough.
        deltaX = getX(evt) - startEvent.pageX;
        if (deltaX === 0)
          return;

        document.body.dataset.transitioning = 'true';

        // Panning time! Stop listening here to enter into a dedicated
        // method for panning only the 2 relevants pages based on the
        // direction of the inputs. The code here is carefully written
        // to avoid as much as possible allocations while panning.
        window.removeEventListener(touchmove, handleEvent);

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
        var startX = startEvent.pageX;
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

        // We should move the pages with the first touchmove event
        window.mozRequestAnimationFrame(refresh);

        // Generate a function accordingly to the current page position.
        if (Homescreen.isInEditMode() || currentPage > 2) {
          var pan = function(e) {
            deltaX = getX(e) - startX;
            if (!isPanning && Math.abs(deltaX) >= tapThreshold) {
              isPanning = true;
            }
            window.mozRequestAnimationFrame(refresh);
          };
        } else {
          var pan = function(e) {
            deltaX = getX(e) - startX;
            if (!isPanning && Math.abs(deltaX) >= tapThreshold) {
              isPanning = true;
            }
            window.mozRequestAnimationFrame(refresh);
            window.mozRequestAnimationFrame(function() {
              setOverlayPanning(index, deltaX, forward);
            });
          };
        }

        var container = pages[index].container;
        container.addEventListener(touchmove, pan, true);

        removePanHandler = function removePanHandler(e) {
          touchEndTimestamp = e ? e.timeStamp : Number.MAX_VALUE;
          window.removeEventListener(touchend, removePanHandler, true);

          container.removeEventListener(touchmove, pan, true);

          window.mozRequestAnimationFrame(function panTouchEnd() {
            onTouchEnd(deltaX, e);
          });
        };

        window.addEventListener(touchend, removePanHandler, true);
        window.removeEventListener(touchend, handleEvent);

        break;

      case touchend:
        releaseEvents();
        pageHelper.getCurrent().tap(evt.target);
        break;

      case 'contextmenu':
        if (isPanning) {
          evt.stopImmediatePropagation();
          return;
        }

        if (currentPage > landingPage && 'isIcon' in evt.target.dataset) {
          evt.stopImmediatePropagation();
          removePanHandler();
          Homescreen.setMode('edit');
          DragDropManager.start(evt, {
            'x': startEvent.pageX,
            'y': startEvent.pageY
          });
        }

        break;
    }
  }

  function setOverlayPanning(index, deltaX, forward) {
    if (index === landingPage && landingPage > 0) {
      overlayStyle.opacity = (Math.abs(deltaX) / windowWidth) *
                              opacityOnAppGridPageMax;
    } else if (index === prevLandingPage && !forward ||
               index === nextLandingPage && forward) {
      overlayStyle.opacity = opacityOnAppGridPageMax -
                     (Math.abs(deltaX) / windowWidth) * opacityOnAppGridPageMax;
    }
  }

  function applyEffectOverlay(index) {
    overlayStyle.MozTransition = overlayTransition;
    overlayStyle.opacity = index === landingPage ?
                           prevLandingPage : opacityOnAppGridPageMax;
  }

  function onTouchEnd(deltaX, evt) {
    var page = currentPage;
    /* Bigger than panning threshold or fast gesture */
    if (Math.abs(deltaX) > panningThreshold ||
        touchEndTimestamp - touchStartTimestamp < kPageTransitionDuration) {
      var forward = dirCtrl.goesForward(deltaX);
      if (forward && currentPage < pages.length - 1) {
        page = page + 1;
      } else if (!forward &&
                 (page === landingPage || page >= nextLandingPage + 1 ||
                    (page === nextLandingPage && !Homescreen.isInEditMode()))) {
        page = page - 1;
      }
    } else if (!isPanning && evt) {
      releaseEvents();
      pageHelper.getCurrent().tap(evt.target);
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

  var touchStartTimestamp = 0;
  var touchEndTimestamp = 0;
  var lastGoingPageTimestamp = 0;

  function goToPage(index, callback) {
    document.location.hash = (index === landingPage ? 'root' : '');
    if (index < 0 || index >= pages.length)
      return;

    var delay = touchEndTimestamp - lastGoingPageTimestamp ||
                kPageTransitionDuration;
    lastGoingPageTimestamp += delay;
    var duration = delay < kPageTransitionDuration ?
                   delay : kPageTransitionDuration;

    var goToPageCallback = function(dispatchEvents) {
      delete document.body.dataset.transitioning;
      if (callback) {
        callback();
      }

      if (dispatchEvents) {
        previousPage.container.dispatchEvent(new CustomEvent('gridpagehideend'));
        newPage.container.dispatchEvent(new CustomEvent('gridpageshowend'));
      }
      overlayStyle.MozTransition = '';
      togglePagesVisibility(index, index);
    };

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

    currentPage = index;
    updatePaginationBar();

    if (previousPage === newPage) {
      var borderingPagesToBeTranslated = false;

      if (index > 0 && pages[index - 1].container.style.display === 'block') {
        // Previous one displayed
        pages[index - 1].moveByWithEffect(-windowWidth, duration);
        borderingPagesToBeTranslated = true;
      }

      newPage.moveByWithEffect(0, duration);

      if (index < pages.length - 1 &&
          pages[index + 1].container.style.display === 'block') {
        // Next one displayed
        pages[index + 1].moveByWithEffect(windowWidth, duration);
        borderingPagesToBeTranslated = true;
      }

      if (borderingPagesToBeTranslated) {
        container.addEventListener('transitionend', function transitionEnd(e) {
          container.removeEventListener('transitionend', transitionEnd);
          goToPageCallback();
        });
      } else {
        goToPageCallback();
      }

      return;
    } else {
      togglePagesVisibility(start, end);
    }

    // Force a reflow otherwise the newPage appears immediately because it is
    // still considered display: none;
    newPage.container.getBoundingClientRect();

    previousPage.container.dispatchEvent(new CustomEvent('gridpagehidestart'));
    newPage.container.dispatchEvent(new CustomEvent('gridpageshowstart'));
    previousPage.moveByWithEffect(-forward * windowWidth, duration);
    newPage.moveByWithEffect(0, duration);

    container.addEventListener('transitionend', function transitionEnd(e) {
      container.removeEventListener('transitionend', transitionEnd);
      goToPageCallback(true);
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

  function getFirstPageWithEmptySpace() {
    for (var i = numberOfSpecialPages; i < pages.length; i++) {
      if (pages[i].getNumIcons() < MAX_ICONS_PER_PAGE) {
        return i;
      }
    }
    return pages.length;
  }

  function removeEmptyPages() {
    pages.forEach(function checkIsEmpty(page, index) {
      // ignore the landing page
      if (index < numberOfSpecialPages) {
        return;
      }

      if (page.getNumIcons() === 0) {
        pageHelper.remove(index);
        if (currentPage >= index)
          currentPage -= 1;
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
    pages.forEach(function checkIsOverflow(page, index) {
      // ignore the landing page
      if (index < numberOfSpecialPages) {
        return;
      }

      // if the page is not full
      while (page.getNumIcons() > MAX_ICONS_PER_PAGE) {
        var propagateIco = page.popIcon();
        if (index === pages.length - 1) {
          pageHelper.addPage([propagateIco]); // new page
        } else {
          pages[index + 1].prependIcon(propagateIco); // next page
        }
      }
    });
  }

  var pageHelper = {

    maxIconsPerPage: MAX_ICONS_PER_PAGE,

    /*
     * Adds a new page to the grid layout
     *
     * @param {Array} icons
     *                List of Icon objects.
     */
    addPage: function(icons) {
      var pageElement = document.createElement('div');
      var page = new Page(pageElement, icons);
      pages.push(page);

      pageElement.className = 'page';
      container.appendChild(pageElement);
      updatePaginationBar();
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
    },

    /*
     * Saves all pages state on the database
     */
    saveAll: function() {
      var state = pages.slice(numberOfSpecialPages);
      state.unshift(DockManager.page);
      for (var i = 0; i < state.length; i++) {
        var page = state[i];
        state[i] = {index: i, icons: page.getIconDescriptors()};
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
  var bookmarkIcons = Object.create(null);
  // Map 'manifestURL' + 'entry_point' to Icon object.
  var appIcons = Object.create(null);
  // Map 'origin' -> app object.
  var appsByOrigin = Object.create(null);
  // Map 'origin' for bookmarks -> bookmark object.
  var bookmarksByOrigin = Object.create(null);

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

  function getIconsForApp(app) {
    return appIcons[app.manifestURL];
  }

  function getIconForBookmark(bookmarkURL) {
    return bookmarkIcons[bookmarkURL];
  }

  // Ways to enumerate installed apps & bookmarks and find out whether
  // a certain "origin" is available as an existing installed app or
  // bookmark. Only used by Everything.me at this point.
  function getApps() {
    var apps = [];
    for (var origin in appsByOrigin) {
      apps.push(appsByOrigin[origin]);
    }
    return apps;
  }

  function getAppByOrigin(url) {
    return appsByOrigin[url];
  }


  /*
   * Initialize the UI.
   */
  function initUI(selector) {
    overlay = document.querySelector('#landing-overlay');
    overlayStyle = overlay.style;

    container = document.querySelector(selector);
    container.addEventListener('contextmenu', handleEvent);
    container.addEventListener(touchstart, handleEvent, true);

    limits.left = container.offsetWidth * 0.05;
    limits.right = container.offsetWidth * 0.95;

    setDirCtrl();

    // Create stub Page objects for the special pages that are
    // not backed by the app database. Note that this creates an
    // offset between these indexes here and the ones in the DB.
    // See also pageHelper.saveAll().
    numberOfSpecialPages = container.children.length;
    landingPage = numberOfSpecialPages - 1;
    prevLandingPage = landingPage - 1;
    nextLandingPage = landingPage + 1;
    for (var i = 0; i < container.children.length; i++) {
      var pageElement = container.children[i];
      var page = new Page(pageElement, null);
      pages.push(page);
    }
  }

  /*
   * Initialize the mozApps event handlers and synchronize our grid
   * state with the applications known to the system.
   */
  function initApps(apps) {
    appMgr.oninstall = function oninstall(event) {
     GridManager.install(event.application);
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
        processApp(app);
      });

      for (var origin in bookmarksByOrigin) {
        appsByOrigin[origin] = bookmarksByOrigin[origin];
      }
      bookmarksByOrigin = null;

      for (var manifestURL in iconsByManifestURL) {
        var iconsForApp = iconsByManifestURL[manifestURL];
        for (var entryPoint in iconsForApp) {
          var icon = iconsForApp[entryPoint];
          icon.remove();
          GridManager.markDirtyState();
        }
      }

      ensurePagesOverflow();
      removeEmptyPages();
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
      if (descriptor.bookmarkURL) {
        app = new Bookmark(descriptor);
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
  function processApp(app, callback) {
    // Ignore system apps.
    if (HIDDEN_APPS.indexOf(app.manifestURL) != -1)
      return;

    appsByOrigin[app.origin] = app;

    var manifest = app.manifest ? app.manifest : app.updateManifest;
    if (!manifest)
      return;

    var entryPoints = manifest.entry_points;
    if (!entryPoints || manifest.type != 'certified') {
      createOrUpdateIconForApp(app);
      return;
    }

    for (var entryPoint in entryPoints) {
      if (!entryPoints[entryPoint].icons)
        continue;

      createOrUpdateIconForApp(app, entryPoint);
    }
  }

  /*
   * Create or update a single icon for an Application (or Bookmark) object.
   */
  function createOrUpdateIconForApp(app, entryPoint) {
    // Make sure we update the icon/label when the app is updated.
    if (!app.isBookmark) {
      app.ondownloadapplied = function ondownloadapplied(event) {
        createOrUpdateIconForApp(event.application, entryPoint);
        app.ondownloadapplied = null;
        app.ondownloaderror = null;
      };
      app.ondownloaderror = function ondownloaderror(event) {
        createOrUpdateIconForApp(app, entryPoint);
      };
    }

    var manifest = app.manifest ? app.manifest : app.updateManifest;
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
      useAsyncPanZoom: app.useAsyncPanZoom
    };
    if (haveLocale && !app.isBookmark) {
      descriptor.localizedName = iconsAndNameHolder.name;
    }

    // If there's an existing icon for this bookmark/app/entry point already,
    // let it update itself.
    var existingIcon = getIcon(descriptor);
    if (existingIcon) {
      existingIcon.update(descriptor, app);
      return;
    }

    var icon = new Icon(descriptor, app);
    rememberIcon(icon);

    var index = getFirstPageWithEmptySpace();

    if (index < pages.length) {
      pages[index].appendIcon(icon);
    } else {
      pageHelper.addPage([icon]);
    }

    GridManager.markDirtyState();
  }

  /*
   * Shows a dialog to confirm the download retry
   * calls the method 'download'. That's applied
   * to an icon, that has associated an app already.
   */
  function showRestartDownloadDialog(icon) {
    var app = icon.app;
    var _ = navigator.mozL10n.get;
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


  return {
    /*
     * Initializes the grid manager
     *
     * @param {String} selector
     *                 Specifies the HTML container element for the pages.
     *
     */
    init: function gm_init(gridSelector, dockSelector, callback) {
      initUI(gridSelector);

      // Initialize the grid from the state saved in IndexedDB.
      HomeState.init(function eachPage(pageState) {
        // First 'page' is the dock.
        if (pageState.index == 0) {
          var dockContainer = document.querySelector(dockSelector);
          var dock = new Dock(dockContainer,
            convertDescriptorsToIcons(pageState));
          DockManager.init(dockContainer, dock);
          return;
        }
        pageHelper.addPage(convertDescriptorsToIcons(pageState));
      }, function onState() {
        initApps();
        callback();
      }, function onError(error) {
        var dockContainer = document.querySelector(dockSelector);
        var dock = new Dock(dockContainer, []);
        DockManager.init(dockContainer, dock);
        initApps();
        callback();
      });
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
      container.addEventListener(touchstart, handleEvent, true);
      ensurePagesOverflow();
      removeEmptyPages();
    },

    /*
     * Adds a new application to the layout when the user installed it
     * from market
     *
     * @param {Application} app
     *                      The application (or bookmark) object
     */
    install: function gm_install(app) {
      processApp(app);
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

      if (app.isBookmark) {
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

      if (updateDock)
        DockManager.afterRemovingApp();

      removeEmptyPages();
      this.markDirtyState();
    },

    markDirtyState: function gm_markDirtyState() {
      if (saveStateTimeout != null) {
        window.clearTimeout(saveStateTimeout);
      }
      saveStateTimeout = window.setTimeout(function saveStateTrigger() {
        saveStateTimeout = null;
        pageHelper.saveAll();
      }, SAVE_STATE_TIMEOUT);
    },

    getIcon: getIcon,

    getIconsForApp: getIconsForApp,

    getIconForBookmark: getIconForBookmark,

    getApps: getApps,

    getAppByOrigin: getAppByOrigin,

    goToPage: goToPage,

    goToPreviousPage: goToPreviousPage,

    goToNextPage: goToNextPage,

    localize: localize,

    dirCtrl: dirCtrl,

    pageHelper: pageHelper,

    get landingPage() {
      return landingPage;
    },

    showRestartDownloadDialog: showRestartDownloadDialog
  };
})();
