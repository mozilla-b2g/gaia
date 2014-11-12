'use strict';

var listedFactory = function(list, entry) {
  return list.indexOf(entry) !== -1;
};

module.exports = {
  isWhitelisted: listedFactory,
  isBlacklisted: listedFactory,
  isDeviceHost: function() {
    return config.runnerHost === 'marionette-device-host';
  },
  merge: function(source, destination) {
    Object
      .keys(destination)
      .forEach(function(key) {
        source[key] = destination[key];
      });

    return source;
  },
  configure: function(config) {
    // If the any of the environment variables defined in the config file
    // have values set, override the config with them
    Object.keys(config.env).forEach(function(key) {
      var value = config.env[key];
      var envValue = process.env[value];

      if (envValue) {
        config[key] = envValue;
      }
    });

    return config;
  }
};
