var fs = require('fs');
var wrench = require('wrench');      
var exec = require('child_process').exec;
var source = '../../shared/style';
var target = '/tmp/build';
var targetCheckout = '/gaia-bower';
var repo = 'git@github.com:sebs/gaia-bower.git';

var getCss = function() { 
  var res = wrench.readdirSyncRecursive(source);
  var cssFiles = [];
  for(var i=0; i< res.length; i++) {
    if (res[i].match('.css') <= 0) {
      continue;
    }
    cssFiles.push(target+targetCheckout+"/style/"+res[i]);
  }
  return cssFiles;
};

module.exports = function(grunt) {
  grunt.initConfig({
    concat: {
     options: {
       stripBanners: false,
       separator: ";"
     }, 
     dist: {
        src: getCss(),
        dest: target+targetCheckout+'/gaia.css'
      }
     }
  });
  // removes all files from build target
  grunt.registerTask('clean', function() {
    util = require('util');
    wrench.rmdirSyncRecursive(target, true);
    wrench.mkdirSyncRecursive(target);
    console.log('cleaned');
  });
  // checks out the repository where bower components reside
  grunt.registerTask('checkout', function() {
    var done = this.async();
    child = exec("git clone "+repo+" "+target+targetCheckout, function (error, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      done(); 
    });
  });
  // copies the styles to the target folder 
  grunt.registerTask('copy', function() {
    wrench.copyDirSyncRecursive(source, target+targetCheckout+'/style');
  });
  // commits the files to the repo and pushes them
  grunt.registerTask('commitandpush', function() {
    var done = this.async();
    child = exec('cd /tmp/build/gaia-bower; git commit . -m "added files"; git push origin master', function(error, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      done();
    });    
  });

  // reads all files and creates documentation
  grunt.registerTask('gendocs', function() {
    var res = wrench.readdirSyncRecursive(source);
    var doc = "# Gaia Demo Files";
    var docCss = "# Gaia CSS FIles"
    var newline = "\n";
    doc +=newline;
    docCss +=newline;
    for(var i=0; i< res.length; i++) {
      res[i] = './style/'+res[i];
      if (res[i].match(".html")) {
        doc += "  * [" + res[i]+ "]("+res[i]+")";
        doc +=newline;
      }
      if (res[i].match(".css")) {
        docCss += "  * ["+ res[i] + "]("+res[i]+")" + newline;
      }
    }
    var fullDoc = doc + newline + docCss;
    fs.writeFileSync(target+'/gaia-bower/Styles.md', fullDoc);
  });
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.registerTask('default', ['clean', 'checkout', 'copy', 'gendocs', 'concat', 'commitandpush']);
};

