
'use strict';

(function() {

  var Monitor = function() {};
  Monitor.prototype = {
    states: {
      making: false   // To prevent infinite making
                      // because of the new changes added by the make.
    },
    configs: {
      directories: ['apps', 'test_apps']
    }
  };

  /**
   * @param [string] - [directory, appName]
   */
  Monitor.prototype.parsePath = function(filePath) {
    var matched = filePath.match(/^(.*?)\/(.*?)\/.*$/).slice(1,3);
    if (null === matched) {
      throw new Error('Parsed invalid path: ' + filePath);
    }
    return matched;
  };

  Monitor.prototype.invokeMake = function(appName) {
    if (this.states.making) {
      return;
    }
    this.states.making = true;
    process.env.APP = appName;
    var spawn = require('child_process').spawn,
        make  = spawn('make', [], {env: process.env});

    make.stdout.on('data', (function (data) {
        console.log(data.toString());
    }).bind(this));

    make.stderr.on('data', (function (data) {
        console.log(data.toString());
    }).bind(this));

    make.on('close', (function (code) {
        console.log('## Monitor make for "' + process.env.APP +
          '" was done with code "' + code + '"');

        // XXX: Restore the make later because some file changes would be done
        // after the make process got closed.
        setTimeout((function() {this.states.making = false;}).bind(this),
          5000);
    }).bind(this));
  };

  Monitor.prototype.watch = function() {
    var watch = require('watch');
    this.configs.directories.forEach((function(dirname) {
      watch.createMonitor(dirname, (function (monitor) {
          monitor.on('created', (function (f, stat) {
            console.log('created: ' + f);
            this.invokeMake(this.parsePath(f)[1]);
          }).bind(this));
          monitor.on('changed', (function (f, curr, prev) {
            console.log('changed: ' + f);
            this.invokeMake(this.parsePath(f)[1]);
          }).bind(this));
          monitor.on('removed', (function (f, stat) {
            console.log('removed: ' + f);
            this.invokeMake(this.parsePath(f)[1]);
          }).bind(this));
        }).bind(this));
    }).bind(this));
  };

  var monitor = new Monitor();
  monitor.watch();

})();


