/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global LinkActionHandler, WapPushManager */

/* exported SiSlScreenHelper */

'use strict';

var SiSlScreenHelper = (function() {
  /** Screen node */
  var screen = null;

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
    title = document.getElementById('title');

    screen = document.getElementById('si-sl-screen');
    container = screen.querySelector('.container');
    text = container.querySelector('p');
    link = container.querySelector('a');

    // Event handlers
    link.addEventListener(
      'click',
      LinkActionHandler.onClick.bind(LinkActionHandler)
    );

  }

  function sssh_populateScreen(message) {
    var _ = navigator.mozL10n.get;

    // Set the callback function to be called when the app goes to background
    // while processing a message.
    WapPushManager.setOnVisibilityChangeCallback(null);

    // The close button in the header is shared between screens but sadly the
    // flow differs. Let the WapPushManaget knwo what SiSlScreenHelper function
    // invoque when the user click on the close button.
    WapPushManager.setOnCloseCallback(sssh_onClose);

    screen.hidden = false;

    // Populate the message
    if (message && !message.isExpired()) {
      title.textContent = message.sender;
      text.textContent = message.text;
      link.textContent = message.href;
      link.href = message.href;
      link.dataset.url = message.href;
    } else {
      /* If we couldn't retrieve the message then it means that the
       * message has been expired before it was displayed. */
      title.textContent = _('wap-push-message');
      text.textContent = _('this-message-has-expired');
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

  return {
    init: sssh_init,
    populateScreen: sssh_populateScreen
  };
})();
