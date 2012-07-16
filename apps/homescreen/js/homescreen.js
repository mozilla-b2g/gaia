
'use strict';

const Homescreen = (function() {
  function initUI() {
    setLocale();
    GridManager.init('.apps', function gm_init() {
      // Initialize the search page
      var host = document.location.host;
      var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
      Search.init(domain);

      // Initialize the pagination scroller
      PaginationBar.init('.paginationScroller');
      PaginationBar.show();

      // Initialize the dock
      DockManager.init(document.querySelector('#footer'));

      // Initialize drag&drop
      DragDropManager.init();

      // Go to the first page
      GridManager.goToPage(1);

      window.addEventListener('localized', function localize() {
        setLocale();
        GridManager.localize();
        DockManager.localize();
      });
    });
  }

  // XXX Currently the home button communicate only with the
  // system application. It should be an activity that will
  // use the system message API.
  window.addEventListener('message', function onMessage(e) {
    switch (e.data) {
      case 'home':
        if (document.body.dataset.mode === 'edit') {
          document.body.dataset.mode = 'normal';
          GridManager.saveState();
          DockManager.saveState();
          Permissions.hide();
        } else {
          var num = GridManager.pageHelper.getCurrentPageNumber();
          switch (num) {
            case 1:
              GridManager.goToPage(0);
              break;
            default:
              GridManager.goToPage(1);
              break;
          }
        }
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

  HomeState.init(function success(onUpgradeNeeded) {
    if (!onUpgradeNeeded) {
      start();
      return;
    }

    // First time the database is empty -> Dock by default
    var appsInDockByDef = ['browser', 'dialer', 'music', 'gallery'];
    var protocol = window.location.protocol;
    appsInDockByDef = appsInDockByDef.map(function mapApp(name) {
      return protocol + '//' + name + '.' + domain;
    });
    HomeState.saveShortcuts(appsInDockByDef, start, start);
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
    }
  };
})();

