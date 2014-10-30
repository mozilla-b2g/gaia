var CreateProfile = require('../createprofile');

/**
 * Wrapper around createprofile mostly here for api consistency.
 *
 * Note the "profile" argument is missing (because we supply it here)
 *
 * @param {Object} options for generation.
 * @param {Function} callback [Error err, Profile profile].
 */
function profile(options, callback) {
  var value = options.profile;

  if (!value)
    return CreateProfile.tmp(callback);

  if (typeof value === 'string') {
    return CreateProfile.profile(value, callback);
  }

  if (Array.isArray(value)) {
    var type = value[0],
        value = value[1];

    if (!(type in CreateProfile))
      throw new Error('invalid profile type: "' + type + '"');

    return CreateProfile[type](value, callback);
  }

  throw new Error(
    'invalid .profile option. Omit the value (tmp), pass a string or an array'
  );
}

module.exports = profile;
