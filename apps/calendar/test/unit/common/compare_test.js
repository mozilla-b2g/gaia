define(function(require) {
'use strict';

var compare = require('common/compare');

test('compare', function() {
  assert.equal(compare(0, 1), -1);
  assert.equal(compare(1, 0), 1);
  assert.equal(compare(10, 10), 0);
});

});
