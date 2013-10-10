// load sinon.js
window.requireCommon('vendor/sinon/sinon.js', function() {
  var suiteSandbox;
  suiteSetup(function() {
    this.sinon = suiteSandbox = sinon.sandbox.create();
  });

  setup(function() {
    this.sinon = sinon.sandbox.create();
  });

  teardown(function() {
    this.sinon.restore();
    this.sinon = null;
  });

  suiteTeardown(function() {
    suiteSandbox.restore();
  });
});
