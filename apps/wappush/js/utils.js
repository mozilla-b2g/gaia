/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(exports) {
  'use strict';

  /**
   * Various utility functions mainly used to process strings and URLs
   */
  var Utils = {
    /**
     * Retrieves the parameters from an URL and forms an object with them
     *
     * @param {String} input A string holding the parameters attached to an URL.
     *
     * @return {Object} An object built using the parameters.
     */
    deserializeParameters: function ut_deserializeParameters(input) {
      var rparams = /([^?=&]+)(?:=([^&]*))?/g;
      var parsed = {};

      input.replace(rparams, function($0, $1, $2) {
        parsed[$1] = decodeURIComponent($2);
      });

      return parsed;
    },

    /**
     * Generate message title according from message sender and the
     * serviceId if there are multiple SIMs.
     *
     * @param {Object} The message from which the title will be generated.
     */
    prepareMessageTitle: function ut_prepareMessageTitle(message) {
      if (navigator.mozIccManager &&
          navigator.mozIccManager.iccIds.length > 1) {
        return {
          id: 'message-title-with-sim',
          args: {
            id: +message.serviceId + 1,
            title: message.sender
          }
        };
      } else {
        return {
          id: 'message-title',
          args: { title: message.sender }
        };
      }
    }
  };

  exports.Utils = Utils;

}(this));
