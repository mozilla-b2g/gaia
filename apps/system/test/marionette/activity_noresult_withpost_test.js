/* global __dirname */
'use strict';

(function() {
  var assert = require('assert');
  var ActivityCallerApp = require('./lib/activitycallerapp');

  var INLINE_CALLEE_APP = 'activitycallee.gaiamobile.org';
  var WINDOW_CALLEE_APP = 'activitycalleewindow.gaiamobile.org';
  marionette('activity noresult withpost test', function() {
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
      }
    });

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
         'post result to activitycallee and stay in activitycalleewindow ' +
         'instead switch back to activitycallee', function() {
      // Launch Caller App.
      activitycaller.launch();

      // Click button(#testactivitynoreturnvaluewpostresult)
      // to launch inline activity.
      activitycaller.startActivityNoReturnValue();

      // Switch to activitycallee.gaiamobile.org
      client.switchToFrame();
      assert.equal(getDisplayAppOrigin(), 'app://' + INLINE_CALLEE_APP,
        'INLINE_CALLEE_APP should be the frontest app.');
      client.apps.switchToApp('app://' + INLINE_CALLEE_APP);

      // Click button(#launchwindowactivity) to launch window activity
      client.findElement('#launchwindowactivitynoreturnvaluewithpost').
        scriptWith(function(ele) {
        ele.dispatchEvent(new CustomEvent('click'));
      });

      client.switchToFrame();
      assert.equal(getDisplayAppOrigin(), 'app://' + WINDOW_CALLEE_APP,
        'WINDOW_CALLEE_APP should be the frontest app.');

      client.findElement('.modal-dialog-alert-ok').scriptWith(function(ele) {
        ele.dispatchEvent(new CustomEvent('click'));
      });

      client.switchToFrame();

      assert.equal(getDisplayAppOrigin(), 'app://' + WINDOW_CALLEE_APP,
        'WINDOW_CALLEE_APP should be the frontest app.');
    });
  });
}());
