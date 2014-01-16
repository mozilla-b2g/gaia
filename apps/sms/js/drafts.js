/*global asyncStorage */
(function(exports) {
  'use strict';
  var draftIndex = new Map();
  var isCached = false;

  /**
   * Drafts
   *
   * A collection of active Draft objects, indexed by thread id.
   */
  var Drafts = exports.Drafts = {
    /**
     * List
     *
     * An Array-like object that contains Draft objects.
     */
    List: DraftList,
    /**
     * size
     *
     * Returns the number of Draft Lists.
     *
     * There is one Draft.List per Thread and
     * one Draft.List for all threadless Drafts.
     *
     * @return {Number} Maps to draftIndex size property.
     */
    get size() {
      return draftIndex.size;
    },
    /**
     * add
     *
     * Push a Draft object or an object that has
     * all the properties of a Draft instance
     * to the Drafts collection. If the object
     * isn't an instance of Draft, initialize
     * a new Draft.
     *
     * @param  {Object}  draft  Draft-like object.
     *
     * @return {Drafts} return the Drafts object.
     */
    add: function(draft) {
      var threadId;
      var thread;
      var stored;

      if (draft) {
        if (!(draft instanceof Draft)) {
          draft = new Draft(draft);
        }

        threadId = draft.threadId || null;
        thread = draftIndex.get(threadId) || [];
        stored = thread[thread.length - 1];

        // If there is an existing draft for this
        // threadId, delete it.
        // This should be replaced by a general
        // replacement method.
        if (threadId !== null && thread.length) {
          this.delete(stored);
        }

        // If there is an existing threadless draft
        // with the same id, delete it.
        // This should be replaced by a general
        // replacement method.
        if (threadId === null && thread.length) {
          thread.some(function(d, i) {
            if (d.id === draft.id) {
              this.delete(d);
              stored = null;
              return true;
            }
          }, this);
        }

        thread.push(draft);
        draftIndex.set(threadId, thread);
        this.store();
      }
      return this;
    },
    /**
     * delete
     *
     * Delete a draft record from the collection.
     *
     * @param  {Draft} draft draft to delete.
     *
     * @return {Drafts} return the Drafts object.
     */
    delete: function(draft) {
      var thread;
      var index;

      if (draft) {
        thread = draftIndex.get(draft.threadId);
        if (!thread) {
          return this;
        }
        index = thread.indexOf(draft);

        // For cases where the provided "draft" object
        // could not be found by object _identity_:
        //  - If a thread was found by draft.threadId, but
        //    draft had no id property, delete all drafts
        //    for this threadId
        //  - Otherwise, the draft object might be a copy,
        //    or manually composed "draft object", so iterate
        //    the drafts and look for the one matching the
        //    provided draft.id.
        if (index === -1) {
          if (thread && typeof draft.id === 'undefined') {
            thread.length = 0;
          } else {
            if (thread) {
              thread.some(function(stored, i) {
                if (stored.id === draft.id) {
                  index = i;
                  return true;
                }
              });
            }
          }
        }

        if (index > -1) {
          thread.splice(index, 1);
        }
      }
      return this;
    },
    /**
     * byThreadId
     *
     * Returns all the drafts for the specified thread id.
     *
     * Calling with `null` will return a `Draft.List` object
     * containing all of the threadless draft objects.
     *
     * eg.
     *
     *   Drafts.byThreadId(null)
     *
     *
     *
     * @param  {Number}  id thread id of the drafts to return.
     *
     * @return {Draft.List}  return Draft.List containing drafts for thread id.
     */
    byThreadId: function(id) {
      return new Drafts.List(draftIndex.get(id));
    },
    /**
     * get
     *
     * Return the draft object with the specified id.
     *
     * @param  {Number}  id thread id of the drafts to return.
     *
     * @return {Draft}  Draft object or undefined.
     */
    get: function(id) {
      var draft;

      draftIndex.forEach(function(records, threadId) {
        if (!draft) {
          draft = records.find(function(record) {
            // Ensure a number is used for the comparison,
            // as this value may come from a dataset property.
            return record.id === +id;
          });
        }
      });

      return draft;
    },
    /**
     * forEach
     *
     * Call the callback on each draft in the
     * draft index (the latest draft for a valid
     * threadId and all the drafts for a null
     * threadId).
     *
     * @return {Undefined}
     */
    forEach: function(callback, thisArg) {
      if (thisArg) {
        callback = callback.bind(thisArg);
      }
      draftIndex.forEach(function(drafts, threadId) {
        if (threadId) {
          var latest = drafts[drafts.length - 1];
          callback(latest, threadId);
        } else {
          // All the null threadId drafts are
          // valid thread-less drafts
          drafts.forEach(function(draft) {
            callback(draft, null);
          });
        }
      });
    },
    /**
     * clear
     *
     * Delete drafts from the map.
     *
     * @return {Drafts} return the Drafts object.
     */
    clear: function() {
      draftIndex = new Map();
      isCached = false;
      return this;
    },
    /**
     * store
     *
     * Store draftIndex held in memory to local storage
     *
     * @return {Undefined} void return.
     */
    store: function() {
      // Once ES6 syntax is allowed,
      // replace the forEach operations below with the following line:
      // asyncStorage.setItem('draft index', [...draftIndex]);
      var entries = [];
      draftIndex.forEach(function(v, k) {
        entries.push([k, v]);
      });
      asyncStorage.setItem('draft index', entries);
    },
    /**
     * request
     *
     * Request drafts from asyncStorage or in-memory cache.
     *
     * @param {Function} callback If a callback is provided, invoke
     *                            with list of threadless drafts as
     *                            arguments.
     * @return {Undefined} void return.
     */
    request: function(callback) {
      function handler() {
        isCached = true;

        if (typeof callback === 'function') {
          // When a callback is provided, call it with
          // a draft list of threadless drafts
          callback(Drafts.byThreadId(null));
        }
      }

      // Loading from storage only happens when the
      // app first opens.
      if (isCached) {
        setTimeout(function() {
          handler();
        });
      } else {
        asyncStorage.getItem('draft index', function(records) {
          var rlength, drafts, dlength;

          // Revive as Draft objects by constructing new Draft from
          // each plain object returned from storage.
          if (records !== null) {
            /*
              record[0] is the threadId or null key
              record[1] is the array of draft objects associated
                         with that threadId or null key

              Replace each plain object in record[1] with a
              real draft object.
            */
            rlength = records.length;

            for (var i = 0; i < rlength; i++) {
              drafts = records[i][1];
              dlength = drafts.length;

              for (var j = 0; j < dlength; j++) {
                drafts[j] = new Draft(drafts[j]);
              }
            }
          }
          draftIndex = new Map(records || []);

          handler();
        });
      }
    }
  };

  /**
   * DraftList
   *
   * An Array-like object containing Draft objects.
   *
   * @param  {Array}  initializer  array containing Draft objects.
   *
   * @return {Undefined} void return.
   */
  var priv = new WeakMap();
  function DraftList(initializer) {
    priv.set(this, initializer || []);
  }

  DraftList.prototype = {
    /**
     * length
     *
     * A readonly accessor that returns the number of drafts.
     *
     * @return {Number} return the length of the drafts list.
     */
    get length() {
      return priv.get(this).length;
    },
    /**
     * latest
     *
     * The latest draft for this Drafts.List
     */
    get latest() {
      var list = priv.get(this);
      return list.length ? list[list.length - 1] : null;
    },
    /**
     * forEach
     *
     * Iterate over the list of Draft objects
     * and call callback on each.
     *
     * @param  {Function} callback to call on each draft.
     * @param  {Object} thisArg set callback's this.
     *
     * @return {Undefined} void return.
     */
    forEach: function(callback, thisArg) {
      var drafts = priv.get(this);

      if (thisArg) {
        callback = callback.bind(thisArg);
      }

      for (var i = 0; i < drafts.length; i++) {
        callback(drafts[i]);
      }
    }
  };

  /**
   * Draft
   *
   * A message-like object containing unsent
   * message content to be stored temporarily
   * in a Drafts collection.
   *
   * @param {Object}  draft  Draft or empty object.
   */
  function Draft(opts) {
    var draft = opts || {};

    if (draft.id && typeof draft.id !== 'number') {
      throw new Error('Draft id must be a number');
    }

    this.id = draft.id || guid();
    this.recipients = draft.recipients || [];
    this.content = draft.content || [];
    this.subject = draft.subject || '';
    this.timestamp = +draft.timestamp || Date.now();
    this.threadId = draft.threadId || null;
    this.type = draft.type;
    this.isEdited = false;
  }

  function guid() {
    return +(Date.now() + '' + (Math.random() * 1000 | 0));
  }

  exports.Draft = Draft;
}(this));
