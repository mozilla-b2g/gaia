'use strict';
suite('Languages > ', function() {
  var mockL10n;
  var mockKeyboardHelper;
  var languages;
  var realL10n;
  
  suiteSetup(function(done) {
    var modules = [
      'unit/mock_l10n',
      'shared_mocks/mock_keyboard_helper',
      'panels/languages/languages'
    ];
    var maps = {
      'panels/languages/languages': {
        'shared/keyboard_helper': 'shared_mocks/mock_keyboard_helper'
      }
    };
    testRequire(modules, maps,
      function(MockL10n, MockKeyboardHelper, Languages) {
        // mock l10n
        mockL10n = MockL10n;
        realL10n = window.navigator.mozL10n;
        window.navigator.mozL10n = mockL10n;

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
      this.sinon.stub(languages, 'update');
      languages.onLocalized();
    });
    test('we would call update() and changeDefaultLayouts()', function() {
      assert.ok(languages.update.called);
      assert.ok(mockKeyboardHelper.changeDefaultLayouts.called);
    });
  });
});
