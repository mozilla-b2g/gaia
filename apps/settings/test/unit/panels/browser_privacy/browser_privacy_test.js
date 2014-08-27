suite('Browser Privacy >', function() {
  'use strict';

  var realNavigatorSettings, browserPrivacy;

  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_navigator_moz_settings',
      'panels/browser_privacy/browser_privacy'
    ];

    testRequire(modules, {}, function(MockNavigatorSettings, BrowserPrivacy) {
      realNavigatorSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      browserPrivacy = BrowserPrivacy();

      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
  });


  suite('clear functions >', function() {
    test('clear history function sets setting', function() {
      browserPrivacy.clearHistory();
      assert.isTrue(
        navigator.mozSettings.mSettings['clear.browser.history'],
        'clear browser history setting should be set'
      );
    });

    test('clear private data function sets setting', function() {
      browserPrivacy.clearPrivateData();
      assert.isTrue(
        navigator.mozSettings.mSettings['clear.browser.private-data'],
        'clear browser private data setting should be set'
      );
    });

    test('clear history dialog sets setting', function() {
      browserPrivacy.clearBookmarksData();
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
