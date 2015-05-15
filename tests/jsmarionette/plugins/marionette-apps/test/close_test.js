'use strict';
var assert = require('assert');

marionette('close', function() {
  // requires
  var Apps = require('../lib/apps'),
      close = require('../lib/close').close,
      launch = require('../lib/launch').launch,
      client = marionette.client();

  marionette.plugin('mozApps', Apps);

  suite('close app', function() {
    var origin = 'app://calendar.gaiamobile.org';

    setup(function(done) {
      launch(client.mozApps, origin, done);
    });

    setup(function(done) {
      close(client.mozApps, origin, done);
    });

    test('iframe is gone', function(done) {
      client.setSearchTimeout(100);
      client.findElement('iframe[src*="' + origin + '"]', function(err, el) {
        assert.ok(err, 'has error');
        assert.equal(err.type, 'NoSuchElement', 'element is missing');
        done();
      });
    });
  });

  suite('close entrypoint app', function() {
    var origin = 'app://communications.gaiamobile.org';

    // launch some other entrypoint
    setup(function(done) {
      launch(client.mozApps, origin, 'dialer', done);
    });

    // launch contacts (which we will close later)
    var contacts;
    setup(function(done) {
      launch(client.mozApps, origin, 'contacts', function(err, app) {
        contacts = app;
        done(err);
      });
    });

    setup(function(done) {
      close(client.mozApps, origin, 'contacts', done);
    });

    test('closes right app', function(done) {
      var source = origin + '/' + contacts.entrypoint.details.launch_path;

      client.setSearchTimeout(100);
      client.findElement('iframe[src*="' + source + '"]', function(err, el) {
        assert.ok(err, 'has error');
        assert.equal(err.type, 'NoSuchElement', 'element is missing');
        done();
      });
    });
  });
});


