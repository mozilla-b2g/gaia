/* global setup, marionette */

'use strict';
var assert = require('assert');
var querystring = require('querystring');

'use strict';

var assert = require('assert');

marionette('a11y', function() {
  var client = marionette.client();
  var subject = client.a11y;

  marionette.plugin('a11y', require('../index'));

  suite('#check invalid HTML', function() {
    setup(function() {
      client.goUrl('data:text/html,' + querystring.escape(
        '<button data-icon="back"></button>'));
    });

    test('invalid HTML should trigger an assert', function() {
      assert.throws(subject.check,
        'Inaccessible HTML check will result in an error');
    });
  });

  suite('#check valid HTML', function() {
    setup(function() {
      client.goUrl('data:text/html,' + querystring.escape(
        '<button data-icon="back" aria-label="Back"></button>'));
    });

    test('valid HTML should not trigger an assert', function() {
      assert.doesNotThrow(subject.check,
        'Inaccessible HTML check will result in an error');
    });
  });
});
