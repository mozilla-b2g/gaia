'use strict';

var Mocha = require('mocha');
var dive = require('diveSync');

var mocha = new Mocha({
  harmony: true,
  reporter: 'spec',
  ui: 'tdd',
  timeout: 0
});

function validFile(file, dir) {
  if (dir) {
    return true;
  }
  return (file.indexOf('.test.js') !== -1);
}

function run(callback) {
  dive(process.env.TEST_FILES_DIR, { filter: validFile }, function(err, file) {
    if (err) {
      return callback(err);
    }
    mocha.addFile(file);
  });
  callback();
}

run(function(err) {
  if (err) {
    throw err;
  }

  mocha.run(function(failures) {
    process.exit(failures);
  });
});
