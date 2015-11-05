'use strict';

/**
 * This is a controller: it would invoke the sub-espect file for each test.
 * Each Espect file will match all files and to see if it can be applied on
 * that, so each Espect module need to filter file path by their own.
 *
 * And it's a Node.js file.
 */

var fs = require('fs');
var path = require('path');
module.exports = function(filepath, outpath) {
  var requirepath;
  if (process.env.RAPTOR_TRANSFORMER_PATH) {
    requirepath = process.env.RAPTOR_TRANSFORMER_PATH + '/node_modules/';
  } else {
    // We guess we're in Gaia and could find it according to such relative path
    requirepath = __dirname + '/../node_modules/debuguy/node_modules/';
  }
  var rulesdir = path.resolve(process.env.RAPTOR_TRANSFORM_RULES);
  fs.readdirSync(rulesdir).forEach(function(esfile) {
    if (!esfile.match(/.esp.js$/)) {
      return;
    }
    // Scan all *.esp files in the directory, and then require and
    // apply them to transform the code.
    var subesp = require(rulesdir + '/' + esfile);
    subesp(filepath, outpath, requirepath);
  });
};
