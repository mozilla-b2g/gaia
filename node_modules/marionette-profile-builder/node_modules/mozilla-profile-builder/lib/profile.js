var remove = require('remove');

/**
 * Internal profile class.
 *
 * @param {String} directory where profile lives.
 * @constructor
 */
function Profile(path) {
  this.path = path;
}

Profile.prototype = {
  /**
   * Directory where profile lives.
   *
   * @type {String}
   */
  path: null,

  /**
   * Purges userdata from the profile
   *
   * @param {Function} callback [Error err].
   *
   */
  reset: function(callback) {
    throw new Error('not implemented yet');
  },

  /**
   * Delete entire profile
   *
   * @param {Function} callback [Error err].
   */
  destroy: function(callback) {
    remove(this.path, callback);
  }
};

module.exports = Profile;
