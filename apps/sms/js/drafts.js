/*global asyncStorage, Utils, isEqual */
(function(exports) {
  'use strict';
  var draftIndex = new Map();

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
      // if either or both are null
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
      var id;
      var thread;
      var stored;

      if (draft) {
        if (!(draft instanceof Draft)) {
          draft = new Draft(draft);
        }
        id = draft.threadId || null;
        thread = draftIndex.get(id) || [];
        stored = thread[thread.length > 1 ? thread.length - 1 : 0];

        // If the new draft is distinct from the stored one
        // then push and save a new draft
        if (isDistinct(stored, draft)) {
          thread.push(draft);
          draftIndex.set(id, thread);
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
      var id;
      var index;
      var thread;
      if (draft) {
        id = draft.threadId || null;
        thread = draftIndex.get(id);
        index = thread.indexOf(draft);
        if (index > -1) {
          thread.splice(index, 1);
        }
      }
      return this;
    },
    /**
     * byId
     *
     * Returns all the drafts for the specified thread id.
     *
     * @param  {Number}  id thread id of the drafts to return.
     *
     * @return {Draft.List}  return Draft.List containing drafts for thread id
     */
    byId: function(id) {
      return new Drafts.List(draftIndex.get(id));
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
      // replace the operations below with the following line:
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
     * Load draftIndex from potentially empty local storage
     *
     * @return {Undefined} void return.
     */
    load: function() {
      asyncStorage.getItem('draft index', function(value) {
        draftIndex = new Map(value || []);
      });
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
    this.recipients = draft.recipients || [];
    this.content = draft.content || [];
    this.subject = draft.subject || '';
    this.timestamp = draft.timestamp || Date.now();
    this.threadId = draft.threadId || null;
    this.type = draft.type;
  }

  exports.Draft = Draft;

}(this));
