/* global LinkActionHandler, Utils, WapPushManager */

/* exported SiSlScreenHelper */

'use strict';

var SiSlScreenHelper = (function() {
  /** Screen node */
  var screen = null;

  /** Header node */
  var header = null;

  /** Title of the message, usually holds the sender's number */
  var title = null;

  /** Message container */
  var container = null;

  /** Message text */
  var text = null;

  /** Message link */
  var link = null;

  function sssh_init() {
    // Retrieve the various page elements
    title = document.getElementById('title-si-sl');
    screen = document.getElementById('si-sl-screen');
    header = document.getElementById('header-si-sl');

    container = screen.querySelector('.container');

    text = container.querySelector('p');
    link = container.querySelector('a');

    // Event handlers
    header.addEventListener('action', sssh_onClose);
    link.addEventListener(
      'click',
      LinkActionHandler.onClick.bind(LinkActionHandler)
    );

  }

  function sssh_populateScreen(message) {
    screen.hidden = false;

    // Populate the message
    if (message && !message.isExpired()) {
      var l10nTitle = Utils.prepareMessageTitle(message);

      navigator.mozL10n.setAttributes(title, l10nTitle.id, l10nTitle.args);
      text.textContent = message.text;
      link.textContent = message.href;
      link.href = message.href;
      link.dataset.url = message.href;
    } else {
      /* If we couldn't retrieve the message then it means that the
       * message has been expired before it was displayed. */
      navigator.mozL10n.setAttributes(title, 'wap-push-message');
      navigator.mozL10n.setAttributes(text, 'this-message-has-expired');
      link.textContent = '';
      link.href = '';
      link.dataset.url = '';
    }
  }

  /**
   * Closes the application
   */
  function sssh_onClose() {
    WapPushManager.close();
  }

  /**
   * Hide the SI/SL screen helper
   */
  function sssh_hide() {
    screen.hidden = true;
  }

  return {
    init: sssh_init,
    hide: sssh_hide,
    populateScreen: sssh_populateScreen
  };
})();
