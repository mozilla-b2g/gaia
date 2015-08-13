/*global asyncStorage,
         InterInstanceEventDispatcher,
         Utils,
         EventDispatcher
*/
(function(exports) {
  'use strict';

  [
    ['asyncStorage', '/shared/js/async_storage.js'],
    ['EventDispatcher', '/shared/js/event_dispatcher.js'],
    ['Utils', '/views/shared/js/utils.js']
  ].forEach(([dependencyName, dependencyPath]) => {
    if (!(dependencyName in self)) {
      importScripts(dependencyPath);
    }
  });

  var draftIndex = new Map();
  var deferredDraftRequest = null;

  /**
   * Drafts
   *
   * A collection of active Draft objects, indexed by thread id.
   */
  var Drafts = {
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
     * Pushes a Draft instance to the Drafts in-memory collection and commits
     * it to the persistent storage.
     * @param  {Draft} draft Draft instance.
     * @returns {Drafts} Returns the Drafts object.
     */
    add: function(draft) {
      if (!draft || !(draft instanceof Draft)) {
        throw new Error('Draft should be valid Draft instance.');
      }

      // Remove existing draft.
      this.delete(draft);

      var drafts = draftIndex.get(draft.threadId) || [];
      drafts.push(draft);
      draftIndex.set(draft.threadId, drafts);

      this.emit('saved', draft);

      return this;
    },

    /**
     * Deletes a draft record from Drafts in-memory collection.
     * @param  {Draft} draft Draft instance to delete.
     * @returns {Drafts} Returns the Drafts object.
     */
    delete: function(draft) {
      if (!draft || !(draft instanceof Draft)) {
        throw new Error('Draft should be valid Draft instance.');
      }

      var drafts = draftIndex.get(draft.threadId);
      if (!drafts || !drafts.length) {
        return this;
      }

      // Flag to track that draft was really removed.
      var isDeleted = false;

      // For drafts bound to thread we should remove all drafts we have, but for
      // thread-less drafts we should remove draft with the same id only.
      if (draft.threadId) {
        drafts.length = 0;
        isDeleted = true;
      } else {
        var indexToRemove = drafts.findIndex(
          (storedDraft) => storedDraft.id === draft.id
        );

        if (indexToRemove > -1) {
          isDeleted = true;
          drafts.splice(indexToRemove, 1);
        }
      }

      isDeleted && this.emit('deleted', draft);

      return this;
    },

    /**
     * Returns draft for the specified thread id or null if it doesn't exist.
     * @param {Number} threadId Thread id to recall draft for.
     * @returns {Draft}
     */
    byThreadId: function(threadId) {
      if (!threadId) {
        throw new Error('Thread Id is not defined');
      }

      var threadDrafts = draftIndex.get(threadId);
      return threadDrafts && threadDrafts.length ?
        threadDrafts[threadDrafts.length - 1] : null;
    },

    /**
     * Returns the draft object with the specified id.
     * @param {Number|String} id Id of the draft to return.
     * @returns {Draft} Found draft instance or null if nothing is found.
     */
    byDraftId: function(id) {
      // Ensure a number is used for the comparison, as this value may come from
      // a dataset property.
      id = +id;

      for (var draft of this.getAllThreadless()) {
        if (draft.id === id) {
          return draft;
        }
      }

      return null;
    },

    /**
     * Returns iterator for all available drafts. For the drafts associated with
     * the thread, only the latest draft is returned.
     */
    getAll: function* () {
      for (var [threadId, drafts] of draftIndex) {
        // For drafts with associated thread we consider only the latest draft.
        yield* threadId ? drafts.slice(-1) : drafts;
      }
    },

    /**
     * Returns list of all thread less drafts.
     * @returns {Array.<Draft>}
     */
    getAllThreadless: function () {
      return draftIndex.get(null) || [];
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
      deferredDraftRequest = null;
      return this;
    },

    /**
     * Stores drafts that are held in memory to local storage.
     */
    store: function() {
      var defer = Utils.Promise.defer();

      asyncStorage.setItem('draft index', [...draftIndex], () => {
        InterInstanceEventDispatcher.emit('drafts-changed');
        defer.resolve();
      });

      return defer.promise;
    },

    /**
     * Requests drafts from asyncStorage or in-memory cache. Result is cached.
     * @param {boolean?} force Indicates whether we should respect already
     * cached result or _force_ asyncStorage request once again.
     * @returns {Promise} Promise that resolves when all drafts are retrieved
     * from persistent storage.
     */
    request: function(force) {
      // Loading from storage only happens once or when specifically requested
      // with force parameter.
      if (deferredDraftRequest && !force) {
        return deferredDraftRequest.promise;
      }

      deferredDraftRequest = Utils.Promise.defer();

      asyncStorage.getItem('draft index', function (records) {
        // Convert every plain JS draft object into Draft "class" instance.
        // record[0] is the threadId or null key, record[1] is the array of
        // draft objects associated with that threadId or null key.
        records && records.forEach((record) => {
          record[1] = record[1].map((draft) => new Draft(draft));
        });
        draftIndex = new Map(records || []);

        deferredDraftRequest.resolve();
      });

      return deferredDraftRequest.promise;
    }
  };

  exports.Drafts = EventDispatcher.mixin(Drafts, ['saved', 'deleted']);

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
