
'use strict';

const Homescreen = (function() {
  // Initialize the search page
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  Search.init(domain);

  var mode = 'normal';

  // Initialize the pagination scroller
  PaginationBar.init('.paginationScroller');

  function initUI() {
    setLocale();
    GridManager.init('.apps', function gm_init() {
      Wallpaper.init();
      GridManager.goToPage(GridManager.landingPageIndex);
      DockManager.init(document.querySelector('#footer .dockWrapper'));
      PaginationBar.show();
      DragDropManager.init();

      window.addEventListener('localized', function localize() {
        setLocale();
        GridManager.localize();
        DockManager.localize();
      });
    });
  }

  function onHomescreenActivity() {
    if (Homescreen.isInEditMode()) {
      Homescreen.setMode('normal');
      GridManager.saveState();
      DockManager.saveState();
      Permissions.hide();
    } else if (GridManager.pageHelper.getCurrentPageNumber() !==
                 GridManager.landingPageIndex) {
      GridManager.goToPage(GridManager.landingPageIndex);
    }
  }

  window.addEventListener('message', function onMessage(e) {
    switch (e.data) {
      case 'home':
        onHomescreenActivity();
        break;
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

  if (window.navigator.mozSetMessageHandler) {
    window.navigator.mozSetMessageHandler('activity',
      function handleActivity(activity) {
        var data = activity.source.data;

        // issue 3457: Implement a UI when saving bookmarks to the homescreen
        switch (data.type) {
          case 'url':
            BookmarkEditor.init(data);
            break;
          case 'application/x-application-list':
            onHomescreenActivity();
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
      // FIXME: localize this message
      var app = Applications.getByOrigin(origin);
      var title = 'Remove ' + app.manifest.name;
      var body = 'This application will be uninstalled fully from your mobile';
      Permissions.show(title, body,
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
