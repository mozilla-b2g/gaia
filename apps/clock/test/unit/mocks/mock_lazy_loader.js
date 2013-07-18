MockLazyLoader = {
  load: function(list, callback) {
    setTimeout(callback, 0);
  }
};
