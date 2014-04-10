module.exports = function(grunt) {
  'use strict';

  // Project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      docs: ['docs/']
    },
    jsdoc: {
      system: {
        src: ['apps/system/js/**/*.js',
              // XXX Remove the following exclusion after related javascript
              // features are supported by JSDocs parser.
              '!apps/system/js/airplane_mode.js',
              '!apps/system/js/sound_manager.js',
              '!apps/system/js/title.js',
              '!apps/system/js/value_selector/date_picker.js',
              '!apps/system/js/value_selector/spin_date_picker.js',
              '!apps/system/js/lockscreen.js',
              '!apps/system/js/edge_swipe_detector.js',
              '!apps/system/js/stack_manager.js',],
        options: {
          destination: 'docs/system'
        }
      },
      keyboard: {
        src: ['apps/keyboard/js/**/*.js',
              '!apps/keyboard/js/render.js'],
        options: {
          destination: 'docs/keyboard'
        }
      },
      options: {
        configure: '.jsdocrc',
        lenient: true
      }
    }
  });

  // Load the plugin that provides tasks
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-jsdoc');

  // Default task(s)
  grunt.registerTask('docs', ['clean', 'jsdoc']);
};
