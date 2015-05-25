'use strict';
var mozprofile = require('mozilla-profile-builder'),
    debug = require('debug')('marionette-profile-builder');

/**
 * Merge two objects and their properties (when objects)
 *
 *    mergeOptions({ prefs: { locked: true } }, { prefs: { debug: true } });
 *
 *    // { prefs: { locked: true, debug: true } }
 *
 * @private
 * @param {Object} a first object to merge.
 * @param {Object} b second object to merge.
 * @return {Object} merged objects.
 */
function mergeOptions(a, b) {
  // so we don't mutate the original state of either object
  var result = {};

  // "a" is merged first
  for (var key in a) {
    result[key] = a[key];
  }

  // "b" is then merged
  for (key in b) {
    // when both a and b have a property that is an object do a merge
    // of those properties rather then an override.
    if (typeof a[key] === 'object' && typeof b[key] === 'object') {
      result[key] = mergeOptions(a[key], b[key]);
      continue;
    }

    // otherwise simply override a's property with b's property
    result[key] = b[key];
  }

  return result;
}

/**
 * Default profile builder API.
 *
 * @param {Function} options for profile builder.
 *  options are directly passed to mozilla-profile-builder's .create method.
 */
function ProfileBuilder(options) {
  options = options || {};

  // copy options into local object so we don't mutate the given object.
  this.options = {};
  for (var key in options) {
    this.options[key] = options[key];
  }
}

ProfileBuilder.prototype = {
  /**
   * Profile instance class.
   *
   * @type {mozilla-profile-builder/profile}.
   */
  profile: null,

  /**
   * Build the initial version of the profile.
   *
   * @param {Object} overrides to default build options.
   * @param {Function} callback [Error err, Profile].
   */
  build: function(overrides, callback) {
    // merge options from the defaults and the overrides for this run.
    var options = mergeOptions(this.options, overrides || {});

    debug('build', options);

    mozprofile.create(options, function(err, profile) {
      if (err) return callback(err);

      // we keep a local copy of profile on this instance.
      this.profile = profile;

      // to limit the api surface we only expose the path to the profile.
      callback(null, profile.path);
    }.bind(this));
  },

  /**
   * Destroy the profile.
   *
   * @param {Function} callback [Error err].
   */
  destroy: function(callback) {
    debug('destroy');

    // skip if build has not been called.
    if (!this.profile)
      return process.nextTick(callback);

    this.profile.destroy(function(err) {
      var path = this.profile.path;

      this.profile = null;
      callback(err, path);
    }.bind(this));
  }
};

module.exports = ProfileBuilder;
