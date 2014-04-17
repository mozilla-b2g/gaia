/* global __dirname */
'use strict';

(function() {
  var assert = require('assert');

  var CAMERA_APP = 'fakecamera.gaiamobile.org';
  var DIALER_APP = 'fakedialer.gaiamobile.org';

  marionette('Camera app on call', function() {
    var client = marionette.client({
      settings: {
        'ftu.manifestURL': null,
        'lockscreen.enabled': false
      },
      apps: {
        'fakecamera.gaiamobile.org': __dirname + '/fakecamera',
        'fakedialer.gaiamobile.org': __dirname + '/fakedialer'
      }
    });

    test('should be cleared after opening app', function() {
      client.apps.launch('app://' + DIALER_APP);
      client.executeScript(function() {
        var home = new CustomEvent('home');
        window.dispatchEvent(home);
      });
      client.apps.launch('app://' + CAMERA_APP);

      // wait for the call
      client.waitFor(function() {
        return client.findElement('#attention-screen.displayed');
      });

      client.executeScript(function() {
        var home = new CustomEvent('home');
        window.dispatchEvent(home);
      });

      client.apps.launch('app://' + CAMERA_APP);
      client.apps.switchToApp('app://' + CAMERA_APP);
      client.findElement('#snapshot', function(err, element) {
        if (err) {
          assert(false, 'cannot find snapshot button.');
        }
        // see element interface for all methods, etc..
        element.click(function() {
          assert(client.findElement('#result.done').displayed,
            'camera snapshot button is reachable.');
        });
      });
    });
  });
}());