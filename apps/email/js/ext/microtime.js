define('microtime',['require'],function (require) {
  return {
    now: function () {
      return Date.now() * 1000;
    }
  };
});
