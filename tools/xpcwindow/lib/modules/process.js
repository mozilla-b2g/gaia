module.exports = {
  /* XXX: this is a hack! */
  umask: function() { return 18; },

  nextTick: function(cb) {
    setTimeout(cb, 0);
  },

  argv: window.xpcArgv,
  cwd: function() {
    return _IMPORT_ROOT;
  },
  exit: quit,
  stdout: {
    write: dump
  }
};
