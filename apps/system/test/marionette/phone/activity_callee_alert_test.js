/* global __dirname */
'use strict';

(function() {
  var assert = require('assert');

  var CALLER_APP = 'activitycaller.gaiamobile.org';

  marionette('Camera app on call', function() {
    var client = marionette.client({
      apps: {
        'activitycaller.gaiamobile.org':
          __dirname + '/../../apps/activitycaller',
        'activitycallee.gaiamobile.org':
          __dirname + '/../../apps/activitycallee'
      }
    });

    test('Should have only one alert', function() {
      client.apps.launch('app://' + CALLER_APP);
      client.apps.switchToApp('app://' + CALLER_APP);
      client.findElement('#launchactivity', function(err, element) {
        // see element interface for all methods, etc..
        element.click(function() {
          client.switchToFrame();
          client.findElement('.modal-dialog-alert-ok', function(err, element) {
            element.click(function() {
              client.apps.switchToApp('app://' + CALLER_APP);
              client.findElement('#close', function(err, element) {
                if (err) {
                  assert(false, 'cannot find close button.');
                }
                // see element interface for all methods, etc..
                element.click(function() {
                  client.switchToFrame();
                  client.findElement('.modal-dialog-alert-ok',
                    function(err, element) {
                      if (err) {
                        assert(true, 'the alert does not appear on caller');
                      }
                    });
                });
              });
            });
          });
        });
      });
    });
  });
}());
