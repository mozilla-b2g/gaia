var Host = require('./host').Host,
    Logger = require('marionette-js-logger'),
    Marionette = require('marionette-client'),
    debug = require('debug')('marionette-js-runner:runtime/hostmanager');


/**
 * @constructor
 */
function HostManager() {
  this.plugins = [];
}


HostManager.prototype = {
  /**
   * Adds a plugin to the stack of plugins.
   *
   * @param {String} name of plugin.
   * @param {Function} plugin function to invoke.
   * @param {Object} options for plugin.
   */
  addPlugin: function(name, plugin, options) {
    var plugins = this.plugins;
    suiteSetup(function() {
      plugins.push({ plugin: plugin, name: name, options: options });
    });

    suiteTeardown(function() {
      plugins.pop();
    });
  },

  /**
   * Setup a host inside of the current execution context.
   *
   * @param {Object} profile settings for host.
   * @param {Object} driver for marionette.
   * @return {Marionette.Client} instance of a client.
   */
  createHost: function(profile, driver) {
    profile = profile || {};
    driver = driver || Marionette.Drivers.TcpSync;

    debug('create host', profile);

    // so we don't run the setup blocks multiple times.
    var client = new Marionette.Client(null, { lazy: true });
    var host;
    var plugins = this.plugins;

    // create the host
    suiteSetup(function(done) {
      Host.create(profile, function(err, instance) {
        host = instance;
        done(err);
      });
    });

    setup(function(done) {
      // build object with all plugins
      var pluginReferences = {};
      plugins.forEach(function(plugin) {
        pluginReferences[plugin.name] = {
          plugin: plugin.plugin,
          options: plugin.options
        };
      });

      var driverInstance = new driver({
        port: host.port,
        // XXX: make configurable
        connectionTimeout: 10000
      });

      driverInstance.connect(function(err) {
        if (err) {
          done(err);
          return;
        }
        client.resetWithDriver(driverInstance);

        for (var name in pluginReferences) {
          debug('add plugin', name);
          // remove old plugin reference
          delete client[name];

          // setup new plugin
          client.plugin(
            name,
            pluginReferences[name].plugin,
            pluginReferences[name].options
          );
        }

        client.startSession(done);
      });
    });

    // turn off the client
    teardown(function(done) {
      client.deleteSession(done);
    });

    // restart between tests
    teardown(function(done) {
      host.restart(profile, done);
    });

    // stop when complete
    suiteTeardown(function(done) {
      host.stop(done);
    });

    return client;
  }

};

// expose host manager.
module.exports.HostManager = HostManager;
