'use strict';

(function() {
  window.onload = function() {
    var simPicker = document.getElementById('sim-picker');
    var showSimPickerButtons =
      document.querySelectorAll('[data-default-card-index]');

    simPicker.addEventListener('gaiasimpicker-simselected', function(e) {
      alert('Selected SIM card ' + e.detail.cardIndex);
    });

    function clickCb(e) {
      simPicker.getOrPick(e.target.dataset.defaultCardIndex, '12345');
    }

    for (var i = 0; i < showSimPickerButtons.length; i++) {
      showSimPickerButtons[i].addEventListener('click', clickCb);
    }

    // RTL mode checkbox
    document.getElementById('dirSwitcher').addEventListener('click', e => {
      document.dir = e.target.checked && 'rtl' || 'ltr';
      window.dispatchEvent(new CustomEvent('localized'));
    });

  };
})();
