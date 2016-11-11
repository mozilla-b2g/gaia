/* global Settings, MocksHelper */
'use strict';

requireApp('settings/js/settings.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_performance_testing_helper.js');

mocha.globals([
  'PerformanceTestingHelper'
]);

var mocksHelper = new MocksHelper([
  'PerformanceTestingHelper'
]).init();

suite('Settings > ', function() {
  mocksHelper.attachTestHelpers();

  suite('WebActivityHandler > ', function() {
    var activityRequest = {};
    var clock;
    var cachedSection;

    setup(function() {
      clock = this.sinon.useFakeTimers();
      this.sinon.stub(Settings, 'lazyLoad');
      this.sinon.stub(Settings, '_transit');

      Settings._currentActivity = null;
      Settings._currentActivitySection = null;

      // We would give different elements by id
      this.sinon.stub(document, 'getElementById', function(id) {
        if (id !== 'fake') {
          // cached it for later testing
          cachedSection = document.createElement('section');
          return cachedSection;
        } else {
          return null;
        }
      });

      activityRequest = {
        source: {
          name: '',
          data: {
            section: ''
          }
        },
        postError: function(error) {}
      };
    });

    suite('configure (window disposition) >', function() {
      setup(function() {
        activityRequest.source.name = 'configure';
      });

      suite('go to non-existed element ', function() {
        test('we would jump to root panel by default', function() {
          activityRequest.source.data.section = 'fake';
          Settings.webActivityHandler(activityRequest);
          clock.tick(1);
          assert.equal(Settings.currentPanel, '#root');
        });
      });

      suite('go to existed element', function() {
        test('we would jump to the right panel', function() {
          activityRequest.source.data.section = 'wifi';
          Settings.webActivityHandler(activityRequest);
          clock.tick(1);
          assert.equal(Settings.currentPanel, '#wifi');
        });
      });
    });

    suite('configure_inline >', function() {
      setup(function() {
        activityRequest.source.name = 'configure_inline';
        this.sinon.spy(activityRequest, 'postError');
      });

      suite('go to non-existed element', function() {
        test('we would do nothing but calling postError', function() {
          activityRequest.source.data.section = 'fake';
          Settings.webActivityHandler(activityRequest);
          clock.tick(1);
          assert.ok(activityRequest.postError.called);
        });
      });

      suite('go to existed element', function() {
        test('we would jump to the right panel', function() {
          activityRequest.source.data.section = 'messaging';
          Settings.webActivityHandler(activityRequest);
          clock.tick(1);
          assert.equal(cachedSection.dataset.dialog, 'true');
        });
      });
    });
  });
});
