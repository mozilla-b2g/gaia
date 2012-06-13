
'use strict';

const Homescreen = (function() {
  PaginationBar.init('.paginationScroller');
  GridManager.init('.apps');

  var mode = 'normal';
  var footer = document.querySelector('#footer');
  GridManager.onEditModeChange = function onEditModeChange(value) {
    footer.dataset.mode = mode = value;
  }

  // Click on the Home/ESC button to reset the mode of the grid
  window.addEventListener('keydown', function onkeydown(event) {
    if (event.keyCode === event.DOM_VK_HOME ||
        event.keyCode == event.DOM_VK_ESCAPE) {
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
        Applications.getByOrigin(dataset.origin).launch();
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
      if (Applications.isCore(origin))
        return;

      var app = Applications.getByOrigin(origin);
      var title = 'Remove ' + app.manifest.name;
      var body = 'This application will be uninstalled fully from your mobile';
      Permissions.show(title, body,
                       function onAccept() { app.uninstall() },
                       function onCancel() {});
    }
  };
})();

