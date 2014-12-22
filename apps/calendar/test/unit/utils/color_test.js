define(function(require) {
'use strict';

var color = require('utils/color');

suite('utils/color', function() {
  test('#hexToBackground', function() {
    assert.equal(color.hexToBackground('#ff00aa'), 'rgba(255, 0, 170, 0.2)');
  });
});

});
