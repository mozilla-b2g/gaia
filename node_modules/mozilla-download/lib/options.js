function options(options) {
  var defaults = { product: 'firefox' };
  for (var key in options) defaults[key] = options[key];

  if (!defaults.os) {
    defaults.os = require('./detectos')(options.product);
  }

  return defaults;
}

module.exports = options;
