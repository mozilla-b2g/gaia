module.exports = function(grunt) {

// project configuration
grunt.initConfig({
  watch: {
    scripts: {
      files: '**/*.js',
      tasks: [],
      options: {
        interrupt: true,
        livereload: true
      }
    }
  }
});

grunt.loadNpmTasks('grunt-contrib-watch');
grunt.registerTask('default', []);

};