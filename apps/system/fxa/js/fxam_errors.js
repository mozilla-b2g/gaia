/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';
/* global BroadcastChannel */

(function(exports) {
  var channel = new BroadcastChannel('fxa');
  function broadcast(message) {
    channel.postMessage(message);
  }
  var Errors = {
    CONNECTION_ERROR: {
      title: 'fxa-connection-error-title',
      message: 'fxa-connection-error-message'
    },
    RESET_PASSWORD_ERROR: {
      title: 'fxa-reset-password-error-title',
      message: 'fxa-reset-password-error-message'
    },
    INVALID_EMAIL: {
      title: 'fxa-invalid-email-title',
      message: 'fxa-invalid-email-message'
    },
    INVALID_PASSWORD: {
      title: 'fxa-invalid-password-title',
      message: 'fxa-invalid-password-message'
    },
    COPPA_ERROR: {
      title: 'fxa-coppa-failure-error-title',
      message: 'fxa-coppa-failure-error-message'
    },
    COPPA_FTU_ERROR: {
      title: 'fxa-coppa-failure-error-title',
      message: 'fxa-coppa-ftu-error-message'
    },
    OFFLINE: {
      title: 'fxa-offline-error-title',
      message: 'fxa-offline-error-message'
    },
    UNKNOWN: {
      title: 'fxa-unknown-error-title',
      message: 'fxa-unknown-error-message'
    }
  };

  function _getError(error) {
    var l10nKeys = Errors[error] || Errors.UNKNOWN;
    return {
      title: l10nKeys.title,
      message: error == 'COPPA_ERROR' ? _getCoppaError() : l10nKeys.message
    };
  }

  // Tracks whether or not we have registered the coppa element.
  // Registering a custom element twice will throw an error.
  var coppaElementRegistered = false;

  /**
   * Define a custom element for the coppa link.
   * A custom element is used as an easy way to survive the current FxA
   * error html stringification. When the link is clicked a remote
   * EntrySheet is opened.
   */
  function registerCoppaLinkElement() {
    if (coppaElementRegistered) {
      return;
    }

    coppaElementRegistered = true;
    var _ = navigator.mozL10n.get;
    var learnMore = _('fxa-learn-more');
    var coppaUrl = 'http://www.ftc.gov/news-events/media-resources/' +
      'protecting-consumer-privacy/kids-privacy-coppa';

    var coppaLinkProto = Object.create(HTMLElement.prototype);

    coppaLinkProto.createdCallback = function() {
      var template = document.createElement('template');
      template.innerHTML = `<a id="coppa-link" href="#">${learnMore}</a>`;

      var shadow = this.createShadowRoot();
      this._template = template.content.cloneNode(true);

      shadow.appendChild(this._template);

      var link = shadow.getElementById('coppa-link');
      link.addEventListener('click', e => {
        e.preventDefault();
        broadcast(['EntrySheet:instantiate',
          '\u200E URL:' + coppaUrl,
          coppaUrl]);
      });
    };

    document.registerElement('fxa-coppa-link', {
      prototype: coppaLinkProto
    });
  }

  function _getCoppaError() {
    registerCoppaLinkElement();
    var _ = navigator.mozL10n.get;

    var errorText = _('fxa-coppa-failure-error-message');
    var learnMorePlaceholder = /{{\s*learnmore\s*}}/;
    var learnMoreLink = '<fxa-coppa-link></fxa-coppa-link>';
    // return as a string. fxam_error_overlay will innerHTML the whole message.
    return {
      html: errorText.replace(learnMorePlaceholder, learnMoreLink)
    };
  }

  var FxaModuleErrors = {
    responseToParams: function fxame_responseToParams(response) {
      return response && response.error ?
        _getError(response.error) : _getError('GENERIC_ERROR');
    }
  };

  exports.FxaModuleErrors = FxaModuleErrors;
}(window));
