/**
 * Created by anatal on 12/10/15.
 */
/* global assert, helper */
'use strict';
suite('marionette/drivers/promises', function() {

  if (typeof(window) !== 'undefined') {
    return;
  }

  var Driver = require('../../../lib/marionette/drivers/promises');
  var net = require('net');
  var subject;
  var port = 60869;

  function issueFirstResponse(subject) {
    subject.tcp._onDeviceResponse({
      id: subject.tcp.connectionId,
      response: {}
    });
  }

  setup(function() {
    setTimeout(function() {
      var server = net.createServer(function(socket) {
        issueFirstResponse(subject);
        socket.on('data', function(data) {
          socket.write(data);
          server.close();
        });

      }).listen(port);
    }, 50);

    subject = new Driver({ port: port });
  });

  teardown(function() {
    subject.close();
  });

  test('should return a fulfilled promise on connect', function(done) {
    var _promise = subject.connect(function(){
    });

    _promise.then(
      function onFulfill(){
        done();
      },
      function onReject(aRejectReason) {
      }
    );

  });

  test('should send an object and receive a promise', function(done) {
    var sentobj = {type: 'foo'};

      var _promiseconnection = subject.connect(function(){
      });

      _promiseconnection.then(
        function onFulfill(){

            var _promisesend = subject.send(sentobj,
            function (res){
            });

            // and wait..
            _promisesend.then(
              // fulfill of send promise
              function onFulfill(res) {
                console.log('fulfill aqui', res);
                if ( JSON.stringify(res) === JSON.stringify(sentobj) ){
                  done()
                }
              },
              function onReject(aRejectReason) {
              }
            );
        },
        function onReject(aRejectReason) {
        }
      );
   });
});
