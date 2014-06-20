'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils = require('./mock_utils.js');

suite('pseudo-l10n.js', function() {
  var app = proxyquire.noCallThru().load(
    '../../pseudo-l10n',
    { 'utils': mockUtils });

  test('makeAccented', function() {

  });

  test('makeRTL', function() {
    var testStr1 = 'a';
    var testStr2 = ';,[]';
    assert.equal(app.makeRTL(testStr1), '\u202e' + testStr1 + '\u202c');
    assert.equal(app.makeRTL(testStr2), testStr2);
  });

  test('makeLonger', function() {
    var testStr1 = 'abcde';
    var testStr2 = '12345';
    assert.equal(app.makeLonger(testStr1), 'aabcdee');
    assert.equal(app.makeLonger(testStr2), testStr2);
  });
});
