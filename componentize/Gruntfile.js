module.exports = function(grunt) {
  grunt.initConfig({
  });
  grunt.registerTask('copy', function() {
    var fs = require('fs');
    var wrench = require('wrench'),
      util = require('util');
      wrench.rmdirSyncRecursive('gaia-bower/style', true);
      wrench.mkdirSyncRecursive('gaia-bower/style', 0777);      
      wrench.copyDirSyncRecursive('../shared/style', 'gaia-bower/style');
      console.log('files copied');
  });
  grunt.registerTask('checkout', function() {
    var sys = require('sys');
    var exec = require('child_process').exec;
    child = exec("git clone git@github.com:sebs/gaia-bower.git", function (error, stdout, stderr) {
    });
    console.log('repo cloned');
  });
  grunt.registerTask('default', ['checkout', 'copy']);
};

