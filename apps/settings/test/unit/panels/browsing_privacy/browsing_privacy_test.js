suite('Browsing Privacy >', function() {
  'use strict';

  var realNavigatorSettings, browsingPrivacy;

  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_navigator_moz_settings',
      'panels/browsing_privacy/browsing_privacy'
    ];

    testRequire(modules, {}, function(MockNavigatorSettings, BrowsingPrivacy) {
      realNavigatorSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      browsingPrivacy = BrowsingPrivacy();

      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
  });


  suite('clear functions >', function() {
    test('clear history function sets setting', function() {
      browsingPrivacy.clearHistory();
      assert.isTrue(
        navigator.mozSettings.mSettings['clear.browser.history'],
        'clear browser history setting should be set'
      );
    });

    test('clear private data function sets setting', function() {
      browsingPrivacy.clearPrivateData();
      assert.isTrue(
        navigator.mozSettings.mSettings['clear.browser.private-data'],
        'clear browser private data setting should be set'
      );
    });

    test('clear history dialog sets setting', function() {
      browsingPrivacy.clearBookmarksData();
      assert.isTrue(
        navigator.mozSettings.mSettings['clear.browser.bookmarks'],
        'clear browser bookmarks settings should be set'
      );
    });

    teardown(function() {
      navigator.mozSettings.mTeardown();
    });
  });
});
