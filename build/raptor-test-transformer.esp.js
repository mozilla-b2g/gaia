'use strict';

/**
 * This is a controller: it would invoke the sub-espect file for each test.
 * And it's a Node.js file.
 */

var fs = require('fs');
module.exports = function(filepath, outpath) {
  var requirepath = process.env.DEBUGUY + '/node_modules/';
  var testdir = process.env.TESTDIR;
  var filename = require('path').basename(filepath).replace('.js', '');
  var esname = filename + '.esp.js';
  var espath = testdir + '/' + esname;
  if (!fs.existsSync(espath)) {
    return;
  }

  // For each test, there is one esp file for that.
  var subesp = require(espath);
  // And then apply on that.
  subesp(filepath, outpath, requirepath);
};
