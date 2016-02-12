'use strict';
suite('marionette/drivers/promises', function() {

  if (typeof(window) !== 'undefined') {
    return;
  }

  var Driver = require('marionette-client').Drivers.Promises;
  var net = require('net');
  var findPort = require('find-port');
  var subject;

  function getPort() {
    var promiseport = new Promise(function (resolve, reject) {
      findPort(6000, 6250, function (ports) {
        ports[0] ? resolve(ports[0]) : reject();
      });
    });

    return promiseport.then(function (_port){
        return _port;
      }
    );
  }

  function issueFirstResponse(subject) {
    subject.tcp._onDeviceResponse({
      id: subject.tcp.connectionId,
      response: {}
    });
  }

  function runserver(port){
    var server = net.createServer(function(socket) {
      setTimeout(function() {
            issueFirstResponse(subject);
          }
      , 500);
      socket.on('data', function(data) {
        socket.write(data);
        server.close();
      });
    }).listen(port);
  }

  teardown(function() {
    subject.close();
  });

  test('should return a promise on connect', function(done) {
    getPort().then(function(port){
      runserver(port);
      subject = new Driver({ port: port });
      var _promise = subject.connect();
      _promise.then(
        function onFulfill(){
          done();
        },
        function onReject(){
          done(new Error('Fail to connect'));
        }
      );
    });
  });

  test('should send an object and receive a promise', function(done) {
    getPort().then(function(port){
      runserver(port);
      subject = new Driver({ port: port });
      var _promiseconnection = subject.connect();
      _promiseconnection.then(
        function onFulfill(){
          var sentobj = {type: 'foo'};
          var _promisesend = subject.send(sentobj);
          _promisesend.then(
            function onFulfill(res) {
              if (JSON.stringify(res) === JSON.stringify(sentobj)){
                done();
              } else {
                done(new Error('Value not match'));
              }
            },
            function onReject(error) {
              done(new Error('Send rejected. Error:', error));
            }
          );
        },
        function onReject(error){
          done(new Error('Fail to connect. Error', error));
        }
      );
    });
   });
});
