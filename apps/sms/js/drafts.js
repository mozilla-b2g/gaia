/*global asyncStorage, Utils, isEqual */
(function(exports) {
  'use strict';
  var draftIndex = new Map();
  var isCached = false;

  /**
   * Checks if two drafts are distinct based on
   * the equality of the following fields:
   *
   * recipients
   * content
   * subject
   *
   * @param {Draft} a draft to check
   * @param {Draft} b draft to check
   *
   * @return {Boolean} true if the drafts differ on those fields
   */
  function isDistinct(a, b) {
    if (!a || !b) {
      // if either or both are falsey
      return true;
    } else {
      // if any recipient doesn't match
      if (a.recipients.length !== b.recipients.length) {
        return true;
      } else {
        for (var i = 0; i < a.recipients.length; i++) {
          if (!Utils.probablyMatches(a.recipients[i], b.recipients[i])) {
            return true;
          }
        }
      }
      // else check whether content or subject match
      return !isEqual(a.content, b.content) ||
        a.subject !== b.subject;
    }
  }

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
      var canSkipDistinction = false;

      if (draft) {
        if (!(draft instanceof Draft)) {
          draft = new Draft(draft);
        }

        threadId = draft.threadId || null;
        thread = draftIndex.get(threadId) || [];
        stored = thread[thread.length - 1];

        // If there is an existing draft for this
        // threadId, delete it.
        if (threadId !== null && thread.length) {
          this.delete(stored);
          canSkipDistinction = true;
        }

        // If the new draft is distinct from the stored one
        // then push and save a new draft
        if (canSkipDistinction || isDistinct(stored, draft)) {
          thread.push(draft);
          draftIndex.set(threadId, thread);
          this.store();
        }
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
        index = thread.indexOf(draft);

        if (index === -1) {
          if (thread && typeof draft.id === 'undefined') {
            thread.length = 0;
          } else {
            thread.forEach(function(stored, i) {
              if (stored.id === draft.id) {
                index = i;
              }
            });
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
     * @param  {Number}  id thread id of the drafts to return.
     *
     * @return {Draft.List}  return Draft.List containing drafts for thread id
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
     * @return {Draft}  Draft object.
     */
    get: function(id) {
      var draft;

      draftIndex.forEach(function(records, threadId) {
        if (!draft) {
          draft = records.find(function(record) {
            // Ensure a number is used for the comparison,
            // as this value may come from a dataset property.
            // Curse the day that state was stored in the DOM.
            return record.id === +id;
          });
        }
      });

      return draft;
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
     * load
     *
     * Load draftIndex from potentially empty local storage.
     *
     * @param {Function} callback If a callback is provided, invoke
     *                            with list of threadless drafts as
     *                            arguments.
     * @return {Undefined} void return.
     */
    load: function(callback) {
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
        return;
      } else {
        asyncStorage.getItem('draft index', function(records) {

          // Revive as Draft objects by constructing new Draft from
          // each plain object returned from storage.
          if (records !== null) {
            records = records.map(function(record) {
              // record[0] is the threadId or null key
              // record[1] is the array of draft objects associated
              //            with that threadId or null key
              //
              // Replace each plain object in record[1] with a
              // real draft object.
              //
              // Once ES6 syntax is allowed,
              // replace the map operations below with the following line:
              // record[1].map(draft => new Draft(draft));
              //
              //
              record[1] = record[1].map(function(draft) {
                return new Draft(draft);
              });
              return record;
            });
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
     *
     * @return {Undefined} void return.
     */
    forEach: function(callback) {
      var drafts = priv.get(this);
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
   * @param {Object}  draft  Draft or empty object
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
    this.timestamp = draft.timestamp || Date.now();
    this.threadId = draft.threadId || null;
    this.type = draft.type;
  }

  function guid() {
    return +(Date.now() + '' + (Math.random() * 1000 | 0));
  }

  exports.Draft = Draft;
}(this));
