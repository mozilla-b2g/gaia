'use strict';
var assert = require('assert');

marionette('switchToActivity', function() {
  var launch = require('../lib/launch').launch;
  var switchToApp = require('../lib/switchtoapp').switchToApp;
  var switchToActivity = require('../lib/switchtoactivity').switchToActivity;

  var ACTIVITY_CALLER_DOMAIN = 'activity.caller.gaiamobile.org';
  var ACTIVITY_CALLEE_DOMAIN = 'activity.callee.gaiamobile.org';

  var apps = {};
  apps[ACTIVITY_CALLER_DOMAIN] = __dirname + '/apps/activitycaller';
  apps[ACTIVITY_CALLEE_DOMAIN] = __dirname + '/apps/activitycallee';

  var profile = {
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'screen.timeout': 0
    },
    // Need this so that swithToApp can also focus on the app frame.
    prefs: {
      'focusmanager.testmode': true
    },
    apps: apps
  };

  var client = marionette.client({ profile: profile });
  marionette.plugin('mozApps', require('../lib/apps'));

  suite('switch to app that is run as inline activity', function() {
    var activityCallerOrigin = 'app://' + ACTIVITY_CALLER_DOMAIN;
    var activityCalleeOrigin = 'app://' + ACTIVITY_CALLEE_DOMAIN;
    var href = '/index.html#x-activity';

    setup(function(done) {
      launch(client.mozApps, activityCallerOrigin, done);
    });

    setup(function(done) {
      switchToApp(client.mozApps, activityCallerOrigin, function(err) {
        if (err) {
          return done(err);
        }

        // Run activity callee as inline activity
        client.findElement('#open-activity').tap();

        client.switchToFrame();
        switchToActivity(client.mozApps, activityCalleeOrigin, href, done);
      });
    });

    test('should be visible', function() {
      client.switchToFrame();
      var iframe = client.findElement(
        'iframe[src*="' + activityCalleeOrigin + '"]'
      );

      assert.ok(iframe);
      assert.ok(iframe.displayed());
    });

    test('app should be the target of scripts', function() {
      var location = client.executeScript(function() {
        return window.wrappedJSObject.location.href;
      });
      assert.ok(location.indexOf(activityCalleeOrigin) === 0);
    });

    test('app should have the focus', function() {
      assert.ok(client.executeScript(function() {
        return window.wrappedJSObject.document.hasFocus();
      }));
    });
  });
});
