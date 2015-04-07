/* jshint node: true */
'use strict';

var gulp = require('gulp');
var jsdoc = require('gulp-jsdoc');
var del = require('del');
var babel = require('gulp-babel');
var fs = require('fs');
var path = require('path');

var JSDOC_JSON = 'jsdoc.json';
var JSDOC_TASK_PREFIX = 'jsdoc:';

var jsdocTasks = [];
var files = fs.readdirSync('apps');

// generate per app tasks and host those tasks name in jsdocTasks list
files.forEach(function(filePath, i) {
  var appName = path.join('apps', filePath);
  if (fs.statSync(appName).isDirectory()) {
    // read jsdoc.json file in each app
    var jsonFile = path.join('apps', filePath, JSDOC_JSON);
    if (fs.existsSync(jsonFile)) {
      console.log(filePath + ' config file found');
      var appcfg = JSON.parse(fs.readFileSync(jsonFile,
        { encoding: 'utf8' }));
      // Some app (ex: communications) config may define multiple apps
      for (var property in appcfg) {
        if (appcfg.hasOwnProperty(property)) {
          jsdocTasks.push(JSDOC_TASK_PREFIX + property);
          // processing jsdoc configurations
          gulp.task(JSDOC_TASK_PREFIX + property, function() {
            return gulp.src(appcfg[property].src)
              .pipe(babel({compact: false}))
              .pipe(jsdoc.parser())
              .pipe(jsdoc.generator(appcfg[property].options.destination));
          });
          console.log('... ' + property + ' task registered');
        }
      }
    }
  }
});

gulp.task('clean', function(cb) {
  del(['./docs'], cb);
});

gulp.task('docs', jsdocTasks);

