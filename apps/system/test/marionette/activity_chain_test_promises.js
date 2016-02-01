/* global __dirname */
'use strict';

(function() {
  var assert = require('assert');
  var ActivityCallerApp = require('./lib/activitycallerapp');
  var Marionette = require('marionette-client');
  var INLINE_CALLEE_APP = 'activitycallee.gaiamobile.org';
  var WINDOW_CALLEE_APP = 'activitycalleewindow.gaiamobile.org';
  marionette('activity chain test', function() {
    console.log('Agora mesmo chamando o cliente no teste');

    var client = marionette.client({
      profile: {
        apps: {
          'activitycaller.gaiamobile.org': __dirname +
                                           '/../apps/activitycaller',
          'activitycallee.gaiamobile.org': __dirname +
                                           '/../apps/activitycallee',
          'activitycalleewindow.gaiamobile.org':
            __dirname + '/../apps/activitycalleewindow'
        }
      },
      driver: Marionette.Drivers.Promises
    });
    console.log('Terminou de criar o cliente no teste');

    // Bug 1035048: JSMarionette should be able to know displaying app.
    function getDisplayAppOrigin() {
      return client.executeScript(function() {
        return window.wrappedJSObject.Service.query('getTopMostWindow').origin;
      });
    }

    var system,
        activitycaller;
    setup(function() {
      system = client.loader.getAppClass('system');
      system.waitForFullyLoaded();
      activitycaller = new ActivityCallerApp(client);
    });

    test('Should launch activitycallee app through inline-activity and ' +
         'launch activitycalleewindow app through window-activity and ' +
         'post result to activitycallee', function() {
      // Launch Caller App.
      activitycaller.launch();

      // Click button(#testchainactivity) to launch inline activity.
      activitycaller.startChainActivity();

      // Switch to activitycallee.gaiamobile.org
      client.switchToFrame();
      assert.equal(getDisplayAppOrigin(), 'app://' + INLINE_CALLEE_APP,
        'INLINE_CALLEE_APP should be the frontest app.');
      client.apps.switchToApp('app://' + INLINE_CALLEE_APP);

      // Click button(#launchwindowactivity) to launch window activity
      client.findElement('#launchwindowactivity').scriptWith(function(ele) {
        ele.dispatchEvent(new CustomEvent('click'));
      });

      client.switchToFrame();
      assert.equal(getDisplayAppOrigin(), 'app://' + WINDOW_CALLEE_APP,
        'WINDOW_CALLEE_APP should be the frontest app.');

      client.findElement('.modal-dialog-alert-ok').scriptWith(function(ele) {
        ele.dispatchEvent(new CustomEvent('click'));
      });

      client.switchToFrame();
      assert.equal(getDisplayAppOrigin(), 'app://' + INLINE_CALLEE_APP,
        'INLINE_CALLEE_APP should be the frontest app.');
      client.apps.switchToApp('app://' + INLINE_CALLEE_APP);

      var result;
      // It needs time to get value from activity.
      client.waitFor(function() {
        result = client.findElement('#activityresult')
          .scriptWith(function(ele) {
            return ele.value;
          });
        return result;
      });
      assert.equal(result, 'successMsg', 'should get successMsg from ' +
        'activitycallee app');
      assert.equal(client.executeScript(function() {
        return window.wrappedJSObject.document.hidden;
      }), false, 'document of INLINE_CALLEE_APP should not be hidden');
    });
  });
}());
