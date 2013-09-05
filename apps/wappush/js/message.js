/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Provides the functionality required to populate the various fields of the
 * attention screen used to display the WAP Push message
 */
var WapMessageScreen = {
  /** Close button node */
  closeButton: null,
  /** Title of the message, usually holds the sender's number */
  title: null,
  /** Contents of the message */
  message: null,

  /**
   * Fills up the attention screen with the message contents and hooks up the
   * basic logic to respond to the user interaction
   */
  init: function wps_init() {
    var params = this.deserializeParameters(window.location.search);

    // Retrieve the various page elements
    this.closeButton = document.getElementById('close');
    this.title = document.getElementById('title');
    this.message = document.getElementById('message');

    // Event handlers
    this.closeButton.addEventListener('click', this.onclose);

    // Populate the message
    this.title.innerHTML = params.sender;
    this.message.innerHTML = this.escapeHTML(params.content);
  },

  /**
   * Closes the attention screen
   */
  onclose: function wps_onclose() {
    window.close();
  },

  /**
   * Escapes HTML code within a string
   *
   * @param  {String} str The original string potentially containing HTML tags
   * @return {String} A sanitized string with all HTML tags properly escaped
   */
  escapeHTML: function wpm_escapeHTML(str) {
    var rentity = /[&<>"']/g;
    var rentities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&apos;'
    };

    if (typeof str !== 'string') {
      return '';
    }

    return str.replace(rentity, function(s) {
      return rentities[s];
    });
  },

  /**
   * Retrieves the parameters from an URL and forms an object with them
   *
   * @param {String} input A string holding the parameters attached to an URL
   *
   * @return {Object} An object built using the parameters
   */
   deserializeParameters: function wpm_deserializeParameters(input) {
     var rparams = /([^?=&]+)(?:=([^&]*))?/g;
     var parsed = {};

     input.replace(rparams, function($0, $1, $2) {
       parsed[$1] = decodeURIComponent($2);
     });

     return parsed;
   }
};
