// load sinon.js
window.requireCommon('vendor/sinon/sinon.js', function() {
  setup(function() {
    this.sinon = sinon.sandbox.create();
  });

  teardown(function() {
    // if something in between somehow cleared sinon return early.
    if (!this.sinon)
      return;

    this.sinon.restore();
    this.sinon = null;
  });
});
