
'use strict';

var Homescreen = (function() {
  var mode = 'normal';
  var origin = document.location.protocol + '//homescreen.' +
    document.location.host.replace(/(^[\w\d]+.)?([\w\d]+.[a-z]+)/, '$2');
  var iconGrid = document.getElementById('icongrid');

  var initialized = false;
  onConnectionChange(navigator.onLine);

  function initialize(lPage, onInit) {
    if (initialized) {
      return;
    }

    PaginationBar.init('.paginationScroller');

    initialized = true;

    var swipeSection = Configurator.getSection('swipe');
    var options = {
      gridSelector: '.apps',
      dockSelector: '.dockWrapper',
      tapThreshold: Configurator.getSection('tap_threshold'),
      // It defines the threshold to consider a gesture like a swipe. Number
      // in the range 0.0 to 1.0, both included, representing the screen width
      swipeThreshold: swipeSection.threshold,
      swipeFriction: swipeSection.friction,
      swipeTransitionDuration: swipeSection.transition_duration
    };

    GridManager.init(options, function gm_init() {
      navigator.mozL10n.ready(GridManager.localize.bind(GridManager));

      window.addEventListener('hashchange', function() {
        if (!window.location.hash.replace('#', '')) {
          return;
        }

        // this happens when the user presses the 'home' button
        if (Homescreen.didEvmePreventHomeButton()) {
          // nothing to do here, just prevent any other actions
        } else if (Homescreen.isInEditMode()) {
          exitFromEditMode();
        } else {
          GridManager.goToLandingPage();
        }
        GridManager.ensurePanning();
      });

      PaginationBar.show();
      if (document.location.hash === '#root') {
        // Switch to the first page only if the user has not already
        // start to pan while home is loading
        GridManager.goToLandingPage();
      }

      document.body.addEventListener('contextmenu', onContextMenu);
      IconManager.init(Configurator.getSection('tap_effect_delay'));

      if (typeof onInit === 'function') {
        onInit();
      }
    });
  }

  function onContextMenu(evt) {
    // See Bug 1011389 - [APZ] Click events are fired after a long press, even
    // if the user has moved the finger
    evt.preventDefault();
    evt.stopPropagation();

    var target = evt.target;

    if ('isIcon' in target.dataset) {
      // Grid or Dock manager will resolve the current event
      var manager = target.parentNode === DockManager.page.olist ? DockManager :
                                                                   GridManager;
      manager.contextmenu(evt);
      if (Homescreen.isInEditMode()) {
        iconGrid.addEventListener('click', onClickHandler);
      }
    } else if (!Homescreen.isInEditMode()) {
      GridManager.cancelPanning();
      // No long press over an icon neither edit mode
      evt.preventDefault();
      var contextMenuEl = document.getElementById('contextmenu-dialog');

      var searchPage = Configurator.getSection('search_page');
      if (searchPage && searchPage.enabled) {
        LazyLoader.load(['style/contextmenu.css',
                         'shared/style/action_menu.css',
                         contextMenuEl,
                         'js/contextmenu.js'
                         ], function callContextMenu() {
                          navigator.mozL10n.translate(contextMenuEl);
                          ContextMenuDialog.show();
                        }
        );
      } else {
        // only wallpaper
        LazyLoader.load(['shared/js/omadrm/fl.js', 'js/wallpaper.js'],
                      function callWallpaper() {
                        Wallpaper.contextmenu();
                      });
      }
    }
  }
  // dismiss edit mode by tapping in an area of the view where there is no icon
  function onClickHandler(evt) {
    if (!('isIcon' in evt.target.dataset)) {
      exitFromEditMode();
    }
  }

  function exitFromEditMode() {
    iconGrid.removeEventListener('click', onClickHandler);
    Homescreen.setMode('normal');
    GridManager.exitFromEditMode();
    if (typeof ConfirmDialog !== 'undefined') {
      ConfirmDialog.hide();
    }
  }

  document.addEventListener('visibilitychange', function mozVisChange() {
    if (document.hidden && Homescreen.isInEditMode()) {
      exitFromEditMode();
    }

    if (document.hidden == false) {
      setTimeout(function forceRepaint() {
        var helper = document.getElementById('repaint-helper');
        helper.classList.toggle('displayed');
      });
    }
  });

  function onConnectionChange(isOnline) {
    var mode = isOnline ? 'online' : 'offline';
    document.body.dataset.online = mode;
  }

  window.addEventListener('online', function onOnline(evt) {
    onConnectionChange(true);
  });

  window.addEventListener('offline', function onOnline(evt) {
    onConnectionChange(false);
  });

  return {
    /*
     * Displays the contextual menu given an app.
     *
     * @param {Object} Icon object
     *
     */
    showAppDialog: function h_showAppDialog(icon) {
      if (icon.app.type === GridItemsFactory.TYPE.BOOKMARK) {
        new MozActivity({
          name: 'remove-bookmark',
          data: {
            type: 'url',
            url: icon.app.id
          }
        });
        return;
      }

      LazyLoader.load(['shared/style/confirm.css',
                       'style/request.css',
                       document.getElementById('confirm-dialog'),
                       'js/request.js'], function loaded() {
        ConfirmDialog.showApp(icon);
      });
    },

    showEditBookmarkDialog: function h_showEditBookmarkDialog(icon) {
      new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: icon.app.id
        }
      });
    },

    isInEditMode: function() {
      return mode === 'edit';
    },

    didEvmePreventHomeButton: function() {
      return EvmeFacade && EvmeFacade.onHomeButtonPress &&
              EvmeFacade.onHomeButtonPress();
    },

    init: initialize,

    setMode: function(newMode) {
      mode = document.body.dataset.mode = newMode;
    }
  };
})();
