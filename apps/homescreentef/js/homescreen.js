/*
 *  Module: Homescreen
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telef—nica I+D S.A.U.
 *
 *  LICENSE: Apache 2.0
 *
 *  @author Cristian Rodriguez
 *
 */
var owd = window.owd || {};

if (!owd.Homescreen) {

  (function(doc) {
    'use strict';

    var grid = owd.GridManager;

    owd.PaginationBar.init('.paginationScroller');
    grid.init('.apps');

    var mode = 'normal';
    var footer = doc.querySelector('#footer');
    grid.onEditModeChange = function (value) {
      footer.dataset.mode = mode = value;
    }

    // Listening for keys
    window.addEventListener('keyup', function(e) {
      // Click on the Home button to reset the mode of the grid
      if (e.keyCode === e.DOM_VK_HOME) {
        permission.destroy();
        owd.GridManager.setMode('normal');
      }
    }, true);

    // Listening for installed apps
    owdAppManager.addEventListener('oninstall', function(app) {
      owd.GridManager.install(app);
    });

    // Listening for uninstalled apps
    navigator.mozApps.mgmt.onuninstall = function uninstall(event) {
      owd.GridManager.uninstall(event.application);
    };

    // Listening for clicks on the footer
    footer.addEventListener('click', function(event) {
      if (mode === 'normal') {
        var dataset = event.target.dataset;
        if (dataset && typeof dataset.origin !== 'undefined') {
          owdAppManager.getByOrigin(dataset.origin).launch();
        }
      }
    });

    owd.Homescreen = {

      /*
       * Displays the contextual menu given an origin
       *
       * @param {String} the app origin
       */
      showAppDialog: function(origin) {
        // FIXME: localize this message
        if (!owdAppManager.isCore(origin)) {
          var app = owdAppManager.getByOrigin(origin);
          permission.request('Remove ' + app.manifest.name,
            'This application will be uninstalled fully from your mobile',
            function() {
              app.uninstall();
            },
            function() { }
          );
        }
      }
    }

  })(document);
}
