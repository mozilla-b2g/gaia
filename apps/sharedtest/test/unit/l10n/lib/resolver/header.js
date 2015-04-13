/* global navigator, exports */
/* exported Resolver */

'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
  var Resolver = L10n.Resolver;
} else {
  var L10n = {
    PropertiesParser:
      require('../../../src/lib/format/properties/parser'),
    Resolver: require('../../../src/lib/resolver'),
    getPluralRule: require('../../../src/lib/plurals').getPluralRule
  };

  exports.createEntries = createEntries;
  exports.Resolver = L10n.Resolver;
}


function createEntries(source) {
  /* jshint -W089 */
  var entries = Object.create(null);
  var ast = L10n.PropertiesParser.parse(null, source);

  for (var i = 0, len = ast.length; i < len; i++) {
    entries[ast[i].$i] = L10n.Resolver.createEntry(ast[i], entries);
  }

  entries.__plural = L10n.getPluralRule('en-US');
  return entries;
}
