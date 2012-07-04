
'use strict';

const Homescreen = (function() {
  PaginationBar.init('.paginationScroller');
  GridManager.init('.apps');

  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');

  var shortcuts = document.querySelectorAll('#footer li');
  for (var i = 0; i < shortcuts.length; i++) {
    var dataset = shortcuts[i].dataset;
    dataset.origin = dataset.origin.replace('$DOMAIN$', domain);
  }

  var mode = 'normal';
  var footer = document.querySelector('#footer');
  GridManager.onEditModeChange = function onEditModeChange(value) {
    footer.dataset.mode = mode = value;
  }

  // Click on the Home/ESC button to reset the mode of the grid
  window.addEventListener('keydown', function onkeydown(event) {
    if (event.keyCode === event.DOM_VK_HOME ||
        event.keyCode === event.DOM_VK_ESCAPE) {
      GridManager.setMode('normal');
      Permissions.hide();
    }
  }, true);

  // Listening for installed apps
  Applications.addEventListener('install', function oninstall(app) {
    GridManager.install(app);
  });

  // Listening for uninstalled apps
  Applications.addEventListener('uninstall', function onuninstall(app) {
    GridManager.uninstall(app);
  });

  // Listening for clicks on the footer
  footer.addEventListener('click', function footer_onclick(event) {
    if (mode === 'normal') {
      var dataset = event.target.dataset;
      if (dataset && typeof dataset.origin !== 'undefined') {
        var app = Applications.getByOrigin(dataset.origin);
        if (dataset.entrypoint) {
          app.launch('#' + dataset.entrypoint);
        } else {
          app.launch();
        }
      }
    }
  });

  return {
    /*
     * Displays the contextual menu given an origin
     *
     * @param {String} the app origin
     */
    showAppDialog: function showAppDialog(origin) {
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
