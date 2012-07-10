
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

  // XXX Currently the home button communicate only with the
  // system application. It should be an activity that will
  // use the system message API.
  window.addEventListener('message', function onMessage(e) {
    switch (e.data) {
      case 'home':
        if (GridManager.isEditMode()) {
          GridManager.setMode('normal');
          Permissions.hide();
        } else {
          GridManager.goTo(0);
        }
        break;
    }
  });

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

