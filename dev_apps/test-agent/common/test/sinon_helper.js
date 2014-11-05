// load sinon.js
window.requireCommon('vendor/sinon/sinon.js', function() {
  setup(function() {
    this.sinon = sinon.sandbox.create();
  });

  teardown(function() {
    if (this.sinon) {
      this.sinon.restore();
      this.sinon = null;
    }
  });
});
