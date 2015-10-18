/**
 *  Handles Firefox Account welcome and settings page UI.
 */

/* global Notification */

'use strict';

(function (exports) {

  /**
   * Handle Firefox Account settings UI
   * @param {FirefoxAccount} firefoxAccount Handle Firefox Account status &
   *                                        actions
   */
  function FirefoxAccountUI (firefoxAccount) {

    this.isCustomEnabled = false;
    this.firefoxAccount = firefoxAccount;
    this.syncSettings = {
      syncBookmarks: true,
      syncHistory: false,
      syncPasswords: false,
      syncTab: false
    };

    this.fxaWelcomeContainer = document.getElementById('fxa-welcome');

    this.fxaWelcomeDescription =
      document.getElementById('fxa-welcome-description');

    this.fxaWelcomeCustomButton =
      document.getElementById('fxa-welcome-custom-button');

    this.fxaWelcomeCustomBookmarksButton =
      document.getElementById('fxa-welcome-custom-bookmarks-button');

    this.fxaWelcomeCustomHistoryButton =
      document.getElementById('fxa-welcome-custom-history-button');

    this.fxaWelcomeContainer.addEventListener('click',
      this.handleClickEvent.bind(this));
  }

  FirefoxAccountUI.prototype = {

    constructor: FirefoxAccountUI,

    showWelcome() {
      this.fxaWelcomeDescription.dataset.l10nArgs =
        JSON.stringify({'email': this.firefoxAccount.email});
      this.fxaWelcomeContainer.classList.remove('ishidden');
      this.fxaWelcomeCustomButton.focus();
    },

    closeWelcome() {
      this.fxaWelcomeContainer.classList.add('ishidden');
    },

    handleClickEvent(e) {
      // On radio button click
      if (e.target.tagName === 'INPUT' &&
          e.target.name === 'fxa-welcome-sync-options') {
        this.handleRadioClick(e);
        return;
      }

      // On checkbox click
      if (e.target.tagName === 'INPUT' &&
          e.target.name === 'fxa-welcome-custom-options') {
        this.handleCheckboxClick(e);
        return;
      }

      // On Done button click
      if (e.target.id === 'fxa-welcome-done') {
        this.handleDoneClick(e);
      }
    },

    handleRadioClick(e) {
      e.stopPropagation();

      // save user selected sync settings
      if (e.target.value === 'bookmarks') {
        this.syncSettings.syncBookmarks = true;
        this.syncSettings.syncHistory = false;
        this.syncSettings.syncPasswords = false;
        this.syncSettings.syncTab = false;
      } else if (e.target.value === 'all') {
        this.syncSettings.syncBookmarks = true;
        this.syncSettings.syncHistory = true;
        this.syncSettings.syncPasswords = true;
        this.syncSettings.syncTab = true;
      } else if (e.target.value === 'custom') {
        this.syncSettings.syncBookmarks =
          this.fxaWelcomeCustomBookmarksButton.checked;
        this.syncSettings.syncHistory =
          this.fxaWelcomeCustomHistoryButton.checked;
        // TODO: add checkboxes for password & tab

      }

      // toggle custom options
      if (this.fxaWelcomeCustomButton.checked && !this.isCustomEnabled) {
        this.enableCustomOptions();
      } else if (!this.fxaWelcomeCustomButton.checked &&
                 this.isCustomEnabled) {
        this.disableCustomOptions();
      }
    },

    handleCheckboxClick(e) {
      e.stopPropagation();

      // save user selected custom option
      switch (e.value) {
        case 'bookmarks':
          this.syncSettings.syncBookmarks = e.target.checked;
          break;
        case 'history':
          this.syncSettings.syncHistory = e.target.checked;
          break;
        // TODO: add handler for password & tab

      }
    },

    handleDoneClick(e) {
      e.stopPropagation();

      navigator.mozL10n.formatValue('data-will-begin-syncing')
      .then((message) => {
        console.log(message);
        var notification;
        notification = new Notification('Firefox Account', {
          body: message
        });
      });

      this.firefoxAccount.setSyncSettings(this.syncSettings).then( () => {
        this.firefoxAccount.sync().then(() => {
          navigator.mozL10n.formatValue('synced-successfully')
          .then((message) => {
            console.log(message);
            var notification;
            notification = new Notification('Firefox Account', {
              body: message
            });
          });
        });
      });
      this.closeWelcome();
    },

    enableCustomOptions() {
      this.isCustomEnabled = true;

      var nodeList =
        document.querySelectorAll('input[name="fxa-welcome-custom-options"]');

      for (var i=0; i<nodeList.length; i++) {
        nodeList[i].removeAttribute('disabled');
      }
    },

    disableCustomOptions() {
      this.isCustomEnabled = false;

      var nodeList =
        document.querySelectorAll('input[name="fxa-welcome-custom-options"]');

      for (var i=0; i<nodeList.length; i++) {
        nodeList[i].setAttribute('disabled', true);
      }
    }

  };

  exports.FirefoxAccountUI = FirefoxAccountUI;

})(window);
