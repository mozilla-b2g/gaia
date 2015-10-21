'use strict';
/**
Node http/socket/promise wrapper.
*/

var http = require('http');
var debug = require('debug')('marionette-socket-host:request');
var Promise = require('promise');

var RETRIES = 60;
var RETRY_TIMER = 5000;

function PythonError(msg) {
  Error.call(msg);
  this.name = 'python_error';
}

PythonError.prototype = {
  __proto__: Error.prototype
};

module.exports = function request(socketPath, path, json, retry) {
  retry = retry || 0;
  var body = JSON.stringify(json || {});

  return new Promise(function(accept, reject) {
    debug('issue request', socketPath, path, json);
    var req = http.request({
      socketPath: socketPath,
      method: 'POST',
      path: path,
      headers: {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'application/json'
      }
    });

    req.setTimeout(300 * 1000, function() {
      reject(new Error('Host request timeout exceeded.'));
    });

    // The unix socket server may or may not be ready at this point so we retry
    // up to 5 times to ensure we are connected...
    req.on('error', function(err) {

      if (retry > RETRIES) {
        debug('At maximum retries...');
        return reject(err);
      }

      debug('Error in socket request retrying...', err);

      setTimeout(function() {
        request(socketPath, path, json, retry + 1).then(accept, reject);
      }, RETRY_TIMER);
    });

    // request sender....
    req.write(body);

    req.on('abort', function() {
      debug('Request', retry, 'aborted.');
    });

    // response handler...
    req.on('response', function(res) {
      var data = '';
      res.on('data', function(buffer) {
        data += buffer;
      });

      res.on('end', function() {
        debug(res.statusCode, data);
        var json = JSON.parse(data);
        if (res.statusCode < 200 || res.statusCode > 299) {
          var err = new PythonError(json.message);
          err.stack = json.stack;
          reject(err);
        }
        else if (path === '/start_runner') {
          if (data.length) {
            accept(json);
          }
          else {
            reject(
              new Error('Request to start_runner expects data with response!')
            );
          }
        }
        else {
          accept(json);
        }
      });
    });

    // send the request...
    req.end();
  });
};
