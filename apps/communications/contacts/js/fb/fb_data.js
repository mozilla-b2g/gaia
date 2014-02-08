'use strict';

// WARNING: This file lazy loads:
// 'shared/js/fb/fb_data_reader.js
// 'shared/js/fb/fb_tel_index.js'
// 'shared/js/binary_search.js'
// 'shared/js/simple_phone_matcher.js' (will be removed once bug 938265 lands)

var fb = window.fb || {};

  (function() {
    var contacts = fb.contacts || {};
    fb.contacts = contacts;

    var Reader;
    var readerLoaded = false;

    // Record Id for the index
    var INDEX_ID = 1;
    var isIndexDirty = false;
    var READER_LOADED_EV = 'reader_loaded';

    var TEL_INDEXER_JS = '/shared/js/fb/fb_tel_index.js';
    var PHONE_MATCHER_JS = '/shared/js/simple_phone_matcher.js';
    var FB_READER_JS = '/shared/js/fb/fb_data_reader.js';
    var BINARY_SEARCH_JS = '/shared/js/binary_search.js';

    // This is needed for having proxy methods setted and ready before
    // the real reader methods (in fb_data_reader) are loaded
    if (!contacts.init) {
      var proxyMethods = ['get', 'getLength', 'getByPhone', 'search',
                          'refresh', 'init'];
      proxyMethods.forEach(function(aMethod) {
        contacts[aMethod] = defaultFunction.bind(null, aMethod);
      });
      LazyLoader.load(FB_READER_JS, onreaderLoaded);
    }
    else {
      onreaderLoaded();
    }

    function onreaderLoaded() {
      readerLoaded = true;
      Reader = fb.contacts;
      document.dispatchEvent(new CustomEvent(READER_LOADED_EV));
    }

    function setIndex(index) {
      Reader.dsIndex = index;
      isIndexDirty = false;
    }

    function datastore() {
      return Reader.datastore;
    }

    function index() {
      return Reader.dsIndex;
    }

    function defaultFunction(target) {
      var args = [];
      for (var j = 1; j < arguments.length; j++) {
        args.push(arguments[j]);
      }
      if (!readerLoaded) {
        document.addEventListener(READER_LOADED_EV, function rd_loaded() {
          document.removeEventListener(READER_LOADED_EV, rd_loaded);
          Reader[target].apply(this, args);
        });
      }
      else {
        // As the reader load will overwrite those functions probably this
        // will never be called
        Reader[target].apply(this, args);
      }
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

    function doSave(obj, outRequest) {
      LazyLoader.load([TEL_INDEXER_JS, PHONE_MATCHER_JS,
                       BINARY_SEARCH_JS] , function() {
        var uid = obj.uid;
        datastore().add(obj, uid).then(function success() {
          indexByPhone(obj, uid);
          isIndexDirty = true;
          outRequest.done();
        }, function error(err) {
            if (err.name === 'ConstraintError') {
              err = {
                name: contacts.ALREADY_EXISTS
              };
            }
            outRequest.failed(err);
        });
      });
    }

    function indexByPhone(obj, newId) {
      // Update index by tel
      // As this is populated by FB importer we don't need to have
      // extra checks
      if (Array.isArray(obj.tel)) {
        obj.tel.forEach(function(aTel) {
          var variants = SimplePhoneMatcher.generateVariants(aTel.value);

          variants.forEach(function(aVariant) {
            index().byTel[aVariant] = newId;
          });
          // To avoid the '+' char
          TelIndexer.index(index().treeTel, aTel.value.substring(1), newId);
        });
      }
    }

    function reIndexByPhone(oldObj, newObj, dsId) {
      removePhoneIndex(oldObj);
      indexByPhone(newObj, dsId);
      TelIndexer.orderTree(index().treeTel);
    }

    function removePhoneIndex(deletedFriend) {
      // Need to update the tel indexes
      if (Array.isArray(deletedFriend.tel)) {
        deletedFriend.tel.forEach(function(aTel) {
          TelIndexer.remove(index().treeTel, aTel.value.substring(1));

          var variants = SimplePhoneMatcher.generateVariants(aTel.value);
          variants.forEach(function(aVariant) {
            delete index().byTel[aVariant];
          });
        });
      }
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
      LazyLoader.load([TEL_INDEXER_JS, PHONE_MATCHER_JS,
                       BINARY_SEARCH_JS], function() {
        var uid = obj.uid;

        var successCb = successUpdate.bind(null, outRequest);
        var errorCb = errorUpdate.bind(null, outRequest, uid);

        // It is necessary to get the old object and delete old indexes
        datastore().get(uid).then(function success(oldObj) {
          if (!oldObj) {
            errorCb({
              name: contacts.UID_NOT_FOUND
            });
            return;
          }
          reIndexByPhone(oldObj, obj, uid);
          datastore().put(obj, uid).then(function success() {
            return datastore().put(index(), INDEX_ID);
          }, errorCb).then(successCb, errorCb);
        }, errorCb);   // datastore.get
      });
    }

    function successUpdate(outRequest) {
      outRequest.done();
    }

    function errorUpdate(outRequest, uid, error) {
      window.console.error('Error while updating datastore for: ', uid);
      outRequest.failed(error);
    }

    function doRemove(uid, outRequest, forceFlush) {
      LazyLoader.load([TEL_INDEXER_JS, PHONE_MATCHER_JS,
                       BINARY_SEARCH_JS], function() {
        var errorCb = errorRemove.bind(null, outRequest, uid);
        var objToDelete;

        datastore().get(uid).then(function success_get_remove(object) {
          objToDelete = object;
          if (!objToDelete) {
            errorRemove(outRequest, uid, {
              name: contacts.UID_NOT_FOUND
            });
            return;
          }
          datastore().remove(uid).then(function success_rm(removed) {
            successRemove(outRequest, objToDelete, forceFlush, removed);
          }, errorCb);
        }, errorCb);
      });  // LazyLoader.load
    }

    // Needs to update the index data conveniently
    function successRemove(outRequest, deletedFriend, forceFlush, removed) {
      if (removed === true) {
        isIndexDirty = true;

        removePhoneIndex(deletedFriend);
        if (forceFlush) {
          var flushReq = fb.contacts.flush();

          flushReq.onsuccess = function() {
            isIndexDirty = false;
            outRequest.done(true);
          };
          flushReq.onerror = function() {
            outRequest.failed(flushReq.error);
          };
        }
        else {
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
      datastore().clear().then(function success() {
        setIndex(null);
        // TODO:
        // This is working but there are open questions on the mailing list
        datastore().put(index(), INDEX_ID).then(defaultSuccess(outRequest),
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
        if (!(datastore()) || !isIndexDirty) {
          window.console.warn(
                      'The datastore has not been initialized or is not dirty');
          outRequest.done();
          return;
        }

        TelIndexer.orderTree(index().treeTel);
        datastore().put(index(), INDEX_ID).then(
                                              defaultSuccess(outRequest),
                                              defaultError(outRequest));
      }, 0);

      return outRequest;
    };

  })();
