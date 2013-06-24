Calendar.ns('Views').FirstTimeUse = (function() {

  /**
   * Default amount of time (in milliseconds) we will show the hint before 
   * dismissing it automatically.
   */
  const DEFAULT_HINT_TIMEOUT = 6000;

  /**
   * Settings Store key used to determine whether we've shown the hint once.
   */
  const SWIPE_TO_NAVIGATE_HINT_KEY = 'showSwipeToNavigateHint';

  /**
   * The First Time Use Object is used for any and all hints that should
   * be displayed to the user in various views when they are used for the
   * first time.
   * 
   * Currently this is limited to the 'swipe to navigate' hint.
   * 
   */
  function FirstTimeUse(options) {
    Calendar.View.apply(this, arguments);
    this.store = this.app.store('Setting');
  }

  FirstTimeUse.prototype = {
    __proto__: Calendar.View.prototype,

    /**
     * Determine whether or not we should be showing the first use
     * hint that teaches the user to swipe to navigate between
     * months, days, weeks, etc in the time views.
     * 
     * Automatically saves state so that the hint is only shown once.
     * 
     * @param {Object} calendarApp - The Calendar App Object
     */
    doFirstTime: function() {
      // Read from the Setting store to figure out if we should be
      // showing the hint or not.
      this.store.getValue(SWIPE_TO_NAVIGATE_HINT_KEY, 
        function(error, value) {
          // Bail on error.
          if(error !== null) {
            return;
          }

          // Should we show the swipe to navigate hint?
          if(value) {
            // Show the hint.
            this._showSwipeToNavigateHint();
            // Remember to not show this hint again.
            this.store.set(SWIPE_TO_NAVIGATE_HINT_KEY, false);
          }
        }.bind(this));
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

}());
