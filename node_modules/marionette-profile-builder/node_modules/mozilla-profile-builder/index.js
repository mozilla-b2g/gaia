// we obvious always need to create a profile =p
var Profile = require('./lib/profile'),
    profileOption = require('./lib/options/profile');

/**
 * Profile generation is made up of calling out to many smaller
 * modules.. This primary module handles the glue and ordering
 * of how the smaller modules are invoked.
 */

/**
 * Object to module mappings. Individual modules may consume one or more options
 * but are only loaded when their primary option is invoked.
 */
var OPTIONS = {
  'apps': './lib/options/apps',
  'prefs': './lib/options/prefs',
  'settings': './lib/options/settings',
  'extracts': './lib/options/extracts'
};

/**
 * Creates a profile for use with a gecko product.
 *
 * Master copy of options is kept in the README.md.
 *
 * @param {Object} options (see docs README.md or individual option files).
 * @param {Function} callback [Error err, Profile profile].
 */
function create(options, callback) {
  options = options || {};

  // always create a profile first.
  profileOption(options, function(err, path) {
    if (err) return callback(err);

    // create the object representing the profile.
    var instance = new Profile(path);

    // next step is to build the chain of actions
    var pending;
    var actions = [];

    for (var key in options) {
      var module = OPTIONS[key];
      if (module) {
        actions.push(require(module));
      }
    }

    pending = actions.length;

    // abort async if we don't have any other steps
    if (pending === 0) {
      return process.nextTick(callback.bind(null, null, instance));
    }

    var lastErr = null;
    // executed when each action ends.
    function next(err) {
      // XXX: allow options to set properties on the profile object?

      // we don't fail on error but record the most recent one and pass it up.
      lastErr = err || lastErr;
      if (--pending === 0) {
        callback(lastErr, instance);
      }
    }

    var action;
    while (action = actions.shift()) {
      // every option function accepts a profile, the options and a callback
      action(path, options, next);
    }

  });
}

module.exports.create = create;
module.exports.Profile = Profile;
