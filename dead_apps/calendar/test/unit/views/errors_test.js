define(function(require) {
'use strict';

var Errors = require('views/errors');
var core = require('core');

suite('Views.Errors', function() {
  var subject, errorName;

  setup(function() {
    subject = new Errors();

    subject.showErrors = function(list) {
      errorName = list[0].name;
    };
  });

  test('offline event', function() {
    core.syncController.emit('offline');
    assert.deepEqual(errorName, 'offline');
  });
});

});
