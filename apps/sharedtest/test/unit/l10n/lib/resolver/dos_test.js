/* global assert:true, it, beforeEach, describe, requireApp */
/* jshint -W101 */
'use strict';

if (typeof navigator !== 'undefined') {
  requireApp('sharedtest/test/unit/l10n/lib/resolver/header.js');
} else {
  var assert = require('assert');
  var Resolver = require('./header.js').Resolver;
  var createEntries = require('./header.js').createEntries;
}

// Bug 803931 - Compiler is vulnerable to the billion laughs attack

describe('Billion Laughs', function(){
  var entries;

  beforeEach(function() {
    var source = [
      'lol0=LOL',
      'lol1={{lol0}} {{lol0}} {{lol0}} {{lol0}} {{lol0}} {{lol0}} {{lol0}} {{lol0}} {{lol0}} {{lol0}}',
      'lol2={{lol1}} {{lol1}} {{lol1}} {{lol1}} {{lol1}} {{lol1}} {{lol1}} {{lol1}} {{lol1}} {{lol1}}',
      'lol3={{lol2}} {{lol2}} {{lol2}} {{lol2}} {{lol2}} {{lol2}} {{lol2}} {{lol2}} {{lol2}} {{lol2}}',
      // normally, we'd continue with lol4 through lol9 in the same manner,
      // but this would make the test itself dangerous if the guards in the
      // compiler fail.  Given MAX_PLACEABLE_LENGTH of 2500, lol3 is enough
      // to test this.
      'lolz={{ lol3 }}'
    ].join('\n');
    entries = createEntries(source);
  });

  it('Resolver.format() throws', function() {
    assert.throws(function() {
      Resolver.format(entries.lolz);
    }, /too many characters in placeable/i);
  });
  it('toString() returns undefined', function() {
    var value = Resolver.formatValue(entries.lolz);
    assert.strictEqual(value, undefined);
  });
});
