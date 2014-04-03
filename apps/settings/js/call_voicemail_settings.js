/* global DsdsSettings, Settings */

'use strict';

(function() {
  var input, submitBtn;
  var init = function csvm_init() {
    input = document.getElementById('vm-number');
    submitBtn =
      document.querySelector('#call-voiceMailSettings button[type="submit"]');

    submitBtn.addEventListener('click', function(e) {
      e.preventDefault();
      submit();
    });

    window.addEventListener('panelready', function(e) {
      if (e.detail.current === '#call-voiceMailSettings') {
        reset(function() {
          // If current panel is 'Voicemail Settings', focus input field to
          // trigger showing the keyboard
          var cursorPos = input.value.length;
          input.focus();
          input.setSelectionRange(0, cursorPos);
        });
      } else if (input.value) {
        input.value = ''; // Clear the input for better experience
      }
    });
  };

  var submit = function csvm_submit() {
    var targetIndex = DsdsSettings.getIccCardIndexForCallSettings();
    Settings.getSettings(function(results) {
      var numbers = results['ril.iccInfo.mbdn'] || [];
      numbers[targetIndex] = input.value;
      navigator.mozSettings.createLock().set({
        'ril.iccInfo.mbdn': numbers
      });
    });
  };

  var reset = function csvm_reset(callback) {
    var targetIndex = DsdsSettings.getIccCardIndexForCallSettings();
    Settings.getSettings(function(results) {
      var numbers = results['ril.iccInfo.mbdn'];
      var number = numbers && numbers[targetIndex];
      input.value = number || '';
      if (callback) {
        callback();
      }
    });
  };

  navigator.mozL10n.ready(init);
})();
