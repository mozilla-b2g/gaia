var fs = require('fs');
var wrench = require('wrench');      
var source = '../../shared/style';
var target = '/tmp/build';
var targetCheckout = '/gaia-bower';
var exec = require('child_process').exec;

module.exports = function(grunt) {
  grunt.initConfig({
  });
  grunt.registerTask('clean', function() {
      util = require('util');
      wrench.rmdirSyncRecursive(target, true);
      wrench.mkdirSyncRecursive(target);
      console.log('cleaned');
  });
  grunt.registerTask('checkout', function() {
    var done = this.async();
    child = exec("git clone git@github.com:sebs/gaia-bower.git "+target+targetCheckout, function (error, stdout, stderr) {
      console.log(stdout);
      done();
    });
  });
  grunt.registerTask('copy', function() {
    wrench.copyDirSyncRecursive(source, target+targetCheckout+'/style');
  });
  grunt.registerTask('commitandpush', function() {
    var done = this.async();
    child = exec('cd /tmp/build/gaia-bower; git commit . -m "added files"; git push origin master', function(error, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      done();
    });    
  });
  grunt.registerTask('default', ['clean', 'checkout', 'copy', 'commitandpush']);
};

