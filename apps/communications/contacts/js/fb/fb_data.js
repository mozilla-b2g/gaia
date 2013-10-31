'use strict';

var fb = window.fb || {};

if (!window.fb.contacts) {
  (function() {
    var contacts = fb.contacts = {};

    var datastore;
    // Datastore name declared on the manifest.webapp
    var DATASTORE_NAME = 'Gaia_Facebook_Friends';
    // Record Id for the index
    var INDEX_ID = 1;

    // Indicates the initialization state
    var readyState = 'notInitialized';
    // Custom event for notifying initializations
    var INITIALIZE_EVENT = 'fb_ds_init';

    // Creates the internal Object in the datastore that will act as an index
    function createIndex() {
      return {
        // By Facebook UID
        byUid: Object.create(null),
        // By internationalized tel number
        // (We are not supporting dups right now)
        byTel: Object.create(null),
        // By short tel number
        // (We are not supporting dups right now)
        byShortTel: Object.create(null)
      };
    }

    // The index we need to keep the correspondance between FB Friends and
    // datastore Ids
    var index;

    // Indicates whether the index is dirty
    var isIndexDirty = false;

    function notifyOpenSuccess(cb) {
      readyState = 'initialized';
      if (typeof cb === 'function') {
        window.setTimeout(cb, 0);
      }
      var ev = new CustomEvent(INITIALIZE_EVENT);
      document.dispatchEvent(ev);
    }

    function initError(outRequest, error) {
      outRequest.failed(error);
    }

    // Creates a default handler for errors
    function defaultError(request) {
      return defaultErrorCb.bind(null, request);
    }

    // Creates a default handler for success
    function defaultSuccess(request) {
      return defaultSuccessCb.bind(null, request);
    }

    function defaultErrorCb(request, error) {
      request.failed(error);
    }

    function defaultSuccessCb(request, result) {
      request.done(result);
    }

    function setIndex(obj) {
      index = obj;
      isIndexDirty = false;
    }

    function doGet(uid, outRequest) {
      var dsId = index.byUid[uid];

      var successCb = successGet.bind(null, outRequest);
      var errorCb = errorGet.bind(null, outRequest, uid);

      if (typeof dsId === 'undefined') {
        // Refreshing the index just in case
        datastore.get(INDEX_ID).then(function success_index(obj) {
          setIndex(obj);
          dsId = index.byUid[uid];
          if (typeof dsId !== 'undefined') {
            return datastore.get(dsId);
          }
          else {
            errorGet(outRequest, uid, {
              name: 'No DataStore Id found'
            });
            // Just to avoid warnings of function not always returning
            return null;
          }
        }, errorCb).then(successCb, errorCb);
      }
      else {
        datastore.get(dsId).then(successCb, errorCb);
      }
    }

    function successGet(outReq, data) {
      outReq.done(data);
    }

    function errorGet(outReq, uid, err) {
      window.console.error('Error while getting object for UID: ', uid);
      outReq.failed(err.name);
    }

    /**
     *  Allows to obtain the FB friend information by UID
     *
     *
     */
    contacts.get = function(uid) {
      var outRequest = new fb.utils.Request();

      window.setTimeout(function get() {
        contacts.init(function() {
          doGet(uid, outRequest);
        }, function() {
          initError(outRequest);
        });
      }, 0);

      return outRequest;
    };

    function doGetByPhone(tel, outRequest) {
      var dsId = index.byTel[tel] || index.byShortTel[tel];

      if (typeof dsId !== 'undefined') {
        datastore.get(dsId).then(function success(friend) {
          outRequest.done(friend);
        }, defaultError(outRequest));
      }
      else {
        // Refreshing the index just in case
        datastore.get(INDEX_ID).then(function success(obj) {
          setIndex(obj);
          dsId = index.byTel[tel] || index.byShortTel[tel];
          if (typeof dsId !== 'undefined') {
            datastore.get(dsId).then(function success(friend) {
              outRequest.done(friend);
            }, defaultError(outRequest));
          }
          else {
            outRequest.done(null);
          }
        }, function(err) {
          window.console.error('The index cannot be refreshed: ', err.name);
          outRequest.failed(err);
        });
      }
    }

    contacts.getByPhone = function(tel) {
      var outRequest = new fb.utils.Request();

      window.setTimeout(function get_by_phone() {
        contacts.init(function get_by_phone() {
          doGetByPhone(tel, outRequest);
        },
        function() {
          initError(outRequest);
        });
      }, 0);

      return outRequest;
    };

    function doSave(obj, outRequest) {
      var globalId;

      datastore.add(obj).then(function success(newId) {
        var uid = obj.uid;
        index.byUid[uid] = newId;
        // Update index by tel
        // As this is populated by FB importer we don't need to have
        // extra checks
        if (Array.isArray(obj.tel)) {
          obj.tel.forEach(function(aTel) {
            index.byTel[aTel.value] = newId;
          });
        }
        if (Array.isArray(obj.shortTelephone)) {
          obj.shortTelephone.forEach(function(aTel) {
            index.byShortTel[aTel] = newId;
          });
        }
        globalId = newId;

        return datastore.update(INDEX_ID, index);
      }, defaultError(outRequest)).then(function success() {
          defaultSuccessCb(outRequest, globalId);
        }, defaultError(outRequest));
    }

    /**
     *  Allows to save FB Friend Information
     *
     */
    contacts.save = function(obj) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function save() {
        contacts.init(function() {
          doSave(obj, retRequest);
        },
        function() {
          initError(retRequest);
        });
      }, 0);

      return retRequest;
    };

    /**
     *  Allows to update FB Friend Information
     *
     *
     */
    contacts.update = function(obj) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function save() {
        contacts.init(function() {
          doUpdate(obj, retRequest);
        },
        function() {
          initError(retRequest);
        });
      }, 0);

      return retRequest;
    };

    function doUpdate(obj, outRequest) {
      var dsId = index.byUid[obj.uid];

      var successCb = successUpdate.bind(null, outRequest);
      var errorCb = errorUpdate.bind(null, outRequest, obj.uid);

      if (typeof dsId !== 'undefined') {
        datastore.update(dsId, obj).then(successCb, errorCb);
      }
      else {
        // Let's try to refresh the index
        datastore.get(INDEX_ID).then(function success_index(data) {
          setIndex(data);
          dsId = index.byUid[obj.uid];
          if (typeof dsId !== 'undefined') {
            return datastore.update(dsId, obj);
          }
          else {
            errorCb({
              name: 'Datastore Id cannot be found'
            });
            // Just to avoid warnings in strict mode
            return null;
          }
        }, errorCb).then(successCb, errorCb);
      }
    }

    function successUpdate(outRequest) {
      outRequest.done();
    }

    function errorUpdate(outRequest, uid, error) {
      window.console.error('Error while updating datastore for: ', uid);
      outRequest.failed(error);
    }

    /**
     *  Allows to return the total number of records in the DataStore (minus 1)
     *  That's because the index object also counts
     *
     */
    function doGetLength(outRequest) {
      datastore.getLength().then(function success(length) {
        outRequest.done(length - 1);
      },
      function error(err) {
        outRequest.failed(err);
      });
    }

    contacts.getLength = function() {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function() {
        contacts.init(function get_all() {
          doGetLength(retRequest);
        },
        function() {
          initError(retRequest);
        });
      }, 0);

      return retRequest;
    };

    function doRemove(uid, outRequest, forceFlush) {
      var dsId = index.byUid[uid];

      var errorCb = errorRemove.bind(null, outRequest, uid);
      var objToDelete;

      if (typeof dsId === 'undefined') {
        // Refreshing the index
        datastore.get(INDEX_ID).then(function success_index(obj) {
          setIndex(obj);
          dsId = index.byUid[uid];

          if (typeof dsId !== 'undefined') {
            return datastore.get(dsId);
          }
          else {
            errorRemove(outRequest, {
              name: 'No DataStore Id for UID: ' + uid
            });
            // Just to avoid warnings of no return
            return null;
          }
        }, function(err) {
            errorRemove(outRequest, uid, {
              name: 'Could not get the index data: ' + err.name
            });
          }).then(function success_get_remove(obj) {
            objToDelete = obj;
            return datastore.remove(dsId);
        },errorCb).then(function sucess_rm(removed) {
          successRemove(outRequest, objToDelete, forceFlush, removed);
        }, errorCb);
      }
      else {
        datastore.get(dsId).then(function success_get_remove(obj) {
          objToDelete = obj;
          return datastore.remove(dsId);
        }, errorCb).then(function success_rm(removed) {
          successRemove(outRequest, objToDelete, forceFlush, removed);
        }, errorCb);
      }
    }

    // Needs to update the index data conveniently
    function successRemove(outRequest, deletedFriend, forceFlush, removed) {
      if (removed === true) {
        delete index.byUid[deletedFriend.uid];

        // Need to update the tel indexes
        if (Array.isArray(deletedFriend.tel)) {
          deletedFriend.tel.forEach(function(aTel) {
            delete index.byTel[aTel.value];
          });
        }

        if (Array.isArray(deletedFriend.shortTelephone)) {
          deletedFriend.shortTelephone.forEach(function(aTel) {
            delete index.byShortTel[aTel];
          });
        }

        if (forceFlush) {
          var flushReq = fb.contacts.flush();

          flushReq.onsuccess = function() {
            outRequest.done(true);
          };
          flushReq.onerror = function() {
            outRequest.failed(flushReq.error);
          };
        }
        else {
          isIndexDirty = true;
          outRequest.done(true);
        }
      }
      else {
        outRequest.done(false);
      }
    }

    function errorRemove(outRequest, uid, error) {
      window.console.error('FB Data: Error while removing ', uid, ': ',
                           error.name);
      outRequest.failed(error);
    }

    /**
     *  Allows to remove FB contact from the DB
     *
     */
    contacts.remove = function(uid, flush) {
      var hasToFlush = (flush === true ? flush : false);
      var retRequest = new fb.utils.Request();

      window.setTimeout(function remove() {
        contacts.init(function() {
          doRemove(uid, retRequest, hasToFlush);
        },
        function() {
           initError(retRequest);
        });
      }, 0);

      return retRequest;
    };

    /**
     *  Removes all the FB Friends and the index
     *
     *  The index is restored as empty
     *
     */
    contacts.clear = function() {
      var outRequest = new fb.utils.Request();

       window.setTimeout(function clear() {
        contacts.init(function() {
          doClear(outRequest);
        },
        function() {
           initError(outRequest);
        });
      }, 0);

      return outRequest;
    };

    function doClear(outRequest) {
      datastore.clear().then(function success() {
        index = createIndex();
        // TODO:
        // This is working but there are open questions on the mailing list
        datastore.update(INDEX_ID, index).then(defaultSuccess(outRequest),
          function error(err) {
            window.console.error('Error while re-creating the index: ', err);
            outRequest.failed(err);
          }
        );
      }, defaultError(outRequest));
    }

    /**
     *  Persists the index on the datastore
     *
     */
    contacts.flush = function() {
      var outRequest = new fb.utils.Request();

      window.setTimeout(function do_Flush() {
        if (readyState !== 'initialized' || !isIndexDirty) {
          window.console.warn(
                      'The datastore has not been initialized or is not dirty');
          outRequest.done();
          return;
        }

        datastore.update(INDEX_ID, index).then(defaultSuccess(outRequest),
                                               defaultError(outRequest));
      }, 0);

      return outRequest;
    };

    /**
     *  Refreshes the index data
     *
     */
    contacts.refresh = function() {
      var outRequest = new fb.utils.Request();

       window.setTimeout(function clear() {
        contacts.init(function() {
          doRefresh(outRequest);
        },
        function() {
           initError(outRequest);
        });
      }, 0);

      return outRequest;
    };

    function doRefresh(outRequest) {
      if (isIndexDirty) {
        datastore.get(INDEX_ID).then(function success(obj) {
          setIndex(obj);
          outRequest.done();
        }, defaultError(outRequest));
      }
      else {
        outRequest.done();
      }
    }

    contacts.init = function(cb, errorCb) {
      if (readyState === 'initialized') {
        cb();
        return;
      }

      if (readyState === 'initializing') {
        document.addEventListener(INITIALIZE_EVENT, function oninitalized() {
          cb();
          document.removeEventListener(INITIALIZE_EVENT, oninitalized);
        });
        return;
      }

      readyState = 'initializing';

      navigator.getDataStores(DATASTORE_NAME).then(function success(ds) {
        if (ds.length < 1) {
          window.console.error('FB: Cannot get access to the DataStore');
           if (typeof errorCb === 'function') {
            errorCb();
          }
          return;
        }

        datastore = ds[0];
        // Checking the length as the index should be there
        datastore.getLength().then(function(length) {
          if (length === 0) {
            window.console.info('Adding index as length is 0');
            index = createIndex();
            return datastore.add(index);
          }
          else {
            return datastore.get(INDEX_ID);
          }
        }).then(function(v) {
          if (typeof v === 'object') {
            setIndex(v);
          }
          notifyOpenSuccess(cb);
        });
      }, function error() {
        window.console.error('FB: Error while opening the DataStore: ',
                                                        e.target.error.name);
        if (typeof errorCb === 'function') {
          errorCb();
        }
     });
    };
  })();
}
