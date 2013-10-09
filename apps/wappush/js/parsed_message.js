/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
(function(exports) {
  'use strict';

  /**
   * Default constructor, use it to copy objects. To parse objects from XML use
   * the factory function from()
   *
   * @param {Object} [obj] An object from which to copy the fields.
   */
  function ParsedMessage(obj) {
    if (obj) {
      for (var key in obj) {
        this[key] = obj[key];
      }
    }
  }

  ParsedMessage.prototype = {
    /**
     * Constructor, this is for internal use only
     */
    constructor: ParsedMessage,

    /**
     * Creates an untyped object from a typed one
     *
     * @return {Object} An untyped representation of this object.
     */
    toJSON: function pm_toJSON() {
      var obj = {
        type: this.type,
        sender: this.sender,
        timestamp: this.timestamp
      };

      if (this.href) {
        obj.href = this.href;
      }

      if (this.text) {
        obj.text = this.text;
      }

      return obj;
    },

    /**
     * Saves the message in the database. Once the transaction is completed
     * invokes the success callback. If an error occurs the error callback will
     * be invoked with the corresponding error as its sole parameter.
     *
     * @param {Function} success A callback invoked when the transaction
     *        completes successfully.
     * @param {Function} error A callback invoked if an operation fails.
     */
    save: function pm_save(success, error) {
      MessageDB.put(this.toJSON(), success, error);
    }
  };

  /**
   * Parse a message and returns an object holding its fields. The returned
   * object will contain the following fields:
   * - type: the content type of the message, either 'text/vnd.wap.si' or
   *         'text/vnd.wap.sl'
   * - sender: the sender of this message, a MSISDN
   * - timestamp: a timestamp taken when parsing the object
   * - href: optional for SI messages, required for SL, a URL to be displayed
   * - text: optional, text to be displayed
   *
   * @param {Object} message A WAP Push message as delivered by the system.
   * @param {Object} timestamp A timestamp for the message reception time.
   *
   * @return {Object} An object holding the contents of the WAP message as
   *                  separate fields.
   */
  ParsedMessage.from = function pm_from(message, timestamp) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(message.content, 'text/xml');
    var obj = new ParsedMessage();

    // We don't check for errors as the message has already been validated

    obj.type = message.contentType;
    obj.sender = message.sender;
    obj.timestamp = timestamp.toString();

    if (message.contentType === 'text/vnd.wap.si') {
      // SI message
      var indicationNode = doc.querySelector('indication');

      // 'href' attribute, optional, string
      if (indicationNode.hasAttribute('href')) {
        obj.href = indicationNode.getAttribute('href');
      }

      obj.text = indicationNode.textContent;
    } else if (message.contentType === 'text/vnd.wap.sl') {
      // SL message
      var slNode = doc.querySelector('sl');

      // 'href' attribute, always present
      obj.href = slNode.getAttribute('href');
    } else {
      return null;
    }

    return obj;
  };

  /**
   * Loads the message corresponding to the specified timestamp from the
   * database. The message is passed to the success callback once the
   * function succeeds. If the message is not present the success callback
   * will be with a null parameter. If an error occurs the error callback
   * will be invoked with the corresponding error as its sole parameter.
   *
   * @param {Number} timestamp The timestamp of the message we want to
   *        retrieve.
   * @param {Function} success A callback invoked when the transaction
   *        completes successfully.
   * @param {Function} error A callback invoked if an operation fails.
   */
  ParsedMessage.load = function pm_load(timestamp, success, error) {
    MessageDB.retrieve(timestamp,
      function pm_loadSuccess(message) {
        if (message) {
          success(new ParsedMessage(message));
        } else {
          success(null);
        }
      },
      error
    );
  };

  exports.ParsedMessage = ParsedMessage;
})(window);
