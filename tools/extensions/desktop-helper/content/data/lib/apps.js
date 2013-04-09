!function() {
  // Set session storage so system/js/application.js fetches all apps
  FFOS_RUNTIME.getAppWindow(function(win) {
    win.sessionStorage.setItem('webapps-registry-ready', true);
  });

  function MockAppInstance(app) {
    this.app = app;

    for (var i in app) {
      if (i == 'launch') { continue }
      this[i] = app[i];
    }
  }

  MockAppInstance.prototype = {
    launch: function(entrypoint) {
      console.log('MockAppInstance.launch');

      var launchPath;
      if (entrypoint && this.manifest.entry_points[entrypoint]) {
        launchPath = this.manifest.entry_points[entrypoint].launch_path;
      } else {
        launchPath = this.manifest.launch_path;
      }

      var eventDetail = {
        type: 'webapps-launch',
        manifestURL: this.manifestURL,
        url: this.origin + launchPath,
        isActivity: false
      };

      FFOS_RUNTIME.sendFrameEvent(eventDetail);
    }
  };

  var mozAppsRef = window.navigator.mozApps;
  FFOS_RUNTIME.makeNavigatorShim('mozApps', {
    getSelf: function() {
      console.log('mozApps.getSelf');
      var scope = {};

      // getSelf isn't currently working, so construct a fake manifest for now.
      setTimeout(function() {
        var app = window.location.hostname.match(/^([a-zA-Z0-9]*)\./)[1];
        scope.onsuccess({
          target: {
            result: {
              installOrigin: 'http://' + app + '.gaiamobile.org:8080'
            }
          }
        });
      });

      return scope;
    },
    mgmt: {
      oninstall: function() {
        console.log('mgmt.oninstall called');
        mozAppsRef.mgmt.oninstall.apply(this, arguments);
      },
      onuninstall: function() {
        console.log('mgmt.onuninstall called');
        mozAppsRef.mgmt.onuninstall.apply(this, arguments);
      },
      getAll: function() {

        var scope = {};

        mozAppsRef.mgmt.getAll().onsuccess = function(e) {
          var apps = e.target.result;

          var allApps = [];
          for (var i = 0, app; app = apps[i]; i++) {
            allApps.push(new MockAppInstance(app));
          }

          setTimeout(function() {
            scope.onsuccess({
              target: {
                result: allApps
              }
            });
          });
        };

        return scope;
      }
    }
  }, true);
}();
