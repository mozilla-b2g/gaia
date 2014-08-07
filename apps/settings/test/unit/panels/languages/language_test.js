'use strict';

suite('Languages > ', function() {
  var mockKeyboardHelper;
  var languages;
  var realL10n;

  var modules = [
    'unit/mock_l10n',
    'shared_mocks/mock_keyboard_helper',
    'panels/languages/languages'
  ];
  var maps = {
    'panels/languages/languages': {
      'shared/keyboard_helper': 'shared_mocks/mock_keyboard_helper',
      'modules/date_time': 'MockDateTime'
    }
  };

  suiteSetup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], maps, function() {});
    var that = this;

    // Define MockDateTime
    this.MockDateTime = {};
    define('MockDateTime', function() {
      return that.MockDateTime;
    });

    requireCtx(modules, function(MockL10n, MockKeyboardHelper,
      Languages) {
      // mock l10n
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;

      // mock keyboard helper
      mockKeyboardHelper = MockKeyboardHelper;

      languages = Languages();
      done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  suite('when localized change', function() {
    setup(function() {
      this.sinon.stub(mockKeyboardHelper, 'changeDefaultLayouts');
      this.sinon.stub(languages, 'updateDateTime');
      languages.onLocalized();
    });
    test('we would call update() and changeDefaultLayouts()', function() {
      assert.ok(languages.updateDateTime.called);
      assert.ok(mockKeyboardHelper.changeDefaultLayouts.called);
    });
  });
});
