module.exports = function(grunt) {
  'use strict';

  // Project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      docs: ['docs/']
    },
    jsdoc: {
      system : {
        src: ['README.md', 'apps/system/js/**.js',
              '!apps/system/js/airplane_mode.js',
              '!apps/system/js/sound_manager.js'],
        options: {
          destination: 'docs/system'
        }
      },
      options: {
        configure: '.jsdocrc'
      }
    }
  });

  // Load the plugin that provides tasks
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-jsdoc');

  // Default task(s)
  grunt.registerTask('docs', ['clean', 'jsdoc']);
};

