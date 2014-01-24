/*global process, require*/
'use strict';

var Mocha = require('mocha');
var walk_dir = require('./libs/walk_dir');

var mocha = new Mocha({
  harmony: true,
  timeout: 0,
  reporter: 'spec',
  ui: 'tdd'});

var is_valid_file = function (file) {
    if (file.match(/buster/)) {
        return false;
    }
    var ext = '.test.js';

    if (file.indexOf(ext) !== -1) {
        return true;
    }
    return false;
};

function run(cb) {
    walk_dir.walk('build/test/unit', is_valid_file, function (err, files) {
        if (err) { return cb(err); }

        files.forEach(function (file) {
            mocha.addFile(file);
        });

        cb();
    });
}

run(function (err) {
    if (err) { throw err; }
    mocha.run(function (failures) {
        process.exit(failures);
    });
});
