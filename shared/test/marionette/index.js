/**
 * To avoid needing to expose some weird constants we symlink this directory
 * into node_modules and this is the top level export for all shared gaia
 * marionette helper code.
 */

module.exports.requireFromApp = require('./lib/require_from_app');
