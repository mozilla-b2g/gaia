/*global
        EventDispatcher,
        Map,
        MozSmsFilter,
        Promise,
        Utils
*/

(function(exports) {
  'use strict';

  // http://mxr.mozilla.org/mozilla-central/source/dom/datastore/DataStore.h

  /**
   * Name of the messages data store.
   * @const {string}
   */
  const DATASTORE_NAME = 'messages';

  /**
   * Available DataStore task operation types.
   * @enum {string}
   */
  const CursorOperation = {
    UPDATE: 'update',
    ADD: 'add',
    REMOVE: 'remove',
    CLEAR: 'clear',
    DONE: 'done'
  };

  /**
   * Represents available message deliver types.
   * @enum {string}
   */
  const DeliveryType = {
    SENT: 'sent',
    RECEIVED: 'received',
    SENDING: 'sending',
    NOT_DOWNLOADED: 'not-downloaded',
    ERROR: 'error'
  };

  /**
   * Represents available message message types.
   * @enum {string}
   */
  const MessageType = {
    SMS: 'sms',
    MMS: 'mms'
  };

  /**
   * Default message list filter. Do we need to have default filter?
   */
 /* const DEFAULT_MESSAGE_FILTER = {
    startDate: null,
    endDate: null,
    numbers: null,
    delivery: DeliveryType.RECEIVED,
    read: null,
    type: null
  };*/

  var MessagesDatastore = function(mobileMessageManager) {
    EventDispatcher.mixin(this);

    this._datastorePromise = null;
    this._mobileMessageManager = mobileMessageManager;

    // TODO(azasypkin): What should we use for index/cache, IndexDB?
    this._messageCache = new Map();

    this._subscribeToDatastoreUpdates();
  };

   /**
   * Gets message by id.
   * @param {number} id Id of the message to retrieve.
   * @returns Promise.<MessageItem>
   */
  MessagesDatastore.prototype.get = function(id) {
    console.log('MessageDatastore.get called for id: %s', id);
    return this._getDatastore().then(function(datastore) {
      return datastore.get(id);
    }).catch(function(e) {
      console.error('Can not get message from datastore: %o', e);
      return Promise.reject(e);
    });
  };

  /**
   * Removes message with the specified id.
   * @param {number} id Id of the message to remove.
   * @returns {Promise.<boolean>}
   */
  MessagesDatastore.prototype.remove = function(id) {
    console.log('MessageDatastore.remove called for id: %s', id);
    return this._getDatastore().then(function(datastore) {
      // TODO(azasypkin): Remove mobileManager.delete call as soon as DB is
      // migrated from Gecko to gaia.
      return this._domRequestToPromise(function() {
        return this._mobileMessageManager.delete(id);
      }.bind(this)).then(function(isRemoved) {
        if (isRemoved) {
          return datastore.remove(id);
        }
        return isRemoved;
      });
    }.bind(this)).catch(function(e) {
      console.error('Can not remove message from datastore: %o', e);
      return Promise.reject(e);
    });
  };

  /**
   * Returns filtered list of the messages
   * @param {Object} filter Parameters that are used to filter item list.
   * @returns {Promise.<Array.<MessageItem>>}
   */
  MessagesDatastore.prototype.list = function(filter) {
    console.log('MessageDatastore.list called with filter: %o', filter);
    return this._getDatastore().then(function(datastore) {
      return new Promise(function(resolve, reject) {
        var cursor = datastore.sync(),
            result = new Map();

        function cursorResolve(task) {
          switch (task.operation) {
            case CursorOperation.ADD:
              result.set(task.data.id, task.data);
              break;

            case CursorOperation.REMOVE:
              result.remove(task.data.id);
              break;

            case CursorOperation.CLEAR:
              result.clear();
              break;

            case CursorOperation.DONE:
              resolve(result);
              return;
          }

          cursor.next().then(cursorResolve, reject);
        }

        cursor.next().then(cursorResolve, reject);
      });

      /* var filter = filter || DEFAULT_MESSAGE_FILTER,
          messageList = [];

      for(var message of this._messageCache.values()) {
        if (this._isMatch(filter, message)) {
          messageList.push(message);
        }
      }
      return messageList;*/
    }).catch(function(e) {
      console.error('Could not get message list from datastore: %o', e);
      return Promise.reject(e);
    });
  };

  /**
   * Gets total count of items stored in the datastore.
   * @returns {Promise.<number>}
   */
  MessagesDatastore.prototype.getLength = function() {
    console.log('MessageDatastore.getLength called');
    return this._getDatastore().then(function(datastore) {
      return datastore.getLength();
     }).catch(function(e) {
      console.error('Can not get length of datastore: %o', e);
      return Promise.reject(e);
    });
  };

  MessagesDatastore.prototype.markAsRead = function(id) {
    return Promise.all([this._getDatastore(), this.get(id)]).then(
      function(datastoreAndMessage) {
        var datastore = datastoreAndMessage[0],
            message = datastoreAndMessage[1];

        message.read = false;

        return datastore.put(message, message.id);
      }
    ).catch(function(e) {
      console.error('Can not mark message as read: %o', e);
      return Promise.reject(e);
    });
  };

  MessagesDatastore.prototype._getDatastore = function() {
    if (!this._datastorePromise) {
      this._datastorePromise = new Promise(function(resolve, reject) {
        navigator.getDataStores(DATASTORE_NAME).
          then(function(stores) {
            if (!stores.length) {
              throw new Error('Can not find datastore: ' + DATASTORE_NAME);
            } else if (stores.length > 1) {
              throw new Error('Multiple datastores are not supported');
            }
            // TODO: currently we sync our 'in-memory' map via fetching data
            // from mozMobileMessage, but once we migrate to DataStore API and
            // probably will use IndexDB instead of map, we'll have to use
            // datastore.sync on app startup based on last stored revisionId.
            return this._sync(stores[0], this._messageCache);
          }.bind(this)).then(function(datastore) {
            datastore.addEventListener('change', this._onChange.bind(this));
            resolve(datastore);
          }.bind(this)).catch(reject);
      }.bind(this)).catch(function(e) {
        console.error('Can not initialize datastore: %o', e);

        this._datastorePromise = null;

        return Promise.reject(e);
      }.bind(this));
    }
    return this._datastorePromise;
  };

  MessagesDatastore.prototype._sync = function(datastore, cache) {
    var mobileMessageManager = this._mobileMessageManager,
        mobileMessageConverter = this._convertToMessageItem.bind(this);
    return new Promise(function(resolve, reject) {
      datastore.clear();

      // Load all messages from mozMobileManager
      var cursor = mobileMessageManager.getMessages(
        new MozSmsFilter(),
        false
      );

      cursor.onsuccess = function onCursorSuccess() {
        if (!this.done) {
          // TODO(azasypkin): As we can't store raw mozMessage, we need to
          // define what structure should be stored in datastore.
          // MessageItem also should be protected from any modifications, so
          // that it can be updated only through datastore.put
          var messageItem = mobileMessageConverter(this.result);

          datastore.add(messageItem, this.result.id).then(function() {
            cache.set(cursor.result.id, messageItem);
            cursor.continue();
          }).catch(reject);
        } else {
          resolve(datastore);
        }
      };

      cursor.onerror = function onCursorError() {
        reject(this.error);
      };
    });
  };

  MessagesDatastore.prototype._domRequestToPromise = function(requestor) {
    return new Promise(function(resolve, reject) {
      var domRequest = requestor();
      domRequest.onsuccess = function onDomRequestSuccess() {
        resolve(this.result);
      };
      domRequest.onerror = function onDomRequestError() {
        reject(this.error);
      };
    });
  };

  /**
   * Subscribes to datastore updates (add, update, remove, clear).
   * @private
   */
  MessagesDatastore.prototype._subscribeToDatastoreUpdates = function() {
    // It's a 'private' event subscription, nobody else should listen for it.
    // Probably we can call event handlers directly to get rid of this to
    // improve performance and remove complexity.
    this.on('_' + CursorOperation.ADD, this._onDatastoreItemAdd.bind(this));

    this.on(
      '_' + CursorOperation.UPDATE,
      this._onDatastoreItemUpdate.bind(this)
    );

    this.on(
      '_' + CursorOperation.REMOVE,
      this._onDatastoreItemRemove.bind(this)
    );

    this.on('_' + CursorOperation.CLEAR, this._onDatastoreClear.bind(this));
  };

  MessagesDatastore.prototype._onChange = function(e) {
    console.log('MessagesDatastore._onChange: %o', e);
    this.emit('_' + e.operation, {
      id: e.id,
      operation: e.operation
    });
  };

  MessagesDatastore.prototype._onDatastoreItemAdd = function(e) {
    console.log(
      'MessagesDatastore._onDatastoreItemAdd called for id: %s', e.id
    );
    this._getDatastore().then(function(datastore) {
      return datastore.get(e.id);
    }).then(function(message) {
      this._messageCache.set(message.id, message);

      this.emit(e.operation, e);
    }.bind(this)).catch(function(e) {
      console.error('Error occurred while retrieving new item: %o', e);
    });
  };

  MessagesDatastore.prototype._onDatastoreItemUpdate = function(e) {
    console.log(
      'MessagesDatastore._onDatastoreItemUpdate called for id: %s', e.id
    );
    this._getDatastore().then(function(datastore) {
      return datastore.get(e.id);
    }).then(function(message) {
      this._messageCache.set(message.id, message);

      this.emit(e.operation, e);
    }.bind(this)).catch(function(e) {
      console.error('Error occurred while updating existing item: %o', e);
    });
  };

  MessagesDatastore.prototype._onDatastoreItemRemove = function(e) {
    console.log(
      'MessagesDatastore._onDatastoreItemRemove called for id: %s', e.id
    );
    this._messageCache.delete(e.id);

    this.emit(e.operation, e);
  };

  MessagesDatastore.prototype._onDatastoreClear = function(e) {
    console.log('MessagesDatastore._onDatastoreClear called');
    this._messageCache.clear();
    this.emit(e.operation);
  };

  MessagesDatastore.prototype._isMatch = function(filter, item) {
    // TODO(azasypkin): We definitely need paging and sorting here.

    // TODO(azasypkin): We can optimize to Object.keys(filter) usage if possible
    // but for big numbers it will be slow and we need some sort of non-cluster
    // indices anyway.
    if (filter.delivery) {
      if (filter.delivery !== item.delivery) {
        return false;
      }
    }

    if (typeof filter.read === 'boolean') {
      if (filter.read !== item.read) {
        return false;
      }
    }

    if (filter.type) {
      if (filter.type !== item.type) {
        return false;
      }
    }

    return true;
  };

  /**
   * TEMPORAL
   * Converts message retrieved from mozMobileMessage to Datastore compatible
   * message item.
   * @param mozMobileMessage
   * @returns
   */
  MessagesDatastore.prototype._convertToMessageItem = function(mobileMessage) {
    // http://mxr.mozilla.org/mozilla-central/source/dom/mobilemessage/
    // interfaces/nsIDOMMozMmsMessage.idl
    return {
      id: +mobileMessage.id,
      iccId: mobileMessage.iccId,
      threadId: +mobileMessage.threadId,

      type: mobileMessage.type,

      sender: mobileMessage.sender,
      receiver: mobileMessage.receiver,
      // MMS only
      receivers: mobileMessage.receivers,

      read: mobileMessage.read,
      // MMS only
      readReportRequested: mobileMessage.readReportRequested,

      delivery: mobileMessage.delivery,
      deliveryStatus: mobileMessage.deliveryStatus,
      // MMS only
      deliveryInfo: mobileMessage.deliveryInfo,
      deliveryTimestamp: mobileMessage.deliveryTimestamp,


      body: mobileMessage.body,

      // MMS only (subject, smil, attachments)
      subject: mobileMessage.subject,
      smil: mobileMessage.smil,
      attachments: mobileMessage.attachments,

      timestamp: mobileMessage.timestamp,
      sentTimestamp: mobileMessage.sentTimestamp,
      // MMS only
      expiryDate: mobileMessage.expiryDate
    };
  };

  // Expose enums that will be useful for consumers
  Object.defineProperty(MessagesDatastore.prototype, 'DeliveryType', {
    value: Object.seal(DeliveryType)
  });

  Object.defineProperty(MessagesDatastore.prototype, 'MessageType', {
    value: Object.seal(MessageType)
  });

  Utils.defineLazyGetter(exports, 'MessagesDatastore', function() {
    return new MessagesDatastore(
      navigator.mozMobileMessage || window.DesktopMockNavigatormozMobileMessage
    );
  });
})(window);
