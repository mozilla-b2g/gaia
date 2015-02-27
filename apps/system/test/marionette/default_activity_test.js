/* global __dirname */
'use strict';

(function() {
  var assert = require('assert');

  var CALLER_APP = 'activitycaller.gaiamobile.org';
  var CALLEE_APP = 'activitycallee.gaiamobile.org';
  var setDefaultSelector = '[data-action=set-default-action]';

  marionette('Default activity', function() {
    var client = marionette.client({
      settings: {
      },
      apps: {
        'activitycaller.gaiamobile.org': __dirname + '/activitycaller',
        'activitycallee.gaiamobile.org': __dirname + '/activitycallee'
      }
    });

    function launchActivity(cb) {
      client.apps.switchToApp('app://' + CALLER_APP);
      client.findElement('#testdefaultactivity', function(err, element) {
        element.click(function() {
          cb();
        });
      });
    }

    function checkSetDefault(cb) {
      client.findElement(setDefaultSelector, function(err, element) {
        element.click(function() {
          assert(true, element.checked);
          cb();
        });
      });
    }

    function selectCalleeApp(cb) {
      var selector = '[data-manifest="app://' + CALLEE_APP +
        '/manifest.webapp"]';
      client.findElement(selector, function(err, element) { 
        element.click(function() {
          cb();
        });
      });
    }

    test('When triggering activity', function() {
      client.apps.launch('app://' + CALLER_APP);

      launchActivity(function() {
        client.switchToFrame();
        checkSetDefault(function() {
          selectCalleeApp(function() {
            launchActivity(function() {
              client.switchToFrame();

              client.findElement(setDefaultSelector, function(err, element) {
                if (!err) {
                  assert(false, 'activity menu should not be shown');
                }
              });

              client.apps.switchToApp('app://' + CALLEE_APP, function(err, el) {
                client.findElement('#default-test', function(err, element) {
                  if (err) {
                    assert(false, 'activity callee should be open');
                  }
                });
              });
            });
          });
        });
      });
    });
  });
}());

