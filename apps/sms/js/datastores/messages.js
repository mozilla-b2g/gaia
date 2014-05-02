/*global Map, MozSmsFilter, Promise */

(function(exports) {
  'use strict';

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
    UPDATE: 'updated',
    ADD: 'added',
    REMOVE: 'removed',
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
  const DEFAULT_MESSAGE_FILTER = {
    startDate: null,
    endDate: null,
    numbers: null,
    delivery: DeliveryType.RECEIVED,
    read: null,
    type: null
  };

  var MessagesDatastore = function(mobileMessageManager) {
    this._datastorePromise = null;
    // Hacky EventTarget approach, just to simplify it for now.
    this._dispatcher = document.createElement('x-messages-dispatcher');
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
    return this._getDatastore().then(function() {
      return this._messageCache.get(id);
    }.bind(this)).catch(function(e) {
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
    return this._getDatastore().then(function() {
      var filter = filter || DEFAULT_MESSAGE_FILTER,
          messageList = [];

      for(var message of this._messageCache.values()) {
        if (this._isMatch(filter, message)) {
          messageList.push(message);
        }
      }

      return messageList;
    }.bind(this)).catch(function(e) {
      console.error('Can not get message list from datastore: %o', e);
      return Promise.reject(e);
    });
  };

  /**
   * Gets total count of items stored in the datastore.
   * @returns {Promise.<number>}
   */
  MessagesDatastore.prototype.getLength = function() {
    console.log('MessageDatastore.getLength called');
    return this._getDatastore().then(function() {
      return this._messageCache.size;
      }.bind(this)).catch(function(e) {
      console.error('Can not get length of datastore: %o', e);
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
        return Promise.reject(e);
      });
    }
    return this._datastorePromise;
  };

  MessagesDatastore.prototype._sync = function(datastore, cache) {
    var mobileMessageManager = this._mobileMessageManager;

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
          var messageItem = {
            id: this.result.id,
            type: this.result.type,
            delivery: this.result.delivery,
            read: this.result.read
          };

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
    this.addEventListener(
      '_' + CursorOperation.ADD,
      this._onDatastoreItemAdd.bind(this)
    );

    this.addEventListener(
      '_' + CursorOperation.UPDATE,
      this._onDatastoreItemUpdate.bind(this)
    );

    this.addEventListener(
      '_' + CursorOperation.REMOVE,
      this._onDatastoreItemRemove.bind(this)
    );

    this.addEventListener(
      '_' + CursorOperation.CLEAR,
      this._onDatastoreClear.bind(this)
    );
  };

  MessagesDatastore.prototype._onChange = function(e) {
    console.log('MessagesDatastore._onChange: %o', e);
    this.dispatchEvent(
      new CustomEvent('_' + e.operation, {
        detail: {
          id: e.id,
          operation: e.operation
        }
      })
    );
  };

  MessagesDatastore.prototype._onDatastoreItemAdd = function(e) {
    console.log(
      'MessagesDatastore._onDatastoreItemAdd called for id: %s',
      e.detail.id
    );
    this._getDatastore().then(function(datastore) {
      return datastore.get(e.detail.id);
    }).then(function(message) {
      this._messageCache.set(message.id, message);

      this.dispatchEvent(new CustomEvent(e.operation, e.detail));
    }.bind(this)).catch(function(e) {
      console.error('Error occurred while retrieving new item: %o', e);
    });
  };

  MessagesDatastore.prototype._onDatastoreItemUpdate = function(e) {
    console.log(
      'MessagesDatastore._onDatastoreItemUpdate called for id: %s',
      e.detail.id
    );
    this._getDatastore().then(function(datastore) {
      return datastore.get(e.detail.id);
    }).then(function(message) {
      this._messageCache.set(message.id, message);

      this.dispatchEvent(new CustomEvent(e.operation, e.detail));
    }.bind(this)).catch(function(e) {
      console.error('Error occurred while updating existing item: %o', e);
    });
  };

  MessagesDatastore.prototype._onDatastoreItemRemove = function(e) {
    console.log(
      'MessagesDatastore._onDatastoreItemRemove called for id: %s',
      e.detail.id
    );
    this._messageCache.delete(e.detail.id);

    this.dispatchEvent(new CustomEvent(e.operation, e.detail));
  };

  MessagesDatastore.prototype._onDatastoreClear = function(e) {
    console.log('MessagesDatastore._onDatastoreClear called');
    this._messageCache.clear();
    this.dispatchEvent(new CustomEvent(e.operation));
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

  MessagesDatastore.prototype.addEventListener = function() {
    this._dispatcher.addEventListener.apply(
      this._dispatcher,
      Array.slice(arguments)
    );
  };

  MessagesDatastore.prototype.removeEventListener = function() {
    this._dispatcher.removeEventListener.apply(
      this._dispatcher,
      Array.slice(arguments)
    );
  };

  MessagesDatastore.prototype.dispatchEvent = function() {
    this._dispatcher.dispatchEvent.apply(
      this._dispatcher,
      Array.slice(arguments)
    );
  };

  // Expose enums that will be useful for consumers
  Object.defineProperty(MessagesDatastore.prototype, 'DeliveryType', {
    value: Object.seal(DeliveryType)
  });

  Object.defineProperty(MessagesDatastore.prototype, 'MessageType', {
    value: Object.seal(MessageType)
  });

  exports.MessagesDataStore = new MessagesDatastore(
    navigator.mozMobileMessage || window.DesktopMockNavigatormozMobileMessage
  );
})(window);
