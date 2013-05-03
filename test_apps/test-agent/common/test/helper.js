//put stuff here to help you tests out...

(function(window) {
  //register the global
  window.navigator;

  var Common = window.parent.CommonResourceLoader,
      //mocha test methods we want to provide
      //yield support to.
      testMethods = [
        'suiteSetup',
        'setup',
        'test',
        'teardown',
        'suiteTeardown'
      ];

  //chai has no backtraces in ff
  //this patch will change the error
  //class used to provide real .stack.
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

  window.requireApp = function(url, cb) {
    require(TestUrlResolver.resolve(url), cb);
  };


  /**
   * require's a file from /common/ resources.
   *
   *    requireCommon('vendor/mocha/mocha.js');
   *
   * @param {String} url relative location of file.
   * @param {Function} [callback] optional callback called \
   *                              when resource has been loaded.
   */
  window.requireCommon = function(url, cb) {
    require(Common.url('/common/' + url), cb);
  };

  //template
  requireCommon('test/template.js');

  //load chai
  window.requireCommon('vendor/chai/chai.js', function() {
    chai.Assertion.includeStack = true;
    patchChai(chai.Assertion);
    window.assert = chai.assert;
  });

  //mocha helpers
  window.requireCommon('test/mocha_task.js');
  window.requireCommon('test/mocha_generators.js', function() {
    testMethods.forEach(function(method) {
      testSupport.mochaGenerators.overload(method);
    });
  });

  //url utilities
  window.requireCommon('test/test_url_resolver.js');

}(this));

