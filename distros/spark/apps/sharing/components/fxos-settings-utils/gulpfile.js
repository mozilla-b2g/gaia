'use strict';

/* global require, console */

var gulp = require('gulp');
var to5 = require('gulp-6to5');

/**
 * converts javascript to es5.
 */
gulp.task('to5', function () {
  try {
    return gulp.src('./settings-utils.js')
      .pipe(to5({ modules: 'amd' }).on('error', function(e) {
        console.log('error running 6to5', e);
      }))
      .pipe(gulp.dest('./dist/'));
  }  catch(e) {
    console.log('Got error in 6to5', e);
  }
});

gulp.task('default', ['to5']);
