'use strict';
/* global MocksHelper, Accessibility */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/accessibility.js');

var mocksForTTLView = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/Accessibility', function() {

  var subject;

  mocksForTTLView.attachTestHelpers();
  setup(function() {
    subject = new Accessibility();
  });

  suite('handleEvent', function() {
    /* Disabled bug 1016748
    test('toggles screenreader state after button sequence', function() {
      assert.ok(!subject.settings['accessibility.screenreader']);
      var volumeUp = {
        detail: {
          type: 'volume-up-button-press'
        }
      };

      var volumeDown = {
        detail: {
          type: 'volume-down-button-press'
        }
      };

      for (var i = 0; i < 3; i++) {
        subject.handleEvent(volumeUp);
        subject.handleEvent(volumeDown);
      }

      var lock = MockSettingsListener.getSettingsLock().locks.pop();
      assert.equal(lock['accessibility.screenreader'], true);
    });
    */
  });

});
