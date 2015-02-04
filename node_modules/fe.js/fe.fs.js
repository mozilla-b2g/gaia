(function() {
const CWDPATH = '.';
var mPath = require('path');
var Fe = require(__dirname + '/fe.js');

// TODO: error can't show message. If we extend the original Error,
// other property won't be attached.
fs = {

  /**
   * Fake rename.
   */
  rename: function(oldPath, newPath, callback) {
    oldPath = mPath.normalize(oldPath);
    newPath = mPath.normalize(newPath);
    var oldDpath = mPath.dirname(oldPath);
    var newDpath = mPath.dirname(newPath);

    // '.' === mPath.dirname('foo.json')
    // But we register 'foo.json' in the Fe instance as './foo.json'
    if ('.' === oldDpath) {
      oldPath = CWDPATH + '/' + oldPath;
    }
    if ('.' === newDpath) {
      newPath = CWDPATH + '/' + newPath;
    }

    var f = Fe.instance().directories[oldPath];
    if (f) { // Is directory.
      f.path = newPath;
      delete Fe.instance().directories[oldPath];
      Fe.instance().directories[newPath] = f;
      for (var name in f.files) {
        var file = f.files[name];
        var fileOldPath = file.path;
        file.resetPath();
        delete Fe.instance().files[fileOldPath];
        Fe.instance().files[file.path] = file;
      }
    } else {
      f = Fe.instance().files[oldPath];
      f.path = newPath;
      var oldName = f.name;
      var newName = mPath.basename(newPath);
      f.name = newName;
      var newDir = Fe.instance().directories[newDpath];
      delete Fe.instance().files[oldPath];
      Fe.instance().files[newPath] = f;
      f.directory.remove(oldName);
      f.directory = newDir;
      newDir.add(f);
    }
    if (callback)
      callback(null);
  },

  /**
   * Fake `mkdir`. Would throw exception when roots not exist.
   * It's different from the `directory()` method in the Fe,
   * which can directly make a directory with some non-existing nodes.
   */
  mkdir: function(path, mode, callback) {
    path = mPath.normalize(path);
    if ('function' === typeof mode) {
      callback = mode;
      mode = null;
    }
    var existingDir = mPath.dirname(path);
    if ('.' === existingDir) {
      path = CWDPATH + '/' + path;
      existingDir = '.';
    }
    var target = Fe.instance().directories[existingDir];
    if (!target) {
      var err = {errno: 34, code: 'ENOENT', path: existingDir};
      if (callback) {
        callback(err);
      } else {
        throw err;
      }
    }

    var dir = Fe.instance().directory(path);
    if (mode) // Change mode directly to keep the a/m/c time.
      dir.states.mode = mode;
    if (callback)
      callback(null);
  },

  /**
   * Fake `readdir`.
   * It would not accept './' prefix paths, and would not sort the result.
   */
  readdir: function(path, callback) {
    path = mPath.normalize(path);
    if ('.' === mPath.dirname(path))
      path = CWDPATH + '/' + path;
    var matched = [];
    var target = Fe.instance().files[path] ?
                 Fe.instance().files[path] :
                 Fe.instance().directories[path];
    if (!target) {
      var err = {errno: 27, code: 'ENOTDIR', path: path};
      if (callback) {
        callback(err);
      } else {
        throw err;
      }
      return;
    }
    for (var fpath in Fe.instance().files) {
      var file = Fe.instance().files[fpath];
      var matches = fpath.match(new RegExp('^' + path + '/' + file.name));
      if (null !== matches)
        matched.push(file.name);
    }
    for (var dpath in Fe.instance().directories) {
      var matches = dpath.match(new RegExp('^' + path + '/([^/]*$)'));
      if(null !== matches) {
        matched.push(matches[1]);
      }
    }
    if (callback)
      callback(null, matched);
    return matched;
  },

  chmod: function(path, mode, callback) {
    path = mPath.normalize(path);
    if ('.' === mPath.dirname(path)) {
      path = CWDPATH + '/' + path;
    }
    var target = Fe.instance().files[path] ?
                 Fe.instance().files[path] :
                 Fe.instance().directories[path];
    target.states('mode',  mode);
    if (callback)
      callback(null);
  },

  unlink: function(path, callback) {
    path = mPath.normalize(path);
    if ('.' === mPath.dirname(path))
      path = CWDPATH + '/' + path;
    if (Fe.instance().directories[path]) {
      var err = { errno: 50, code: 'EPERM', path: path};
      if (callback) {
        callback(err);
      } else {
        throw err;
      }
      return;
    }
    Fe.instance().files[path].destroy();
    if (callback)
      callback(null);
  },

  rmdir: function(path, callback) {
    path = mPath.normalize(path);
    if ('.' === mPath.dirname(path))
      path = CWDPATH + '/' + path;
    if (Fe.instance().files[path]) {
      var err = {errno: 27, code: 'ENOTDIR', path: path};
      if (callback) {
        callback(err);
      } else {
        throw err;
      }
      return;
    }
    var dir = Fe.instance().directories[path];
    if ( 0 !== Object.keys(dir.files).length) {
      var err = {errno: 53, code: 'ENOTEMPTY', path: path};
      if (callback) {
        callback(err);
      } else {
        throw err;
      }
      return;
    }
    dir.destroy();
    if (callback)
      callback(null);
  },

  /**
   * Fake writeFile, which discares options.
   * If file created in this way, it can't be watched unless
   * user insert it via the watcher API.
   */
  writeFile: function(filename, data, opts, callback) {
    filename = mPath.normalize(filename);
    var dirname = mPath.dirname(filename);
    var basename = mPath.basename(filename);
    if ('.' === mPath.dirname(filename)) {
      filename = CWDPATH + '/' + filename;
      dirname = CWDPATH + '/';
    }
    var file = Fe.instance().files[filename];
    // Create new file and directory.
    if (!file) {
      var dir = Fe.instance().directories[dirname];
      if (!dir)
        dir = Fe.directory(dirname);
      file = Fe.file(dir, filename, data);
    } else {
      file.write(data);
    }
    if (callback)
      callback(null);
  },

  /**
   * Fake readFile. Would ignore options.
   */
  readFile: function(filename, opts, callback) {
    filename = mPath.normalize(filename);
    if ('.' === mPath.dirname(filename))
      filename = CWDPATH + '/' + filename;
    var content = Fe.instance().files[filename].read();
    if (callback)
      callback(null, content);
    return content;
  },

  /**
   * Fake stats. Only isFile and isDirectory works.
   */
  stat: function(path, callback) {
    path = mPath.normalize(path);
    if ('.' === mPath.dirname(path))
      path = CWDPATH + '/' + path;
    var target = Fe.instance().files[path] ?
                 Fe.instance().files[path] :
                 Fe.instance().directories[path];
    var result = {
      isFile: function() {
       return undefined !== Fe.instance().files[path];
      },
      isDirectory: function(){
        return undefined !== Fe.instance().directories[path];
      },
      isBlockDevice: function(){ return false; },
      isCharacterDevice: function(){ return false; },
      isFIFO: function(){ return false; },
      isSocket: function(){ return false; },
      dev: 1,
      ino: 1,
      mode: parseInt(target.states.mode),
      nlink: 1,
      uid: parseInt(target.states.uid),
      gid: parseInt(target.states.gid),
      rdev: 0,
      size: 1,
      blksize: 4096,
      blocks: 1,
      atime: target.states.atime,
      mtime: target.states.mtime,
      ctime: target.states.ctime
    };

    if (callback)
      callback(null, result);
    return result;
  },

  chown: function(path, uid, gid, callback) {
    path = mPath.normalize(path);
    if ('.' === mPath.dirname(path))
      path = CWDPATH + '/' + path;
    var target = Fe.instance().files[path] ?
                 Fe.instance().files[path] :
                 Fe.instance().directories[path];
    target.states('uid', uid.toString());
    target.states('gid', gid.toString());
    if (callback)
      callback(null);
  },
};

fs.renameSync = fs.rename;
fs.mkdirSync = fs.mkdir;
fs.readdirSync = fs.readdir;
fs.chmodSync = fs.chmod;
fs.unlinkSync = fs.unlink;
fs.rmdirSync = fs.rmdir;
fs.writeFileSync = fs.writeFile;
fs.readFileSync = fs.readFile;
fs.statSync = fs.stat;
// lstat === stat
fs.lstatSync = fs.lstat = fs.stat;
fs.chownSync = fs.chown;

module.exports = fs;
})();
