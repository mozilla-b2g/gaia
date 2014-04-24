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
  var realSettingsService;
  mocksHelper.attachTestHelpers();

  suiteSetup(function() {
    realSettingsService = Settings.SettingsService;
    Settings.SettingsService = {
      navigate : function() {}
    };
  });

  suiteTeardown(function() {
    Settings.SettingsService = realSettingsService;
  });

  suite('WebActivityHandler > ', function() {
    var activityRequest = {};
    var clock;
    var cachedSection;

    setup(function() {
      clock = this.sinon.useFakeTimers();
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
            section: '',
            filterBy: ''
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

      suiteTeardown(function() {
        delete document.body.dataset.filterBy;
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

      suite('called with filterby', function() {
        test('we would filter out related connectivity panels', function() {
          activityRequest.source.data.section = 'root';
          activityRequest.source.data.filterBy = 'connectivity';
          Settings.webActivityHandler(activityRequest);
          clock.tick(1);
          assert.equal(document.body.dataset.filterBy, 'connectivity');
          assert.equal(cachedSection.dataset.dialog, 'true');
        });
      });
    });
  });
});
