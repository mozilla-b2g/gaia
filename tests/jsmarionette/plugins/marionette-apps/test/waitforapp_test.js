'use strict';
var assert = require('assert');

marionette('waitforapp', function() {
  // requires
  var launch = require('../lib/launch').launch;
  var switchToApp = require('../lib/switchtoapp').switchToApp;
  var waitForApp = require('../lib/waitforapp').waitForApp;
  var waitForActivity = require('../lib/waitforapp').waitForActivity;

  var ACTIVITY_CALLER_DOMAIN = 'activity.caller.gaiamobile.org';
  var ACTIVITY_CALLEE_DOMAIN = 'activity.callee.gaiamobile.org';

  var apps = {};
  apps[ACTIVITY_CALLER_DOMAIN] = __dirname + '/apps/activitycaller';
  apps[ACTIVITY_CALLEE_DOMAIN] = __dirname + '/apps/activitycallee';

  var client = marionette.client({
    profile: {
      settings: {
        'ftu.manifestURL': null,
        'lockscreen.enabled': false,
        'screen.timeout': 0
      },

      apps: apps
    }
  });
  marionette.plugin('mozApps', require('../lib/apps'));

  function getParentClass(iframeElement) {
    return iframeElement.scriptWith(function(el) {
      return el.parentNode.getAttribute('class');
    });
  }

  function getTransitionState(iframeElement) {
    return iframeElement.scriptWith(function(el) {
      return el.parentNode.parentNode.getAttribute('transition-state');
    });
  }

  test(function() {
    assert.equal(true, false);
  });

  suite('waiting for running app', function() {
    var domain = 'verticalhome.gaiamobile.org';
    var element;

    setup(function(done) {
      this.timeout('20s');
      waitForApp(client.mozApps, domain, function(err, el) {
        if (err) return done(err);
        element = el;
        done();
      });
    });

    test('it should return element', function() {
      assert.ok(element);
      assert.ok(element.getAttribute('src').indexOf(domain) !== -1);
    });

    test('iframe is with the render class', function() {
      var iframe = client.findElement('iframe[src*="' + domain + '"]');

      assert.ok(iframe);
      assert.ok(getParentClass(iframe).indexOf('render') >= 0);
    });

    test('the transition-state of the iframe is opened', function() {
      var iframe = client.findElement('iframe[src*="' + domain + '"]');

      assert.ok(iframe);
      assert.equal(getTransitionState(iframe), 'opened');
    });

    test('iframe is visible', function() {
      var iframe = client.findElement('iframe[src*="' + domain + '"]');
      assert.ok(iframe);
      assert.ok(iframe.displayed());
    });
  });

  suite('correctly works with inline activity apps', function() {
    var activityCallerOrigin = 'app://' + ACTIVITY_CALLER_DOMAIN;
    var activityCalleeOrigin = 'app://' + ACTIVITY_CALLEE_DOMAIN;

    setup(function(done) {
      launch(client.mozApps, activityCalleeOrigin, done);
    });

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
        done();
      });
    });

    test('waitForActivity should return activity iframe', function(done) {
      waitForActivity(client.mozApps, ACTIVITY_CALLEE_DOMAIN,
        function(err, el) {
          if (err) {
            return done(err);
          }

          assert.ok(el);
          assert.ok(el.displayed());
          assert.ok(el.getAttribute('src').indexOf(activityCalleeOrigin) === 0);
          assert.ok(
            el.getAttribute('parentapp').indexOf(activityCallerOrigin) === 0
          );
          assert.ok(getParentClass(el).indexOf('render') >= 0);
          assert.equal(getTransitionState(el), 'opened');

          done();
        });
    });

    test('waitForApp should return non-activity iframe', function(done) {
      // Focus on main instance
      launch(client.mozApps, activityCalleeOrigin, function(err) {
        if (err) {
          return done(err);
        }

        waitForApp(client.mozApps, ACTIVITY_CALLEE_DOMAIN, function(err, el) {
          if (err) {
            return done(err);
          }
          assert.ok(el);
          assert.ok(el.displayed());
          assert.ok(el.getAttribute('src').indexOf(activityCalleeOrigin) === 0);
          assert.equal(el.getAttribute('parentapp'), null);
          assert.ok(getParentClass(el).indexOf('render') >= 0);
          assert.equal(getTransitionState(el), 'opened');

          done();
        });
      });
    });
  });
});
