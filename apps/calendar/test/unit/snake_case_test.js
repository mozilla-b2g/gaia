define(function(require) {
'use strict';

var snakeCase = require('snake_case');

test('snake_case', function() {
  assert.strictEqual(snakeCase('FooBarBaz'), 'foo_bar_baz');
  assert.strictEqual(snakeCase('fooBarBaz'), 'foo_bar_baz');
});

});
