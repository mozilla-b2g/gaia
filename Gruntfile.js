/* global module, require */
module.exports = function(grunt) {
  'use strict';

  var fs = require('fs'),
      path = require('path');
  var JSDOCJSON = 'jsdoc.json';

  // Load the plugin that provides tasks.
  require('load-grunt-tasks')(grunt);
  grunt.loadTasks('tasks');

  // merge source to destination dict
  function extend(destination, source) {
    for (var property in source) {
      if (source.hasOwnProperty(property)) {
        destination[property] = source[property];
      }
    }
    return destination;
  }

  var jsdocConfig = {
    // per app configurations are defined in each app's jsdoc.json file
    options: {
      configure: '.jsdocrc',
      lenient: true //comment this out to debug jsdoc strictly
    }
  };

  // processing jsdoc configurations
  var files = fs.readdirSync('apps');
  files.forEach(function(filePath, i) {
    var appName = path.join('apps', filePath);
    if (fs.statSync(appName).isDirectory()) {
      // read jsdoc.json file in each app
      var jsonFile = path.join('apps', filePath, JSDOCJSON);
      if (fs.existsSync(jsonFile)) {
        console.log('... ' + filePath + ' config file found');
        var appcfg = JSON.parse(fs.readFileSync(jsonFile,
          { encoding: 'utf8' }));
        extend(jsdocConfig, appcfg);
      }
    }
  });

  // Project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      docs: ['docs/']
    },
    jsdoc: jsdocConfig
  });

  // Default task(s)
  grunt.registerTask('docs', ['clean', 'jsdoc']);
};
