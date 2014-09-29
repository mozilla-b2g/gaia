/*global process, require*/
'use strict';

var Mocha = require('mocha');
var walk_dir = require('./libs/walk_dir');

var mocha = new Mocha({
  harmony: true,
  reporter: 'spec',
  ui: 'tdd',
  timeout: 0
});

function valid_file(file) {
  return (file.indexOf('.test.js') !== -1);
}

function run(callback) {
  walk_dir.walk(process.env.TEST_FILES_DIR, valid_file, function(err, files) {
    if (err) {
      return callback(err);
    }

    files.forEach(function(file) {
      mocha.addFile(file);
    });

    callback();
  });
}

run(function(err) {
  if (err) {
    throw err;
  }

  mocha.run(function(failures) {
    process.exit(failures);
  });
});
