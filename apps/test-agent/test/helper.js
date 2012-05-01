//put stuff here to help you tests out...

(function(window) {

  var Common = window.top.CommonResourceLoader,
      testMethods = [
        'suiteSetup',
        'setup',
        'test',
        'teardown',
        'suiteTeardown'
      ];

  //chai has no backtraces in ff
  function patchChai(Assertion) {
    function chaiAssert(expr, msg, negateMsg, expected, actual) {
      actual = actual || this.obj;
      var msg = (this.negate ? negateMsg : msg),
          ok = this.negate ? !expr : expr;

      if (!ok) {
        throw new Error(
          // include custom message if available
          this.msg ? this.msg + ': ' + msg : msg
        );
      }
    }
    Assertion.prototype.assert = chaiAssert;
  }

  window.requireCommon = function(url, cb) {
    require(Common.url('/common/' + url), cb);
  }

  window.requireCommon('vendor/chai/chai.js', function() {
    patchChai(chai.Assertion);
    window.assert = chai.assert;
  });

  window.requireCommon('test/task.js');
  window.requireCommon('test/mocha-generators.js', function() {
    testMethods.forEach(function(method) {
      MochaGenerators.overload(method);
    });
  });

}(this));
