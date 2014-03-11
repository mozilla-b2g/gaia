marionette('application launch', function() {
  var client = marionette.client({
    apps: {
      'launchme.gaiamobile.org': __dirname + '/apps/launchme/'
    },

    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  setup(function() {
    client.waitFor(function() {
      return client.executeScript(function() {
        return window.wrappedJSObject.Applications.ready;
      });
    });
  });

  test('launch test app', function() {
    // find the launchme app
    var len = client.executeAsyncScript(function() {
      // find the app.
      window.navigator.mozApps.mgmt.getAll().onsuccess = function(event) {
        var apps = event.target.result,
            i = 0,
            len = apps.length;

        for (; i < len; i++) {
          if (apps[i].manifestURL.indexOf('launchme')) {
            apps[i].launch();
            marionetteScriptFinished();
            break;
          }
        }
      };
    });

    client.executeAsyncScript(function() {
    });

    //var app = client.findElement('[src*="launchme"]');
    //console.log(app);
  });
});
