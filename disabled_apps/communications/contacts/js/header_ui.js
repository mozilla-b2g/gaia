/* globals ActivityHandler, MainNavigation */

(function(exports) {
  'use strict';

  exports.HeaderUI = {
    _lastCustomHeaderCallback: null,
    settings: document.getElementById('view-settings'),
    settingsButton: document.getElementById('settings-button'),
    header: document.getElementById('contacts-list-header'),
    addButton: document.getElementById('add-contact-button'),
    editModeTitleElement: document.getElementById('edit-title'),
    appTitleElement: document.getElementById('app-title'),

    setupActionableHeader: function() {
      this.header.removeAttribute('action');
      this.settingsButton.hidden = false;
      this.addButton.hidden = false;

      this.appTitleElement.setAttribute('data-l10n-id', 'contacts');
    },

    setCancelableHeader: function(cb, titleId) {
      this.setupCancelableHeader(titleId);
      this.header.removeEventListener('action', this.handleCancel);
      this._lastCustomHeaderCallback = cb;
      this.header.addEventListener('action', cb);
    },

    setNormalHeader: function() {
      this.setupActionableHeader();
      this.header.removeEventListener('action', this._lastCustomHeaderCallback);
      this.header.addEventListener('action', this.handleCancel);
    },

    setupCancelableHeader: function(alternativeTitle) {
      this.header.setAttribute('action', 'close');
      this.settingsButton.hidden = true;
      this.addButton.hidden = true;
      if (alternativeTitle) {
        this.appTitleElement.setAttribute('data-l10n-id', alternativeTitle);
      }
      // Trigger the title to re-run font-fit/centering logic
      this.appTitleElement.textContent = this.appTitleElement.textContent;
    },

    handleCancel: function() {
      //If in an activity, cancel it
      if (ActivityHandler.currentlyHandling) {
        ActivityHandler.postCancel();
        MainNavigation.home();
      } else {
        MainNavigation.back();
      }
    },

    updateSelectCountTitle: function(count) {
      navigator.mozL10n.setAttributes(this.editModeTitleElement,
                                      'SelectedTxt',
                                      {n: count});
    },

    hideAddButton: function() {
      this.addButton.classList.add('hide');
    },

    updateHeader: function(isCancelable) {
      if (isCancelable) {
        var alternativeTitle = null;
        var activityName = ActivityHandler.activityName;
        if (activityName === 'pick' || activityName === 'update') {
          alternativeTitle = 'selectContact';
        }
        this.setupCancelableHeader(alternativeTitle);
      } else {
        this.setupActionableHeader();
      }
    }
  };
})(window);
