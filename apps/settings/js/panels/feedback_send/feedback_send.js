define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var SettingsCache = require('modules/settings_cache');
  require('shared/async_storage');

  var SendFeedback = function(){};
  SendFeedback.prototype = {
    _SettingsCache: SettingsCache,
    _SettingsService: SettingsService,

    init: function(elements) {
      this.elements = elements;
      this.options = {};
      this._sendData = {
        product: 'Firefox OS',
        platform: 'Firefox OS'
      };
      this._showEmail = false;
    },

    _isHappy: function() {
      var happy = this.options && this.options.feel;
      return happy === 'feedback-happy';
    },

    updateTitle: function() {
      var id = 'feedback_whyfeel_' + (this._isHappy() ? 'happy' : 'sad');
      this.elements.title.setAttribute('data-l10n-id', id);
    },

    /**
     * Get previous inputs from asyncStorage.
     */
    getPreviousInputs: function() {
      window.asyncStorage.getItem('feedback', function(value) {
        this._inputData = value || {};
      }.bind(this));
    },

    keepAllInputs: function() {
      window.asyncStorage.setItem('feedback', this._inputData);
    },

    get _inputData() {
      return {
        description: this.elements.description.value,
        email: this.elements.emailInput.value,
        emailEnable: this._showEmail
      };
    },

    set _inputData(data) {
      this.elements.description.value = data.description || '';
      this.elements.emailInput.value = data.email || '';
      this._showEmail = !data.emailEnable;
      this.enableEmail();
    },

    alertConfirm: function() {
      this.elements.alertDialog.hidden = true;
      this.elements.alertMsg.textContent = '';
      this.elements.alertMsg.removeAttribute('data-l10n-id');
    },

    /**
     * Once the data is sent successfully and user click 'ok' button,
     * we'll go back to improveBrowserOS panel.
     */
    done: function() {
      this._SettingsService.navigate('improveBrowserOS');
      this.elements.doneDialog.hidden = true;
    },

    send: function() {
      this.elements.sendBtn.disabled = true;
      if (!navigator.onLine) {
        this._messageHandler('connect-error');
        return;
      }
      var emailBar = this.elements.emailColumn;
      var emailInput = this.elements.emailInput;
      var contextInput = this.elements.description;
      if (contextInput.textLength === 0) {
        this._messageHandler('empty-comment');
        return;
      } else {
        this._sendData.description = contextInput.value;
      }

      if (!emailBar.hidden) {
        this._sendData.email = emailInput.value;
      } else {
        delete this._sendData.email;
      }

      if (!emailBar.hidden &&
          (!emailInput.value.length ||
          !emailInput.validity.valid)) {
        this._messageHandler('wrong-email');
        return;
      }

      var currentSetting = this._SettingsCache.cache;
      var feedbackUrl = currentSetting['feedback.url'];
      this._sendData.version =
        currentSetting['deviceinfo.os'];
      this._sendData.device =
        currentSetting['deviceinfo.hardware'];
      this._sendData.locale =
        currentSetting['language.current'];
      this._sendData.happy = this._isHappy();

      this._xhr = new XMLHttpRequest({mozSystem: true});
      this._xhr.open('POST', feedbackUrl, true);
      this._xhr.setRequestHeader(
        'Content-type', 'application/json');
      this._xhr.timeout = 5000;
      this._xhr.onload =
        this._responseHandler.bind(this);
      this._xhr.ontimeout = function() {
        this._messageHandler('timeout');
      }.bind(this);
      this._xhr.send(JSON.stringify(this._sendData));
    },

    /**
     * Show email input column if use click the checkbox.
     */
    enableEmail: function() {
      var original = this._showEmail;
      this._showEmail = !original;
      this.elements.emailEnable.checked = !original;
      this.elements.emailColumn.hidden = original;
    },

    back: function() {
      this.keepAllInputs();
      this._SettingsService.navigate('improveBrowserOS-chooseFeedback');
    },

    _responseHandler: function() {
      switch (this._xhr.status) {
        case 201:
          this._messageHandler('success');
          break;
        case 429:
          // this status is trying to prevent users keep sending the same
          // message, but from server aspect, it means success.
          this._messageHandler('success');
          break;
        case 404:
          this._messageHandler('server-off');
          break;
        case 400:
          this._messageHandler('wrong-email');
          break;
        default:
          this._messageHandler('connect-error');
          break;
      }
    },

    _messageHandler: function(type) {
      if (type === 'success') {
        this.elements.doneDialog.hidden = false;
      } else {
        this.keepAllInputs();
        this.elements.alertMsg.setAttribute('data-l10n-id',
          'feedback-errormessage-' + type);
        this.elements.alertDialog.hidden = false;
      }
      this.elements.sendBtn.disabled = false;
    }
  };
  return function ctor_send_feedback() {
    return new SendFeedback();
  };
});
