/** Creates an Draft object
 * @param {String} draft id.
 * @param {Object} It's the draft content.
 * @return {Draft} new draft object.
 */

(function(exports) {

  function Draft(draftID, content) {
    this.id = draftID;
    this.content = content;
  }

  Draft.prototype = {

  };

  exports.Draft = Draft;
}(this));
