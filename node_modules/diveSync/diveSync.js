var fs = require('fs'),
    append = require('append');

// general function
var diveSync = function(dir, opt, action) {
  // default options
  var defaultOpt = {
    recursive: true,
    all: false,
    directories: false,
    filter: function filter() {
      return true;
    }
  };

  // action is the last argument
  action = arguments[arguments.length - 1];

  // ensure opt is an object
  if (typeof opt != 'object')
    opt = {};

  opt = append(defaultOpt, opt);

  // apply filter
  if (!opt.filter(dir, true)) return;

  try {
    // read the directory
    var list = fs.readdirSync(dir);

    // for every file in the list
    list.forEach(function (file) {
      if (opt.all || file[0] != '.') {
        // full path of that file
        var path = dir + '/' + file;

        // get the file's stats
        var stat = fs.statSync(path);

        // if the file is a directory
        if (stat && stat.isDirectory()) {
          // call the action if enabled for directories
          if (opt.directories)
            action(null, path);

          // dive into the directory
          if (opt.recursive)
            diveSync(path, opt, action);
        } else {
          // apply filter
          if (!opt.filter(path, false)) return;

          // call the action
          action(null, path);
        }
      }
    });
  } catch(err) {
    action(err);
  }
};

module.exports = diveSync;
