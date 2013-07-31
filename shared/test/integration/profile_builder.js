/**
 * Profile builder hookup for gaia.
 */

/**
 * super reference (similar to how util.inherit works) but I still prefer
 * __proto__.
 *
 * @type {Object}
 * @private
 */
var super_ = require('marionette-profile-builder');

// utils
var debug = require('debug')('gaia-profile-builder');
var exec = require('child_process').exec;
var fs = require('fs');
var fsPath = require('path');

// we need to know where to invoke the Makefile
var GAIA_ROOT = fsPath.resolve(__dirname, '..', '..', '..');

// custom profile folder for tests... We use this as a baseProfile option in
// marionette-profile-builder so while we use these files we never directly
// launch this profile (its in a clean state).
var PROFILE_FOLDER = 'profile-test';

/**
 * Invoke a gaia makefile command.
 *
 *    make({
 *      // makefile envs
 *      env: {
 *        DEBUG: 1
 *      },
 *
 *      // optional
 *      target: 'profile'
 *    })
 *
 *
 * @private
 * @param {Object} options for make command.
 * @param {Function} callback (passed to child_process.exec).
 */
function make(options, callback) {
  options = options || {};
  // we always need to invoke with env so DEBUG=* works.
  options.env = options.env || {};

  // build out the make command
  var command = 'make -C ' + GAIA_ROOT;

  // optional target
  if (options.target) {
    command += ' ' + options.target;
  }

  debug('make', command, options);
  exec(command, { env: options.env }, callback);
}

/**
 * Custom gaia profile builder which extends the default marionette builder
 * behaviours.
 *
 * @constructor
 * @param {Object} options for gaia builder.
 */
function GaiaBuilder(options) {
  super_.apply(this, arguments);
}

GaiaBuilder.prototype = {
  __proto__: super_.prototype,

  /**
   * When profile has already built this will be true and the make step will be
   * skipped.
   *
   * @type {Boolean}
   */
  hasProfile: false,

  /**
   * Generate the gaia profile if it does not exist.
   *
   * @param {Object} overrides for the profile builder.
   * @param {Function} callback [null, String profile].
   */
  build: function(overrides, callback) {
    overrides = overrides || {};

    var env = { 'PROFILE_FOLDER': PROFILE_FOLDER };
    var profile = fsPath.join(GAIA_ROOT, PROFILE_FOLDER);

    // set the base profile to the newly minted profile build.
    overrides.profile = ['baseProfile', profile];

    this.hasProfile = this.hasProfile || fs.existsSync(profile);

    // if profile is build continue.
    if (this.hasProfile) {
      // invoke the superclass which handles the boilerplate
      super_.prototype.build.call(this, overrides, callback);
      return;
    }

    // TODO: in the future we can expose build time options
    //       (like customizations)
    make({ env: env }, function(err) {
      if (err) {
        // do an epic fail because gaia tests won't run without
        // this working successfully.
        throw err;
      }
      super_.prototype.build.call(this, overrides, callback);
    }.bind(this));
  }

  // XXX: we might need some destroy step in the future?
};

// marionette-mocha expects a single top level class to be the module
module.exports = GaiaBuilder;
