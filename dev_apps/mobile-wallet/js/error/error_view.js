'use strict';

/* globals ERRORS, addMixin, ObserverSubjectMixin */

(function(exports) {

  const ERROR_VIEW_ID = {};
  ERROR_VIEW_ID[ERRORS.GLOBAL.NO_API] = 'no-api';
  ERROR_VIEW_ID[ERRORS.GLOBAL.NO_SIM] = 'no-sim';
  ERROR_VIEW_ID[ERRORS.GLOBAL.SIM_FAILURE] = 'sim-error';
  ERROR_VIEW_ID[ERRORS.GLOBAL.Unknown] = 'unknown-error';

  var ErrorView = function(id) {
    this._el = document.querySelector('#' + id);

    addMixin(this, ObserverSubjectMixin);

    var settingsBtn = this._el.querySelector('.error-settings-btn');
    settingsBtn.addEventListener('click',
      () => this._notify({ action: 'open-settings'}));
  };

  ErrorView.prototype = {
    _el: null,

    show: function() {
      this._el.classList.remove('hide');
    },

    hide: function() {
      this._el.classList.add('hide');
    },

    handleError: function(error) {
      console.error(error);
      var globalError = this._mapErrorToGlobal(error);
      this._showGlobalError(globalError);
      this.show();
    },

    _mapErrorToGlobal: function(error) {
      if(Object.keys(ERRORS.GLOBAL).find(k => ERRORS.GLOBAL[k] === error)) {
        return error;
      }

      // mapping no reader to no SIM
      if(ERRORS.SIM.NO_READER === error) {
        return ERRORS.GLOBAL.NO_SIM;
      }

      if(Object.keys(ERRORS.SIM).find(k => ERRORS.SIM[k] === error)) {
        return ERRORS.GLOBAL.SIM_FAILURE;
      }

      return ERRORS.GLOBAL.UNKNOWN;
    },

    _showGlobalError: function(globalError) {
      var errorViewId = ERROR_VIEW_ID[globalError];
      var nodesList = this._el.querySelectorAll('article');
      [].slice.call(nodesList).forEach(e => {
        if(e.id === errorViewId) {
          e.classList.remove('hide');
        } else {
          e.classList.add('hide');
        }
      });
    },

  };

  exports.ErrorView = ErrorView;
}(window));
