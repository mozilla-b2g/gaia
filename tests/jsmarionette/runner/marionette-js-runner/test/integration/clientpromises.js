'use strict';
var assert = require('assert');

marionette('client for promises driver', function() {
  var PromisesDriver = require('marionette-client').Drivers.Promises;
  var client = marionette.client({ driver: PromisesDriver });

  test('send a script using promises', function(done) {
     client.executeScript(function(){
       return Math.PI * Math.E;
     }).then(
      function onFulfill(res){
        assert.equal(res.value, Math.PI * Math.E);
        done();
      },
      function onReject(aRejectReason) {
        done(new Error('Promise rejected. Reason:', aRejectReason));
      }
    );
  });
});
