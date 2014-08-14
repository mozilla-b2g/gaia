/* global
  Utils
 */

'use strict';

require('/js/utils.js');

suite('Network Alerts - Utils', function() {
  var parameters = [
    'attention.html?',
    'subject=hello%20world&',
    'body=how%20are%20you&',
    'novalue&',
    'emptyvalue='
  ];

  var expected = {
    subject: 'hello world',
    body: 'how are you',
    novalue: undefined,
    emptyvalue: ''
  };

  test('parseParams decodes search parameters', function() {
    var subject = [ 'attention.html?' ].concat(parameters).join('');

    var result = Utils.parseParams(subject);
    for (var key in result) {
      assert.strictEqual(result[key], expected[key]);
    }
  });

  test('parseParams decodes hash parameters', function() {
    var subject = [ 'attention.html#' ].concat(parameters).join('');

    var result = Utils.parseParams(subject);
    for (var key in result) {
      assert.strictEqual(result[key], expected[key]);
    }
  });

});

