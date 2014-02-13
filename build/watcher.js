'use strict';

var Monitor = require(__dirname + '/monitor.js').Monitor;

// Execute the script.
var watchList = process.env.WATCH || 'apps,test_apps',
    monitor = new Monitor(process.cwd(),
      {'directories': watchList.split(',')});
monitor.watch();
