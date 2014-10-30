(function() {
// Because of the `path.dirname('abc.foo')`
// would be `.`
const CWDPATH = '.';
const ROOTPATH = '/';
var Fe = {
  _instance: null,
  instance: function() {
    if (Fe._instance)
      return Fe._instance;
    Fe._instance = new Fe.o();
    return Fe._instance;
  }
};

Fe.o = function() {
  // {path: Fe.File}
  this.files = {};
  // {path: Fe.Directory}
  this.directories = {};
  var cwd = this.directory(CWDPATH);
  var root = this.directory(ROOTPATH);
};

Fe.File = function(directory, name, content, watcher) {
  var dtime = Date.now();
  this.path = directory.path + '/' + name;
  this.directory = directory;
  this.name = name;
  this.content = content;
  this.watcher = watcher || function(){ return content;};
  this.states = {
    opened: false,
    mode: '0664',
    uid: '1',
    gid: '1',
    atime: dtime,
    mtime: dtime,
    ctime: dtime
  };
  this.directory.add(this);
};

Fe.File.prototype.resetPath = function() {
  this.states.mtime = this.states.ctime = Date.now();
  this.path = this.directory.path + '/' + this.name;
  return this;
};

Fe.File.prototype.open = function() {
  // TODO: implement this with dummy file handler.
  this.states.opened = true;
  this.watcher(this.content, this.content, 'o');
  return this;
};

Fe.File.prototype.close = function() {
  // TODO: implement this with dummy file handler.
  this.states.opened = false;
  this.watcher(this.content, this.content, 'c');
  return this;
};

Fe.File.prototype.read = function() {
  this.states.atime = Date.now();
  return this.watcher(this.content, this.content, 'r');
};

Fe.File.prototype.write = function(content) {
  this.states.mtime = this.states.ctime = Date.now();
  var oldContent = this.content;
  this.content = content;
  this.watcher(oldContent, content, 'w');
  return this;
};

/**
 * Set states with key/value pair.
 */
Fe.File.prototype.states = function(key, value) {
  this.states.ctime = Date.now();
  this.watcher(states, {key: value}, 's');
  return this;
};

Fe.File.prototype.destroy = function() {
  this.directory.remove(this.name);
  this.directory = null;
  this.content = null;
  this.watcher = null;
  delete Fe.instance().files[this.path];
};

Fe.Directory = function(path, files) {
  var dtime = Date.now();
  this.path = path;
  this.files = files || {};
  this.states = {
    mode: '0777',
    uid: '1',
    gid: '1',
    atime: dtime,
    mtime: dtime,
    ctime: dtime
  };
};

Fe.Directory.prototype.add = function(file) {
  this.states.mtime = this.states.ctime = Date.now();

  // To prevent circular file system.
  file.directory.remove(file.name);
  var oldPath = file.path;
  delete Fe.instance().files[oldPath];
  file.directory = this;
  file.resetPath();
  Fe.instance().files[file.path] = file;

  this.files[file.name] = file;
  return this;
};

Fe.Directory.prototype.remove = function(name) {
  this.states.mtime = this.states.ctime = Date.now();
  var f = this.files[name];
  delete this.files[name];
  return this;
};

Fe.Directory.prototype.child = function(name) {
  return this.files[name];
};

Fe.Directory.prototype.destroy = function() {
  this.files = {};
  delete Fe.instance().directories[this.path];
};

/**
 * Set states with key/value pair.
 */
Fe.File.prototype.states = function(key, value) {
  this.states.ctime = Date.now();
  this.watcher(states, {key: value}, 's');
  return this;
};

/**
 * Create a dummy file. This file can be access via the path which combined
 * the one indicated in the optional `directory` and `name` parameters.
 *
 * For example, a file generate with such parameters:
 *
 *    var fe = new Fe();
 *    var foo = fe.file(fe.directory('/fake/tmp'), 'foo.json');
 *
 * would be indictable with the path '/fake/tmp/foo.json'.
 *
 * Note #1: any created files and directories would be registered inside the
 * `Fe` instance. For example, the `foo` described above would register
 * itself inside the `fe` instance. The return one is only for convenience.
 *
 * Note #2: the file would become a JSON file as default. If this file
 * should be read as different format, like XML or even binary, it can use
 * the `watcher` function to return the converted content.
 *
 * @param {Fe.Directory} directory - (Optional) where to put this file.
 * @param {string} name - The file name.
 * @param {object} content - (Optional) the file content.
 * @param {function(oldContent, content, mode)} watcher - (Optional) When the
 *        file is changed, this function would be called. And the final result
 *        the caller can access, is the content it return, include old and new
 *        one. If the action is read or just open, the two content would be
 *        the same (mode would be [r]ead, [w]rite, [o]pen, [s]tate and [c]lose).
 * @return {Fe.File}
 * @this {Fe}
 */
Fe.o.prototype.file = function(directory, name, content, watcher) {
  // Handle optional parameters.
  if ('function' === typeof content) {
    watcher = content;
    content = null;
  }
  if ('object' === typeof name) {
    content = name;
    name = directory;
    directory = this.directories[CWDPATH];
  }
  if ('function' === typeof name) {
    watcher = name;
    content = null;
    name = directory;
    directory = this.directories[CWDPATH];
  }
  // Give no name.
  if ('string' !== typeof name)
    throw 'Must give a file name.';
  var file = new Fe.File(directory, name, content, watcher);
  this.files[file.path] = file;
  return file;
};

/**
 * Create a dummy directory.
 *
 * @param {string} path - The absolute path of this directory.
 * @param {{string: Fe.file}} files - (Optional) files it contains.
 * @return {Fe.directory}
 * @this {Fe}
 */
Fe.o.prototype.directory = function(path, files) {
  var dir = new Fe.Directory(path, files);
  this.directories[dir.path] = dir;
  return dir;
};

/**
 * Destroy the whole file system it created.
 *
 * Note: all references it returned, include files and directories,
 * would become invalid after this action. And access them would
 * raise exceptions.
 *
 * @this {Fe}
 */
Fe.o.prototype.destroy = function() {
  Fe._instance = null;
};

module.exports = Fe;
})();
