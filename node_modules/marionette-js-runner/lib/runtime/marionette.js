var FilterData = require('./filterdata').FilterData;

/**
 * Internal method designed to attempt to find the metadata for this child
 * process based on the environment variable CHILD_METADATA.
 *
 * The environment variable is expected to be a base64 encoded string which can
 * be parsed as JSON.
 *
 *
 * @private
 * @return {Object}
 */
function findMetadata() {
  if (!process.env.CHILD_METADATA)
    return {};

  try {
    return JSON.parse(
      new Buffer(process.env.CHILD_METADATA, 'base64').toString()
    );
  } catch (e) {
    console.error('could not parse CHILD_METADATA');
    return {};
  }

  return result;
}

/**
 * If filter matches criteria against metadata object, suite is executed
 * with parameters, name and callback, respectively.
 *
 * @param {String} name of suite to execute.
 * @param {Object} filter Object to match against metadata.
 * @param {Function} callback fired in suite.
 */
function marionette(name, filter, callback) {
  // argument folding
  if (typeof filter === 'function') {
    callback = filter;
    filter = {};
  }

  // if marionette.metadata is falsy attempt to find it.
  if (!marionette.metadata)
    marionette.metadata = findMetadata();

  if (FilterData.validate(filter, marionette.metadata)) {
    suite(name, callback);
  }
}

module.exports.marionette = marionette;

/**
 * global state modifies for marionette
 *
 * @type {Object}
 */
marionette.metadata = findMetadata();
