module.exports = {
  /* XXX: this is a hack! */
  umask: function() { return 18; },

  argv: window.xpcArgv,
  cwd: function() {
    return _IMPORT_ROOT;
  },
  exit: quit,
  stdout: {
    write: dump
  }
};
