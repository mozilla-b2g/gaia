/* global evt, SettingsListener, KeyNavigationAdapter, SimpleKeyNavigation */
(function (exports) {
'use strict';

window.addEventListener('load', function() {

  var tvFTU = evt({

    init: function () {
      this.APP_USAGE_ENABLE_KEY = 'debug.performance_data.shared';
      this.APP_USAGE_ENABLE_VALUE = true;
      this.APP_USAGE_DISABLE_VALUE = false;

      this._noButton =
          document.getElementById('app-usage-no-button');
      this._yesButton =
          document.getElementById('app-usage-yes-button');
      this._terms =
          document.getElementById('app-usage-terms');
      this._termsSection =
          document.getElementById('app-usage-terms-section');
      this._arrowIcon =
          document.getElementById('app-usage-arrow-icon');

      this.keyNavAdapter = new KeyNavigationAdapter();
      this.keyNavAdapter.init();
      this.keyNavAdapter.on('move', this.onKeyMove.bind(this));
      this.keyNavAdapter.on('enter-keyup', this.onEnterKeyUp.bind(this));

      this.buttonNav = new SimpleKeyNavigation();
      this.buttonNav.start(
        [this._noButton, this._yesButton],
        SimpleKeyNavigation.DIRECTION.HORIZONTAL
      );
      this.buttonNav.on('focusChanged', (elem) => {
        this.fire('focus', elem);
      });
      this.buttonNav.pause();

      this._termsSection.focus();
      this._currentFocused = this._termsSection;
      this.on('focus', this.onFocus.bind(this));
    },

    onFocus: function (elem) {
      this._currentFocused = elem;
    },

    onKeyMove: function (key) {
      switch (key) {
        case 'up':
          if (this._currentFocused !== this._termsSection) {
            this.buttonNav.blur();
            this.buttonNav.pause();
            this._termsSection.focus();
            this.fire('focus', this._termsSection);
            this._arrowIcon.classList.remove('hidden');
          }
        break;

        case 'down':
          if (this._currentFocused === this._termsSection) {
            var unscrolledHeight = this._terms.clientHeight -
                                   this._termsSection.scrollTop -
                                   this._termsSection.clientHeight;
            if (unscrolledHeight <= 0) {
              this.buttonNav.resume();
              this.buttonNav.focusOn(this._yesButton);
              this._arrowIcon.classList.add('hidden');
            }
          }
        break;
      }
    },

    onEnterKeyUp: function () {
      switch (this._currentFocused) {
        case this._yesButton:
        case this._noButton:
          var setting = {};
          if (this._currentFocused === this._yesButton) {
            setting[this.APP_USAGE_ENABLE_KEY] = this.APP_USAGE_ENABLE_VALUE;
          } else {
            setting[this.APP_USAGE_ENABLE_KEY] = this.APP_USAGE_DISABLE_VALUE;
          }
          SettingsListener.getSettingsLock().set(setting);
          window.close();
        break;
      }
    }
  });

  tvFTU.init();

  exports.tvFTU = tvFTU;
});

})(window);
