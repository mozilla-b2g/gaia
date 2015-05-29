'use strict';

/* globals ErrorView, addMixin, ObserverSubjectMixin */
/* exported AppView */

(function(exports) {
  var AppView = function(mainViewId, errorViewId) {
    this._mainEl = document.querySelector('#' + mainViewId);

    this._errorView = new ErrorView(errorViewId);
    this._errorView.addListener(this);

    var settingsBtn = this._mainEl.querySelector('#settings-edit');
    settingsBtn.addEventListener('click', () => this._settingsClicked());

    addMixin(this, ObserverSubjectMixin);
  };

  AppView.prototype = {
    _mainEl: null,
    _errorView: null,

    showMainView: function showMainView() {
      this._mainEl.classList.remove('hide');
      this._errorView.hide();
    },

    hideMainView: function hideMainView() {
      this._mainEl.classList.add('hide');
    },

    showErrorView: function showErrorView(error) {
      this._errorView.handleError(error);
      this.hideMainView();
    },

    hideErrorView: function hideErrorView() {
      this._errorView.hide();
    },

    onEvent: function onEvent(id, data) {
      if(data.action === 'open-settings') {
        this._settingsClicked();
      }
    },

    _settingsClicked: function _settingsClicked() {
      this._notify({ action: 'open-settings' });
    },
  },

  exports.AppView = AppView;
}((typeof exports === 'undefined') ? window : exports));
