var MockLazyLoader = {
  load: function(files, cb) {
    if (cb)
      cb();
  }
};
