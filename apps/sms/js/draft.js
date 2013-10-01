/** Creates an Draft object
 * @param {String} draft key.
 * @param {Object} It's the draft content.
 * @return {Draft} new draft object.
 */

'use strict';

(function(exports) {

  function Draft(draft) {
    this.key = draft.key;
    this.content = draft.content;
    this.recipients = draft.recipients || null;
    this.timestamp = new Date().getTime();
  }

  Draft.prototype = {

    save: function dr_save(onsuccess) {
      asyncStorage.setItem(this.key, this, onsuccess);
    },

    delete: function dr_delete(callback) {
      asyncStorage.removeItem(this.key, callback);
    }

  };

  Draft.load = function dr_load(key, callback) {
    asyncStorage.getItem(key, function(value) {
      if (value) {
        callback(value);
      } else {
        callback(null);
      }
    });
  };

  exports.Draft = Draft;
}(this));
