/**
Shared helpers for handling options across channels

@param {Object} options for release
@param {String} options.os for firefox release.
@param {String} [options.product='firefox']
@param {String} [options.version="latest"] for release
@param {String} [options.language="en-US"] for firefox release.
*/
function options(options) {
  var defaults = {
    product: 'firefox',
    branch: 'latest',
    language: 'en-US',
    channel: 'release'
  };

  if (!options) throw new Error('must pass options');
  if (!options.os) throw new Error('must pass os');

  for (var key in options) defaults[key] = options[key];

  return defaults;
}

module.exports = options;
