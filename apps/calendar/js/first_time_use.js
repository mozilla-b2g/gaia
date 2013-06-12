Calendar.FirstTimeUse = (function(window) {

  const DEFAULT_HINT_TIMEOUT = 6000;
  const SWIPE_TO_NAVIGATE_HINT_KEY = "showSwipeToNavigateHint";

  var FirstTimeUse = {

    doFirstTime: function(calendarApp) {
      var self = this;
      
      // Our value eating callback. OMNOMNOM!
      function getValueCallback(error, value) {
        // Bail on error.
        if(error != null) {
          return;
        }

        // Should we show the swipe to navigate hint?
        if(value) {
          // Show the hint.
          self._showSwipeToNavigateHint();
          // Remember to not show this hint again.
          calendarApp.store('Setting').set(SWIPE_TO_NAVIGATE_HINT_KEY, false);
        }
      }

      calendarApp.store('Setting').getValue(SWIPE_TO_NAVIGATE_HINT_KEY, getValueCallback);
    },

    _showSwipeToNavigateHint: function() {
      var hint = window.document.getElementById('hint-swipe-to-navigate');
      hint.classList.remove('hide');
      hint.classList.add('show');

      function hideHint() {
        hint.classList.remove('show');
        hint.classList.add('hide');

        clearTimeout(hideHint.timeout);
        hideHint.timeout = 0;
      }

      hint.onclick = hideHint;
      hideHint.timeout = setTimeout(hideHint, DEFAULT_HINT_TIMEOUT);
    }
  };

  return FirstTimeUse;

}(this));
