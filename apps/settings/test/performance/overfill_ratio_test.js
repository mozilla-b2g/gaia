'use strict';

var assert = require('assert');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');
var SettingsIntegration = require('./integration.js');

marionette(config.appPath + ' >', function() {
  var app;
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var chrome = client.scope({context: 'chrome' });
  var actions;
  app = new SettingsIntegration(client, config.appPath);

  setup(function() {
    actions = client.loader.getActions();
    this.timeout(config.timeout);
    client.setScriptTimeout(config.scriptTimeout);
    PerformanceHelper.injectHelperAtom(client);
  });

  test('Overfill Settings Scroll >', function() {
    var results = [];
    var lastEvent = 'moz-app-loaded';

    var performanceHelper = new PerformanceHelper({
      app: app,
      lastEvent: lastEvent
    });

    performanceHelper.unlockScreen();

    function sendOverfill() {
      window.wrappedJSObject.mozRequestOverfill(function result(aOverfill) {
        marionetteScriptFinished(aOverfill);
      });
    }

    function requestOverfill() {
      var overfill = chrome.executeAsyncScript(sendOverfill);
      results.push(overfill);
    }

    performanceHelper.repeatWithDelay(function(app, next) {
      var waitForBody = true;
      app.launch(waitForBody);

      performanceHelper.waitForPerfEvent(function() {

        app.element('wifiSelector', function(err, wifiSubpanel) {
          var width = wifiSubpanel.size().width;
          var height = wifiSubpanel.size().height;

          // Scrolling should happen here
          actions.flick(wifiSubpanel, width / 2, height / 2, width / 2,
                        -400, 200);
          actions.perform(requestOverfill);
          app.close();
        });
      }); // end wait for perf event

     });

    // results is an Array of values, one per run.
    assert.ok(results.length == config.runs, 'missing runs');

    PerformanceHelper.reportDuration(results, 'overfills');
  });
});
