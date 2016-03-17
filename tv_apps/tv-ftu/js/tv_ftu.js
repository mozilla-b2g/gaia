/* global evt, SettingsListener, KeyNavigationAdapter, SimpleKeyNavigation
*/
(function (exports) {
'use strict';

window.addEventListener('load', function() {

  var tvFTU = evt({

    init: function () {
      this.APP_USAGE_ENABLE_KEY = 'debug.performance_data.shared';
      this.APP_USAGE_ENABLE_VALUE = true;
      this.APP_USAGE_DISABLE_VALUE = false;

      this._currentPage = null;
      this._currentContentSection = null;
      this._currentContent = null;
      this._currentButtonSection = null;
      this._currentArrowIconSection = null;
      this._currentFocused = null;
      this._currentNavigationType = null;

      this.keyNavAdapter = new KeyNavigationAdapter();
      this.keyNavAdapter.init();
      this.keyNavAdapter.on('move', this.onKeyMove.bind(this));
      this.keyNavAdapter.on('back-keyup', this.onBackKeyUp.bind(this));
      this.keyNavAdapter.on('enter-keyup', this.onEnterKeyUp.bind(this));
      this.keyNavAdapter.on('move-keyup', (key) => {
        if (key === 'down' &&
          this.getContentUnscrolledHeight() <= 0 &&
          this._currentNavigationType == 'unscrolled_content') {
          this.changeNavigationType('buttons');
        }
      });

      this.keyNav = new SimpleKeyNavigation();
      this.keyNav.start([], SimpleKeyNavigation.DIRECTION.HORIZONTAL);
      this.keyNav.on('focusChanged', elem => this.fire('focus', elem));

      // Special treatment for translation with links
      var links = document.querySelectorAll(
        '#app-usage-page p[data-l10n-id=fxos-is-free] > a');
      links[0].setAttribute('tabindex', -1);
      links[0].setAttribute('id', 'fxos-privacy-notice-link');
      links[1].setAttribute('tabindex', -1);
      links[1].setAttribute('id', 'moz-privacy-policy-link');

      this.on('focus', this.onFocus.bind(this));
      this.goToPage('app-usage-page');
    },

    goToPage: function (id) {
      if (this._currentPage) {
        this._currentPage.classList.add('hidden');
      }
      this._currentPage = document.getElementById(id);
      this._currentArrowIconSection =
        this._currentPage.querySelector('.arrow-icon-section');
      this._currentButtonSection =
        this._currentPage.querySelector('.button-section');
      this._currentContent = this._currentPage.querySelector('.page-content');
      this._currentContentSection =
        this._currentPage.querySelector('.content-section');
      this._currentPage.classList.remove('hidden');

      this._currentNavigationType = null;
      this.changeNavigationType('buttons');
      if (this.getContentUnscrolledHeight() > 0) {
        this.changeNavigationType('unscrolled_content');
      }
    },

    getContentUnscrolledHeight: function () {
      var unscrolledHeight = this._currentContent.clientHeight -
                             this._currentContentSection.scrollTop -
                             this._currentContentSection.clientHeight;
      return unscrolledHeight;
    },

    changeNavigationType: function (type) {
      if (this._currentNavigationType !== type) {

        this._currentNavigationType = type;
        this._currentArrowIconSection.classList.add('hidden');
        this.keyNav.pause();

        switch (type) {
          case 'unscrolled_content':
            this._currentArrowIconSection.classList.remove('hidden');
            this._currentButtonSection.classList.add('hidden');
            this._currentContentSection.focus();
            this.fire('focus', this._currentContentSection);
          break;

          case 'links':
            this.keyNav.resume();
            this.keyNav.updateList(Array.prototype.slice.call(
              this._currentPage.querySelectorAll('a')));
          break;

          case 'buttons':
            this._currentButtonSection.classList.remove('hidden');
            this.keyNav.resume();
            this.keyNav.updateList(Array.prototype.slice.call(
              this._currentPage.querySelectorAll('.page-button')));
            var defaultBtn =
              this._currentPage.querySelector('.page-default-button');
            if (defaultBtn) {
              this.keyNav.focusOn(defaultBtn);
            }
          break;
        }
      }
    },

    onFocus: function (elem) {
      this._currentFocused = elem;
    },

    onKeyMove: function (key) {

      switch (this._currentNavigationType) {
        case 'unscrolled_content':
          if (key === 'down' && this.getContentUnscrolledHeight() <= 0) {
            this.changeNavigationType('buttons');
          }
        break;

        case 'links':
          // this.keyNav only handles
          // the left/right key (horizontal key navigation)
          // so we need extra handling of the up/down key here
          if ((key === 'down' || key === 'right') &&
            'moz-privacy-policy-link' === this._currentFocused.id) {
            // If focus on the last link, moz-privacy-policy-link,
            // then change navigation target to buttons
            this.changeNavigationType('buttons');
          } else if (key === 'up') {
            this.keyNav.movePrevious();
          } else if (key === 'down') {
            this.keyNav.moveNext();
          }
        break;

        case 'buttons':
          if (key === 'up') {
            if (this._currentContentSection.scrollTop > 0) {
              this.changeNavigationType('unscrolled_content');
            } else if (this._currentPage.querySelectorAll('a').length > 0) {
              this.changeNavigationType('links');
            }
          }
        break;
      }
    },

    onEnterKeyUp: function () {
      switch (this._currentFocused.id) {
        case 'app-usage-page-no-button':
        case 'app-usage-page-yes-button':
          var setting = {};
          if (this._currentFocused.id === 'app-usage-page-yes-button') {
            setting[this.APP_USAGE_ENABLE_KEY] = this.APP_USAGE_ENABLE_VALUE;
          } else {
            setting[this.APP_USAGE_ENABLE_KEY] = this.APP_USAGE_DISABLE_VALUE;
          }
          SettingsListener.getSettingsLock().set(setting);
          window.close();
        break;

        case 'moz-privacy-policy-link':
        case 'fxos-privacy-notice-link':
          var privacySection =
            document.querySelector('#privacy-policy-page > .content-section');
          var mozPrivacy =
            document.querySelector('#moz-privacy-policy-content');
          var fxosPrivacy =
            document.querySelector('#fxos-privacy-notice-content');

          if (this._currentFocused.id === 'moz-privacy-policy-link') {
            mozPrivacy.style.display = 'block';
            fxosPrivacy.style.display = 'none';
          } else {
            mozPrivacy.style.display = 'none';
            fxosPrivacy.style.display = 'block';
          }
          privacySection.scrollTo(0, 0);
          this.goToPage('privacy-policy-page');
        break;

        case 'open-app-usage-page-button':
          this.goToPage('app-usage-page');
        break;
      }
    },

    onBackKeyUp: function () {
      if (this._currentPage.id !== 'app-usage-page') {
        this.goToPage('app-usage-page');
      }
    }
  });

  tvFTU.init();

  exports.tvFTU = tvFTU;
});

})(window);
