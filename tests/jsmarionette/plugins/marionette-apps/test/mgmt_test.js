'use strict';

/* global marionette, setup */

var App = require(__dirname + '/../lib/app');
var assert = require('assert');

marionette('mgmt', function() {
  var subject;

  var client = marionette.client();
  marionette.plugin('mozApps', require('../lib/apps'));

  setup(function() {
    subject = client.mozApps.mgmt;
  });

  function checkApp(app) {
    assert.ok(app instanceof App, 'app instanceof App');
    assert.equal(typeof(app.installOrigin), 'string');
    assert.ok(app.installOrigin.length > 0);
    assert.equal(typeof(app.installTime), 'number');
    assert.ok(app.installTime > 0);
    assert.equal(typeof(app.manifestURL), 'string');
    assert.ok(app.manifestURL.length > 0);
    assert.equal(typeof(app.origin), 'string');
    assert.ok(app.origin.length > 0);
    assert.equal(typeof app.manifest, 'object');
  }

  suite('#getAll', function() {
    var context;

    test('should return an array of app objects', function(done) {
      function checkApps(apps) {
        assert.ok(apps.length > 0);
        apps.forEach(checkApp);
      }


      subject.getAll(function(err, list) {
        if (err) {
          return done(err);
        }
        checkApps(list);
        done();
      });
    });

    test('should not change client context', function(done) {
      context = client.context;
      subject.getAll(function() {
        assert.strictEqual(client.context, context);
        done();
      });
    });
  });

  suite('#getSelf', function() {
    var context;

    test('should return a current app', function(done) {
      subject.getSelf(function(err, app) {
        if (err) {
          return done(err);
        }
        checkApp(app);
        done();
      });
    });

    test('should not change client context', function(done) {
      context = client.context;
      subject.getSelf(function() {
        assert.strictEqual(client.context, context);
        done();
      });
    });
  });
});
