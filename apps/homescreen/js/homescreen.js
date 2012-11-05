
'use strict';

const Homescreen = (function() {
  var mode = 'normal';
  var _ = navigator.mozL10n.get;

  // Initialize the pagination scroller
  PaginationBar.init('.paginationScroller');

  function initUI() {
    setLocale();
    GridManager.init('.apps', function gm_init() {
      DockManager.init(document.querySelector('#footer .dockWrapper'));
      PaginationBar.show();
      GridManager.goToPage(1);
      DragDropManager.init();
      Wallpaper.init();

      window.addEventListener('localized', function localize() {
        setLocale();
        GridManager.localize();
        DockManager.localize();
      });
    });
  }

  window.addEventListener('hashchange', function() {
    if (document.location.hash != '#root')
      return;

    if (Homescreen.isInEditMode()) {
      Homescreen.setMode('normal');
      GridManager.saveState();
      DockManager.saveState();
      Permissions.hide();
      GridManager.goToPage(GridManager.pageHelper.getCurrentPageNumber());
    } else {
      GridManager.goToPage(1);
    }
  });

  function setLocale() {
    // set the 'lang' and 'dir' attributes to <html> when the page is translated
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  }

  function start() {
    if (Applications.isReady()) {
      initUI();
      return;
    }
    Applications.addEventListener('ready', initUI);
  }

  function loadBookmarks() {
    HomeState.getBookmarks(function(bookmarks) {
      bookmarks.forEach(function(bookmark) {
        Applications.addBookmark(bookmark);
      });
      start();
    }, start);
  }

  HomeState.init(function success(onUpgradeNeeded) {
    loadBookmarks();
  }, start);

  // Listening for installed apps
  Applications.addEventListener('install', function oninstall(app) {
    GridManager.install(app, true);
  });

  // Listening for uninstalled apps
  Applications.addEventListener('uninstall', function onuninstall(app) {
    if (DockManager.contains(app)) {
      DockManager.uninstall(app);
    } else {
      GridManager.uninstall(app);
    }
  });

  if (navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler('activity', function onActivity(activity) {
      var data = activity.source.data;
      switch (activity.source.name) {
        case 'save-bookmark':
          if (data.type === 'url') {
            BookmarkEditor.init(data);
          }
          break;
      }
    });
  }

  return {
    /*
     * Displays the contextual menu given an origin
     *
     * @param {String} the app origin
     */
    showAppDialog: function h_showAppDialog(origin) {
      var app = Applications.getByOrigin(origin);
      var title, body, yesLabel;
      // Show a different prompt if the user is trying to remove
      // a bookmark shortcut instead of an app.
      if (app.isBookmark) {
        title = _('remove-title', { name: app.manifest.name });
        body = '';
        yesLabel = _('remove');
      } else {
        title = _('delete-title', { name: app.manifest.name });
        body = _('delete-body', { name: app.manifest.name });
        yesLabel = _('delete');
      }

      Permissions.show(title, body, yesLabel, _('cancel'),
                       function onAccept() { app.uninstall() },
                       function onCancel() {});
    },

    isInEditMode: function() {
      return mode === 'edit';
    },

    setMode: function(newMode) {
      mode = document.body.dataset.mode = newMode;
    }
  };
})();
