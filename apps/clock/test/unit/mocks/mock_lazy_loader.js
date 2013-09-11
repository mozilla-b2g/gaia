MockLazyLoader = {
  load: function(list, callback) {
    callback.call(list, list);
  }
};
