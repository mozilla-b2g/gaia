Calendar.FirstTimeUse = (function(window) {

  const DEFAULT_HINT_TIMEOUT = 6000;
  const SWIPE_TO_NAVIGATE_HINT_KEY = 'showSwipeToNavigateHint';

  var FirstTimeUse = {

    /**
     * Determine whether or not we should be showing the first use
     * hint that teaches the user to swipe to navigate between
     * months, days, weeks, etc in the time views.
     * 
     * Automatically saves state so that the hint is only shown once.
     * 
     * @param {Object} The Calendar App Object
     */
    doFirstTime: function(calendarApp) {
      var self = this;

      // Read from the Setting store to figure out if we should be
      // showing the hint or not.
      calendarApp.store('Setting').getValue(SWIPE_TO_NAVIGATE_HINT_KEY, 
        function(error, value) {
          // Bail on error.
          if(error !== null) {
            return;
          }

          // Should we show the swipe to navigate hint?
          if(value) {
            // Show the hint.
            self._showSwipeToNavigateHint();
            // Remember to not show this hint again.
            calendarApp.store('Setting').set(SWIPE_TO_NAVIGATE_HINT_KEY, false);
          }
        });
    },

    /**
     * Handle showing and hiding the 'swipe to navigate' hint.
     */
    _showSwipeToNavigateHint: function() {
      var hint = window.document.getElementById('hint-swipe-to-navigate');
      hint.classList.remove('hide');
      hint.classList.add('show');

      function hideHint() {
        hint.classList.remove('show');
        hint.classList.add('hide');

        clearTimeout(hideHint.timeout);
      }

      hint.onclick = hideHint;
      hideHint.timeout = setTimeout(hideHint, DEFAULT_HINT_TIMEOUT);
    }
  };

  return FirstTimeUse;

}(this));
