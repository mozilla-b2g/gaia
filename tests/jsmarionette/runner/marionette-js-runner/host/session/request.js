'use strict';
let debug = require('debug')('session/request');
let eventToPromise = require('event-to-promise');
let http = require('http');

module.exports = function request(method, port, path, options) {
  debug('session request', JSON.stringify(arguments));
  options = options || {};
  return new Promise((resolve, reject) => {
    let req = http.request(
      {method, port, path, hostname: '127.0.0.1'},
      res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          res.body = body;
          resolve(res);
        });
      }
    );

    if (!options.readableStream) {
      return req.end();
    }

    let stream = options.readableStream;
    stream.pipe(req);
    return eventToPromise(stream, 'end').then(() => req.end());
  });
};
