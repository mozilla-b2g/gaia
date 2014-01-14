var fs = require('fs');
var path = require('path');
var append = require('append');

// default options
var defaultOpt = {
  all: false,
  recursive: true,
  files: true,
  directories: false
};

// general function
module.exports = function(dir, opt, action, complete) {

  // check args
  if (typeof opt == 'function') {
    if (typeof action == 'undefined')
      complete = function () {};
    else
      complete = action;

    action = opt;
    opt = { };
  } else if (typeof complete == 'undefined')
    complete = function () {};

  // Assert that dir is a string
  if (typeof dir != 'string')
    dir = process.cwd();

  opt = append(defaultOpt, opt);

  function dive(dir) {
    // Read the directory
    fs.readdir(dir, function(err, list) {
      todo--;
      // Return the error if something went wrong
      if (err) return action(err);

      // For every file in the list
      list.forEach(function(file) {

        if (opt.all || file[0] != '.') {
          todo++;

          // Full path of that file
          var fullPath = path.resolve(dir, file);
          // Get the file's stats
          fs.stat(fullPath, function(err, stat) {
            if (err) {
              todo--;
              return action(err);
            }

            // If the file is a directory
            if (stat) {
              if (stat.isDirectory()) {
                // Call action if enabled for directories
                if (opt.directories)
                  action(null, fullPath);

                // Dive into the directory
                if (opt.recursive)
                  dive(fullPath);
              } else {
                // Call action if enabled for files
                if (opt.files)
                  action(null, fullPath);

                if (!--todo)
                  complete();
              }
            }
          });
        }
      });
      //empty directories, or with just hidden files
      if (!todo){
        complete();
      }
    });
  };

  var todo = 1;
  dive(dir);
};
