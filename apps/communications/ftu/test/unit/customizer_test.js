'use strict';

requireApp('communications/ftu/js/resources.js');
requireApp('communications/ftu/js/customizers/customizer.js');

suite(' Customizer > ', function() {
  var eventName = 'test-event';
  var resourceType = 'blob';
  var resourcePath = '/ftu/test/unit/resources/wallpaper.jpg';

  suite(' init > ', function() {
    var resourceLoaderSpy;
    var customizer;

    suiteSetup(function() {
      resourceLoaderSpy = sinon.spy(Resources, 'load');
    });

    setup(function() {
      customizer = new Customizer(eventName, resourceType);
      resourceLoaderSpy.reset();
    });

    teardown(function() {
      customizer = null;
    });

    suiteTeardown(function() {
      resourceLoaderSpy.restore();
    });

    test(' resource loaded ', function() {
      // Init for adding the listener
      customizer.init();
      // Check that listener is working as expected
      var customizationEvent = new CustomEvent('customization', {
        detail: {
          setting: eventName,
          value: resourcePath
        }
      });
      // Once we dispatch the event, handler should
      // manage this properly
      window.dispatchEvent(customizationEvent);
      assert.isTrue(resourceLoaderSpy.calledOnce);
      // A new event should not be handled, because
      // we are removing the listener when the event
      // is handled.
      window.dispatchEvent(customizationEvent);
      assert.isTrue(resourceLoaderSpy.calledOnce);
    });
  });

  suite(' set > ', function() {
    test(' resource available ', function(done) {
      var onerror = function() {
        assert.ok(false, 'Resource not loaded properly');
        done();
      };
      var customizerSuccessful =
        new Customizer(eventName, resourceType, onerror);
      customizerSuccessful.set = function() {
        done();
      };
      // Init for adding the listener
      customizerSuccessful.init();
      // Check that listener is working as expected
      var customizationEvent = new CustomEvent('customization', {
        detail: {
          setting: eventName,
          value: resourcePath
        }
      });
      // Once we dispatch the event, handler should
      // manage this properly
      window.dispatchEvent(customizationEvent);
    });

    test(' resource unavailable ', function(done) {
      var customizerError = new Customizer(eventName, resourceType, function() {
        done();
      });
      customizerError.set = function() {
        assert.ok(false, 'Resource available when it should not');
        done();
      };
      // Init for adding the listener
      customizerError.init();
      // Check that listener is working as expected
      var customizationEvent = new CustomEvent('customization', {
        detail: {
          setting: eventName,
          value: 'wrong/path/file.jpg'
        }
      });
      // Once we dispatch the event, handler should
      // manage this properly
      window.dispatchEvent(customizationEvent);
    });
  });
});
