/* global BridgeServiceMixin,
          BroadcastChannel
*/

/* exported MozMobileMessageShim */

(function(exports) {
'use strict';

/**
 * Name of the service for mozMobileMessage API shim.
 * @type {string}
 */
const SERVICE_NAME = 'moz-mobile-message-shim';

/**
 * Event set that key is corresponding to mozMobileMessage events and value is
 * the name that broadcasts to client side.
 * @type {Object.<string, string>}
 */
const EVENTS = Object.freeze({
  'received': 'message-received',
  'sending': 'message-sending',
  'sent': 'message-sent',
  'failed': 'message-failed-to-send',
  'deleted': 'threads-deleted',
  'readsuccess': 'message-read',
  'deliverysuccess': 'message-delivered'
});

/**
 * Array of method names that need to be exposed for API shim.
 * @type {Array.<string>}
 */
const METHODS = Object.freeze(['getMessage', 'retrieveMMS', 'send', 'sendMMS',
  'delete', 'markMessageRead', 'getSegmentInfoForText']);

/**
 * Array of stream names that need to return data (messages/threads) in chunk.
 * @type {Array.<string>}
 */
const STREAMS = Object.freeze(['getThreads', 'getMessages']);

var mozMobileMessage = null;

var MozMobileMessageShim = {
  init(mobileMessage) {
    if (!mobileMessage) {
      return;
    }

    function capitalize(str) { 
      return str[0].toUpperCase() + str.slice(1);
    }

    var endPoint = new BroadcastChannel(SERVICE_NAME + '-channel');
    mozMobileMessage = mobileMessage;
    this.initService(endPoint);

    Object.keys(EVENTS).forEach((event) => {
      mozMobileMessage.addEventListener(
        event,
        this['on' + capitalize(event)].bind(this)
      );
    });
  },

  /* Events */

  onSending(e) {
    this.broadcast('message-sending', { message: e.message });
  },

  onFailed(e) {
    this.broadcast('message-failed-to-send', { message: e.message });
  },

  onDeliverysuccess(e) {
    this.broadcast('message-delivered', { message: e.message });
  },

  onReadsuccess(e) {
    this.broadcast('message-read', { message: e.message });
  },

  onSent(e) {
    this.broadcast('message-sent', { message: e.message });
  },

  onReceived(e) {
    this.broadcast('message-received', { message: e.message });
  },

  onDeleted(e) {
    if (e.deletedThreadIds && e.deletedThreadIds.length) {
      this.broadcast('threads-deleted', {
        ids: e.deletedThreadIds
      });
    }
  },

  /* Methods */

  getMessage(id) {
    return mozMobileMessage.getMessage(id);
  },

  /**
   * Call platform retrieveMMS API to retrieve the MMS by ID.
   * @param {Number} id MMS message id.
   * @returns {Promise.<void|Error>} return void if MMS is retrieved
   *  successfully or error while failed. 
   */
  retrieveMMS(id) {
    return mozMobileMessage.retrieveMMS(id).then((message) => {
      // Return void instead of message to avoid clone error issue.
      return;
    });
  },

  send(recipient, content, sendOpts) {
    return mozMobileMessage.send(recipient, content, sendOpts);
  },

  sendMMS(dataOpts, sendOpts) {
    return mozMobileMessage.sendMMS(dataOpts, sendOpts);
  },

  delete(id) {
    return mozMobileMessage.delete(id);
  },

  markMessageRead(id, isRead, sendReadReport) {
    return mozMobileMessage.markMessageRead(id, isRead, sendReadReport);
  },

  getSegmentInfoForText(text) {
    return mozMobileMessage.getSegmentInfoForText(text);
  },

  /* Streams */

  /**
   * Stream wrapper for getThreads API for returning threads in chunk.
   * @param {ServiceStream} stream Channel for returning thread.
   */
  getThreads(stream) {
    var cursor = null;

    // WORKAROUND for bug 958738. We can remove 'try\catch' block once this bug
    // is resolved
    try {
      cursor = mozMobileMessage.getThreads();
    } catch(e) {
      console.error('Error occurred while retrieving threads: ' + e.name);
      stream.abort();
      return;
    }

    cursor.onsuccess = function onsuccess() {
      var result = this.result;

      if (result) {
        // TODO: we might need to track result of write to stop iterating
        //       through cursor.
        stream.write(result);
        this.continue();
        return;
      }

      stream.close();
    };

    cursor.onerror = function onerror() {
      console.error('Reading the database. Error: ' + this.error.name);
      stream.abort();
    };
  },

  /**
   * Stream wrapper for getMessages API for returning messages in chunk.
   * @param {ServiceStream} stream Channel for returning message.
   * @param {*} options Options for getMessages API.
   */
  getMessages(stream, options) {
    /*
    options {
      filter: a MobileMessageFilter or similar object
      invert: option to invert the selection
    }

     */
    var invert = options.invert;
    var filter = options.filter;
    var cursor = mozMobileMessage.getMessages(filter, !invert);

    cursor.onsuccess = function onsuccess() {
      if (!this.done) {
        stream.write(this.result);
        this.continue();
      } else {
        stream.close();
      }
    };

    cursor.onerror = function onerror() {
      var msg = 'Reading the database. Error: ' + this.error.name;
      console.error(msg);
      stream.abort();
    };

    stream.cancel = function() {
      stream.close();
    };
  }
};

exports.MozMobileMessageShim = Object.seal(
  BridgeServiceMixin.mixin(
    MozMobileMessageShim,
    SERVICE_NAME, { 
      methods: METHODS,
      streams: STREAMS,
      events: Object.keys(EVENTS).map((key) => EVENTS[key])
    }
  )
);

}(this));
