'use strict';
var assert = require('assert');

marionette('waitforapp', function() {
  // requires
  var waitForApp = require('../lib/waitforapp').waitForApp;

  var client = marionette.client();
  marionette.plugin('mozApps', require('../lib/apps'));

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

    test('it should return element', function(done) {
      assert.ok(element);
      element.getAttribute('src', function(err, src) {
        if (err) return done(err);
        assert.ok(src.indexOf(domain) !== -1, domain);
        done();
      });
    });

    test('iframe is with the render class', function(done) {
      client.findElement('iframe[src*="' + domain + '"]', function(err, el) {
        el.scriptWith(
          function(el) {
            return el.parentNode.getAttribute('class');
          },
          function(err, value) {
            assert.ok(value.indexOf('render') !== -1);
            done();
          }
        );
      });
    });

    test('the transition-state of the iframe is opened', function(done) {
      client.findElement('iframe[src*="' + domain + '"]', function(err, el) {
        el.scriptWith(
          function(el) {
            return el.parentNode.parentNode.getAttribute('transition-state');
          },
          function(err, value) {
            assert.equal(value, 'opened');
            done();
          }
        );
      });
    });

    test('iframe is visible', function(done) {
      client.findElement('iframe[src*="' + domain + '"]', function(err, el) {
        el.displayed(function(err, displayed) {
          assert.ok(displayed);
          done();
        });
      });
    });
  });
});

