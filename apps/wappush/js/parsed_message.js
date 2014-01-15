/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global Provisioning, MessageDB */

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

      if (this.id) {
        obj.id = this.id;
      }

      if (this.created) {
        obj.created = this.created;
      }

      if (this.expires) {
        obj.expires = this.expires;
      }

      if (this.text) {
        obj.text = this.text;
      }

      if (this.action) {
        obj.action = this.action;
      }

      if (this.provisioning) {
        obj.provisioning = this.provisioning;
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
    },

    /**
     * Returns true if the message has already expired
     */
    isExpired: function pm_isExpired() {
      return (this.expires && (this.expires < Date.now()));
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
   * - id: optional for SI messages, a pseudo-unique ID for the message
   * - created: optional for SI messages, creation time of this message
   * - expires: optional for SI messages, expiration time of this message
   * - action: optional for SI/SL message, action to be executed
   * - provisioning: only for CP messages, CP related object
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

      // 'si-id' attribute, optional, string
      if (indicationNode.hasAttribute('si-id')) {
        obj.id = indicationNode.getAttribute('si-id');
      } else if (obj.href) {
        /* WAP-167 5.2.1: If the 'si-id' attribute is not specified, its value
         * is considered to be the same as the value of the 'href' attribute */
        obj.id = obj.href;
      }

      // 'created' attribute, optional, date in ISO 8601 format
      if (indicationNode.hasAttribute('created')) {
        var date = new Date(indicationNode.getAttribute('created'));

        obj.created = date.getTime();
      }

      // 'si-expires' attribute, optional, date in ISO 8601 format
      if (indicationNode.hasAttribute('si-expires')) {
        var expiresDate = new Date(indicationNode.getAttribute('si-expires'));

        obj.expires = expiresDate.getTime();
      }

      /* 'action' attribute, optional, string, defaults to 'signal-medium' when
       * not present in the incoming message, see WAP-167 7.2 */
      if (indicationNode.hasAttribute('action')) {
        obj.action = indicationNode.getAttribute('action');
      } else {
        obj.action = 'signal-medium';
      }

      /* If the message has a 'delete' action but no 'si-id' field than it's
       * malformed and should be immediately discarded, see WAP-167 6.2 */
      if (obj.action === 'delete' && !obj.id) {
        return null;
      }
    } else if (message.contentType === 'text/vnd.wap.sl') {
      // SL message
      var slNode = doc.querySelector('sl');

      // 'href' attribute, always present
      obj.href = slNode.getAttribute('href');

      /* 'action' attribute, optional, string, defaults to 'execute-low' when
       * not present in the incoming message, see WAP-168 5.2 */
      if (slNode.hasAttribute('action')) {
        obj.action = slNode.getAttribute('action');
      } else {
        obj.action = 'execute-low';
      }
    } else if (message.contentType === 'text/vnd.wap.connectivity-xml') {
      // Client provisioning (CP) message
      obj.provisioning = Provisioning.fromMessage(message);
      // Security information is mandatory for the application. The application
      // must discard any message with no security information.
      if (!obj.provisioning.authInfo) {
        return null;
      }

      obj.text = 'cp-message-received';
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

  /**
   * Copy a message and returns an object holding its fields.
   *
   * @param {Object} message A ParsedMessage message.
   *
   * @return {Object} An object holding the contents of the WAP message as
   *                  separate fields.
   */
  ParsedMessage.copy = function pm_copy(message) {
    return new ParsedMessage(message);
  };

  exports.ParsedMessage = ParsedMessage;
})(window);
