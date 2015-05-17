'use strict';
var App = require('../lib/app');
var assert = require('assert');

marionette('public interface', function() {
  var client = marionette.client();
  marionette.plugin('apps', require('../index'));

  suite('#launch', function() {
    var appOrigin = 'app://calendar.gaiamobile.org';
    var selector = 'iframe[src*="calendar"]';

    setup(function(done) {
      if (client.isSync) {
        client.apps.launch(appOrigin);
        done();
      } else {
        client.apps.launch(appOrigin, done);
      }
    });

    test('should create the appropriate app iframe', function(done) {
      function checkElement(err, el) {
        assert.ok(!err);
        assert.ok(!!el);
        done();
      }

      client.scope({ searchTimeout: 1000 });
      if (client.isSync) {
        var el = client.findElement(selector);
        checkElement(null, el);
      } else {
        client.findElement(selector, checkElement);
      }
    });

    suite('#switchToApp', function() {
      setup(function(done) {
        if (client.isSync) {
          client.apps.switchToApp(appOrigin);
          done();
        } else {
          client.apps.switchToApp(appOrigin, done);
        }
      });

      test('should put us in the app', function(done) {
        function checkLocation(err, href) {
          assert.ok(href.indexOf(appOrigin) !== -1);
          done();
        }

        function loc() {
          return window.location.href;
        }

        if (client.isSync) {
          var href = client.executeScript(loc);
          checkLocation(null, href);
        } else {
          client.executeScript(loc, checkLocation);
        }
      });
    });

    suite('#close', function() {
      setup(function(done) {
        if (client.isSync) {
          client.apps.close(appOrigin);
          done();
        } else {
          client.apps.close(appOrigin, done);
        }
      });

      test('should get rid of app iframe', function(done) {
        client.setSearchTimeout(10);
        if (client.isSync) {
          try {
            client.findElement(selector);
          } catch (err) {
            assert.strictEqual(err.type, 'NoSuchElement');
            done();
          }
        } else {
          client.findElement(selector, function(err) {
            assert.strictEqual(err.type, 'NoSuchElement');
            done();
          });
        }
      });
    });
  });

  suite('#list', function() {
    var apps;

    setup(function(done) {
      if (client.isSync) {
        apps = client.apps.list();
        done();
      } else {
        client.apps.list(function(err, _apps) {
          apps = _apps;
          done();
        });
      }
    });

    test('should return many things', function() {
      assert.notStrictEqual(apps.length, 0);
    });

    test('should return things and only things that are apps', function() {
      apps.forEach(function(app) {
        assert.ok(app instanceof App, app.origin);
      });
    });
  });

  suite('#getApp', function() {
    var app;
    var origin = 'app://calendar.gaiamobile.org';

    setup(function(done) {
      if (client.isSync) {
        app = client.apps.getApp(origin);
        done();
      } else {
        client.apps.getApp(origin, function(err, _app) {
          app = _app;
          done(err);
        });
      }
    });

    test('should return app object', function() {
      assert.equal(app.origin, origin);
    });
  });
});
