/*global require, module*/
'use strict';
var fs = require('fs');
var path = require('path');

var methods = {
  walk: function (dir, validation_function, callback) {
    if (arguments.length === 2) {
      callback = validation_function;
      validation_function = null;
    }

    var results = [];
    var files = fs.readdirSync(dir);
    var pending = files.length;

    if (!pending) {
      return callback(null, results);
    }

    files.forEach(function (file) {
      file = path.join(dir, file);
      var stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        methods.walk(file, validation_function, function (err, res) {
          results = results.concat(res);
          if (!--pending) {
            callback(null, results);
          }
        });
      } else {
        if (typeof validation_function !== 'function' ||
          validation_function(file)) {
          results.push(file);
        }

        if (!--pending) {
          callback(null, results);
        }
      }
    });
  }
};

module.exports = methods;
