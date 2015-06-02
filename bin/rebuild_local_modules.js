#!/usr/bin/env node
'use strict';

var Promise = require('es6-promise').Promise;
var exec = require('child_process').exec;
var manifest = require(__dirname + '/../package.json');

function main() {
  var rebuilds = [];
  ['dependencies', 'devDependencies'].forEach(function(dependencyType) {
    var dependencies = manifest[dependencyType];
    for (var id in dependencies) {
      var version = dependencies[id];
      if (version.indexOf('file:') !== 0) {
        continue;
      }

      rebuilds.push(new Promise(function(resolve, reject) {
        var cmd = 'npm rebuild ' + id;
        exec(cmd, { cwd: __dirname + '/../' }, function(error, stdout) {
          if (error) {
            return reject(error);
          }

          console.log(stdout.toString());
          resolve();
        });
      }));
    }
  });

  return Promise.all(rebuilds);
}

if (require.main === module) {
  main();
}
