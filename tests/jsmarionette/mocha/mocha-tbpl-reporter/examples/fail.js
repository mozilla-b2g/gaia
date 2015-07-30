'use strict';
test('fail', function() {
  throw new Error('myerror');
});

test('pass later', function() {
});
