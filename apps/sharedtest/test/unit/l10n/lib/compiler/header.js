/* global window, navigator, process, exports, assert:true */
/* exported assert, compile */

'use strict';

var assert = require('assert') || window.assert;
var PropertiesParser;

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
  PropertiesParser = L10n.PropertiesParser;
} else {
  var L10n = {
    compile: process.env.L20N_COV ?
      require('../../../build/cov/lib/l20n/compiler').compile :
      require('../../../lib/l20n/compiler').compile,
    getPluralRule: require('../../../lib/l20n/plurals').getPluralRule
  };

  PropertiesParser = process.env.L20N_COV ?
    require('../../../build/cov/lib/l20n/parser').PropertiesParser
    : require('../../../lib/l20n/format/properties/parser').PropertiesParser;
}

var propertiesParser = new PropertiesParser();

function compile(source) {
  var ast = propertiesParser.parse(null, source);
  var env = L10n.compile(null, ast);
  env.__plural = L10n.getPluralRule('en-US');
  return env;
}

exports.assert = assert;
exports.compile = compile;
