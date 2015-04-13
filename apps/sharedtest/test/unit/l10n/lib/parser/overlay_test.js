/* global it, assert:true, describe */
/* global navigator */
'use strict';

if (typeof navigator !== 'undefined') {
  var L10n = navigator.mozL10n._getInternalAPI();
} else {
  var assert = require('assert');
  var L10n = {
    PropertiesParser: require('../../../src/lib/format/properties/parser')
  };
}

describe('L10n Parser HTML detection', function() {

  it('HTML entities', function() {
    var ast = L10n.PropertiesParser.parse(null, 'id = string &nbsp;');
    assert.deepEqual(ast[0].$v, { $o: 'string &nbsp;' });
  });

  it('in simple values', function() {
    var ast = L10n.PropertiesParser.parse(null, 'id = string <a>');
    assert.deepEqual(ast[0].$v, { $o: 'string <a>' });
  });

  it('in complex values', function() {
    var ast = L10n.PropertiesParser.parse(null, 'id = string <a> {{ b }}');
    assert.deepEqual(ast[0].$v,
      {'$o':['string <a> ',{'t':'idOrVar','v':'b'}]});
  });

  it('in simple hash values', function() {
    var ast = L10n.PropertiesParser.parse(null,
      'id = {[ plural(n) ]}\n' +
      'id[one] = string <a>');
    assert.deepEqual(ast[0].$v,
      {'one':{'$o':'string <a>'}});
  });

  it('in complex hash values', function() {
    var ast = L10n.PropertiesParser.parse(null,
      'id = {[ plural(n) ]}\n' +
      'id[one] = string <a> {{ b }}');
    assert.deepEqual(ast[0].$v,
      {'one':{'$o':['string <a> ',{'t':'idOrVar','v':'b'}]}});
  });

  it('in simple attributes', function() {
    var ast = L10n.PropertiesParser.parse(null, 'id.attr = string <a>');
    assert.deepEqual(ast[0].attr, { $o: 'string <a>' });
  });

  it('in complex attributes', function() {
    var ast = L10n.PropertiesParser.parse(null,
      'id.attr = string <a> {{ b }}');
    assert.deepEqual(ast[0].attr,
      {'$o':['string <a> ',{'t':'idOrVar','v':'b'}]});
  });

  it('in simple hash attributes', function() {
    var ast = L10n.PropertiesParser.parse(null,
      'id.attr = {[ plural(n) ]}\n' +
      'id.attr[one] = string <a>');
    assert.deepEqual(ast[0].attr.$v,
      {'one':{'$o':'string <a>'}});
  });

  it('in complex hash attributes', function() {
    var ast = L10n.PropertiesParser.parse(null,
      'id.attr = {[ plural(n) ]}\n' +
      'id.attr[one] = string <a> {{ b }}');
    assert.deepEqual(ast[0].attr.$v,
      {'one':{'$o':['string <a> ',{'t':'idOrVar','v':'b'}]}});
  });
});
