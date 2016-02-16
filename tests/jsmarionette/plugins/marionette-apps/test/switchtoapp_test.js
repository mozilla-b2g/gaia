'use strict';
var assert = require('assert');

marionette('launch', function() {
  var launch = require('../lib/launch').launch;
  var switchToApp = require('../lib/switchtoapp').switchToApp;

  var profile = {
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  };

  var client = marionette.client({ profile: profile });
  var system;
  marionette.plugin('mozApps', require('../lib/apps'));

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  suite('switch to running app', function() {
    var domain = 'homescreen.gaiamobile.org';
    var origin = 'app://' + domain;
    setup(function(done) {
      switchToApp(client.mozApps, origin, done);
    });

    test('should be visible', function(done) {
      // switch to root (system app)
      client.switchToFrame();
      client.findElement('iframe[src*="' + domain + '"]', function(err, el) {
        if (err) return done(err);
        el.displayed(function(err, isDisplayed) {
          assert.ok(isDisplayed);
          done();
        });
      });
    });

    test('app should be the target of scripts', function(done) {
      function remote() {
        return window.wrappedJSObject.location.href;
      }

      client.executeScript(remote, function(err, result) {
        assert.ok(result);
        done();
      });
    });

    test('app should have the focus', function(done) {
      function remote() {
        return window.wrappedJSObject.document.hasFocus();
      }

      client.executeScript(remote, function(err, result) {
        assert.ok(result);
        done();
      });
    });

    test('should be able to switchToApp from app to app', function(done) {
      // already called switchToApp once by now, call it again.
      switchToApp(client.mozApps, origin);

      function remote() {
        return window.wrappedJSObject.document.hasFocus();
      }

      client.executeScript(remote, function(err, result) {
        assert.ok(result);
        done();
      });
    });
  });

  suite('entrypoint', function() {
    var origin = 'app://communications.gaiamobile.org';
    var entrypoint = 'contacts';
    var app;

    setup(function(done) {
      launch(client.mozApps, origin, entrypoint, function(err, _app) {
        app = _app;
        done(err);
      });
    });

    setup(function(done) {
      switchToApp(client.mozApps, origin, entrypoint, done);
    });

    test('context of marionette after switch', function(done) {
      client.getUrl(function(err, url) {
        assert.ok(
          url.indexOf(app.source) !== -1,
          'url contains: ' + app.source
        );
        done(err);
      });
    });

  });
});

