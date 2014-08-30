define(function (require) {
  // workers won't have this, of course...
  if (window && window.performance && window.performance.now) {
    return {
      now: function () {
        return window.performance.now() * 1000;
      }
    };
  }

  return {
    now: function () {
      return Date.now() * 1000;
    }
  };
});
