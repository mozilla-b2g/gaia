'use strict';

mocha.setup({ globals: ['kFontStep', 'minFontSize',
  'kMasterVolume', 'kShortPressDuration', 'gTonesFrequencies',
  'keypadSoundIsEnabled', 'TonePlayer', 'KeypadManager'] });
/* globals MockL10n, MocksHelper */

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

var mocksHelperForKeypad = new MocksHelper([
  'SettingsListener'
]).init();

suite('Emergency Keypad', function() {
  var realL10n;

  mocksHelperForKeypad.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    document.body.classList.add('hidden');
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  test('> waits for l10n before becoming visible', function(done) {
    this.sinon.spy(navigator.mozL10n, 'once');
    require('/js/keypad.js', function() {
      assert.isTrue(document.body.classList.contains('hidden'));
      navigator.mozL10n.once.yield();
      assert.isFalse(document.body.classList.contains('hidden'));
      done();
    });
  });
});

