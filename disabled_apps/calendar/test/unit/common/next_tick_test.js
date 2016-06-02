define(function(require) {
'use strict';

var nextTick = require('common/next_tick');

test('nextTick', function(done) {
  var inc = 0;
  nextTick(() => {
    assert.equal(inc, 1);

    nextTick(() => {
      assert.equal(inc, 2);
      nextTick(done);
    });

    inc++;
  });

  inc = 1;
});

});
