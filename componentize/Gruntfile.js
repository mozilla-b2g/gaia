var fs = require('fs');
var wrench = require('wrench');      
var source = '../shared/style';
var target = '/tmp/build';
var targetCheckout = '/gaia-bower';

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
    var sys = require('sys');
    var exec = require('child_process').exec;
    child = exec("git clone git@github.com:sebs/gaia-bower.git "+target+targetCheckout, function (error, stdout, stderr) {
      console.log('repo cloned');
      done();
    });
  });
  grunt.registerTask('copy', function() {
    wrench.copyDirSyncRecursive(source, target+targetCheckout+'/style');
  });
  grunt.registerTask('default', ['clean', 'checkout', 'copy']);
};

