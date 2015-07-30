'use strict';
var assert = require('assert');

marionette('launch', function() {
  // requires
  var launch = require('../lib/launch').launch,
      getApp = require('../lib/getapp').getApp;

  var client = marionette.client();
  marionette.plugin('mozApps', require('../lib/apps'));

  suite('launch installed app', function() {

    function waitForVisibility(iframe, callback) {
      iframe.displayed(function(err, isDisplayed) {
        if (err) return callback(err);
        if (isDisplayed)
          return callback();

        setTimeout(waitForVisibility, 250, iframe, callback);
      });
    }

    function getAppFrame(origin, callback) {
      client.findElement('iframe[src*="' + origin + '"]', callback);
    }

    var origin = 'app://calendar.gaiamobile.org';
    setup(function(done) {
      launch(client.mozApps, origin, done);
    });

    // find iframe
    var iframe;
    setup(function(done) {
      getAppFrame(origin, function(err, el) {
        iframe = el;
        done(err);
      });
    });

    test('iframe exists', function() {
      assert.ok(iframe, 'iframe exists');
    });

    test('iframe is visible', function(done) {
      this.timeout('10s');
      /**
       * Wait until iframe is visible.
       */

      waitForVisibility(iframe, done);
    });

    test('double launch does not timeout', function(done) {
      client.switchToFrame();
      launch(client.mozApps, origin, function() {
        getAppFrame(origin, function(err, el) {
          if (err) {
            return done(err);
          }

          waitForVisibility(el, done);
        });
      });
    });
  });

  suite('entrypoints', function() {
    var origin = 'app://communications.gaiamobile.org';
    var app;

    setup(function(done) {
      getApp(client.mozApps, origin, function(err, _app) {
        app = _app;
        done(err);
      });
    });

    test('has entry_points', function() {
      assert.ok(app.manifest.entry_points, 'entrypoints are availalbe');
    });

    function launchApp(entrypoint) {
      var state = {};

      setup(function(done) {
        launch(client.mozApps, origin, entrypoint, function(err, app, el) {
          state.error = err;
          state.app = app;
          state.frame = el;
          done();
        });
      });
      return state;
    }

    suite('success', function() {
      // launch another app with this domain first to verify we can actually
      // pick the right one.
      var dialer = launchApp('dialer');
      var contacts = launchApp('contacts');

      test('is launched to entrypoint', function(done) {
        assert.ok(!dialer.error, 'other app launched');
        var entrypoint = app.manifest.entry_points.contacts;

        // switch to new iframe
        client.switchToFrame(contacts.frame);

        // verify we are at the right entrypoint
        client.getUrl(function(err, url) {
          assert.ok(
            url.indexOf(entrypoint.launch_path) !== -1,
            url + ' contains ' + entrypoint
          );
          done();
        });
      });
    });

    suite('failure', function() {
      var fakeapp = launchApp('nowayappisnamedthis');

      test('fails with an error', function() {
        assert.ok(fakeapp.error, 'has an error' + fakeapp.error);
        assert.ok(fakeapp.error.message.match(/entrypoint/));
      });
    });
  });

});
