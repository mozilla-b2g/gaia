MockLazyLoader = {
  load: function(list, callback) {
    setTimeout(callback.bind(list, list), 0);
  }
};
