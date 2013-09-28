/** Creates an Draft object
 * @param {String} draft key.
 * @param {Object} It's the draft content.
 * @return {Draft} new draft object.
 */

(function(exports) {

  function Draft(draftKey, content, recipient) {
    this.key = draftKey;
    this.content = content;
  }

  Draft.prototype = {

    save: function dr_save(onsuccess) {
      asyncStorage.setItem(this.key, this.content, onsuccess);
    },

    delete: function dr_delete(callback) {
      asyncStorage.removeItem(this.key, callback);
    }

  };

  Draft.load = function dr_load(draftKey, callback) {
    asyncStorage.getItem(draftKey, function(value) {
      if (value) {
        callback(new Draft(draftKey, value));
      } else {
        callback(null);
      }
    });
  };

  exports.Draft = Draft;
}(this));
