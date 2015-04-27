'use strict';
/* global MozActivity */

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');

marionette('Import App', function() {

  var client = marionette.client();

  var home, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    system = client.loader.getAppClass('system');
    home = client.loader.getAppClass('verticalhome');
    system.waitForStartup();
    home.waitForLaunch();
  });

  function countApps() {
    return client.executeAsyncScript(function() {
      navigator.mozApps.mgmt.getAll().onsuccess = function(event) {
        marionetteScriptFinished(event.target.result.length);
      };
    });
  }

  test('imports an app into the system', function() {
    var numApps = countApps();
    var appZipUrl = server.url('simple_addon.zip');

    // Fire the import activity from the home screen.
    client.executeAsyncScript(function(appZipUrl) {

      // Execute an XHR to get the addon blob content.
      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('GET', appZipUrl, true);
      xhr.responseType = 'blob';
      xhr.onload = function(e) {
        if (this.status == 200) {
          sendActivity(this.response);
        }
      };
      xhr.onerror = function(e) {
        console.log('Error fetching app zip.');
      };
      xhr.send();

      // Send a moz activity to the system app with the blob.
      function sendActivity(blob) {
        var activity = new MozActivity({
          name: 'import',
          data: {
            type: 'app',
            blob: blob
          }
        });
        activity.onsuccess = function() {
          marionetteScriptFinished();
        };
      }
    }, [appZipUrl]);

    // We've installed an app, so assert that we find the app in mozApps.mgmt.
    assert.equal(numApps + 1, countApps());
  });
});
