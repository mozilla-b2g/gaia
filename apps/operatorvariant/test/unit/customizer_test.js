/* global requireApp, suite, suiteSetup, sinon, Resources, setup, Customizer,
   test, assert, suite, teardown, suiteTeardown */

'use strict';
requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

requireApp('operatorvariant/js/resources.js');
requireApp('operatorvariant/js/customizers/customizer.js');

suite(' Customizer > ', function() {
  var realSettings;

  var eventName = 'test-event';
  var resourceType = 'blob';
  var resourcePath = 'resources/wallpaper.jpg';

  suite(' init > ', function() {
    var resourceLoaderSpy;
    var customizer;

    suiteSetup(function() {
      realSettings = navigator.mozSettings;
      navigator.mozSettings = window.MockNavigatorSettings;

      resourceLoaderSpy = sinon.spy(Resources, 'load');
    });

    suiteTeardown(function() {
      navigator.mozSettings = realSettings;
    });

    setup(function() {
      customizer = new Customizer(eventName, resourceType);
      customizer.set = function () {};
      resourceLoaderSpy.reset();
    });

    teardown(function() {
      navigator.mozSettings.mTeardown();
      customizer = null;
    });

    suiteTeardown(function() {
      resourceLoaderSpy.restore();
    });

    test(' resource loaded ', function() {
      // Init for adding the listener
      customizer.init();
      // Check that listener is working as expected
      var eventContent = {
        detail: {
          setting: eventName,
          value: resourcePath,
          simPresentOnFirstBoot: 'A Random Value'
        }
      };
      var customizationEvent = new CustomEvent('customization', eventContent);
      // Once we dispatch the event, handler should
      // manage this properly
      window.dispatchEvent(customizationEvent);
      assert.isTrue(resourceLoaderSpy.calledOnce);
      assert.equal(customizer.simPresentOnFirstBoot,
                eventContent.detail.simPresentOnFirstBoot);
      // A new event should not be handled, because
      // we are removing the listener when the event
      // is handled.
      window.dispatchEvent(customizationEvent);
      assert.isTrue(resourceLoaderSpy.calledOnce);
    });
  });

  suite(' set > ', function() {
    test(' resource available ', function(done) {
      var eventContent = {
        detail: {
          setting: eventName,
          value: resourcePath,
          simPresentOnFirstBoot: 'a value'
        }
      };

      var onerror = function() {
        assert.ok(false, 'Resource not loaded properly');
        done();
      };
      var customizerSuccessful =
        new Customizer(eventName, resourceType, onerror);
      customizerSuccessful.set = function() {
        assert.equal(customizerSuccessful.simPresentOnFirstBoot,
                  eventContent.detail.simPresentOnFirstBoot);
        done();
      };
      // Init for adding the listener
      customizerSuccessful.init();
      // Check that listener is working as expected
      var customizationEvent = new CustomEvent('customization', eventContent);
      // Once we dispatch the event, handler should
      // manage this properly
      window.dispatchEvent(customizationEvent);
    });

    test(' resource unavailable ', function(done) {
      var eventContent = {
        detail: {
          setting: eventName,
          value: 'wrong/path/file.jpg',
          simPresentOnFirstBoot: 'Another value'
        }
      };

      var customizerError = new Customizer(eventName, resourceType, function() {
        assert.equal(customizerError.simPresentOnFirstBoot,
                  eventContent.detail.simPresentOnFirstBoot);
        done();
      });
      customizerError.set = function() {
        assert.ok(false, 'Resource available when it should not');
        done();
      };
      // Init for adding the listener
      customizerError.init();
      // Check that listener is working as expected
      var customizationEvent = new CustomEvent('customization', eventContent);
      // Once we dispatch the event, handler should
      // manage this properly
      window.dispatchEvent(customizationEvent);
    });
  });
});
