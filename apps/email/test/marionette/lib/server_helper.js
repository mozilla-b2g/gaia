/**
 * Primary interface to expose server details to tests. Internally abstracts the
 * details of what kind of server (aside from general protocol) so we can also
 * use fake servers.
 */


/**
 * Example interface for server setup.
 *
 *    var object = require('exported_module').use(options, this);
 *
 *    // object is expected to have one or more top level server types exposed.
 *
 *    // example imap interface
 *    object.imap.port
 *    object.imap.username
 *    object.imap.hostname
 *    object.imap.password
 *
 *    // example imap interface
 *    object.smtp.port
 *    object.smtp.username
 *    object.smtp.hostname
 *    object.smtp.password
 *
 *    While the "port" may be optional (you might need a url instead)
 *    username/password should always be included.
 *
 */
//function serverSetup(options) {};

/**
 * Expose a server lifecycle to a given test.
 *
 *    marionette('xfoo', function() {
 *      require('./lib/server_helper').use({}, this);
 *    });
 *
 * @param {Object} options for server.
 * @param {Object} mochaContext
 *   (usually the |this| of a marionette/suite block).
 */
function determineServer(options, mochaContext) {
  // XXX: right now this is hardcoded to the fake imap server logic.
  return require('./servers/fakeimap').use(options, mochaContext);
}

module.exports.use = determineServer;
