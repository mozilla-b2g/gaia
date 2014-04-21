// put stuff here to help your tests out...

(function(window) {
  // register the global
  window.navigator;

  var htmlFragments;
  var requestedFragments = {};

  var Common = window.parent.CommonResourceLoader,
      // mocha test methods we want to provide
      // yield support to.
      testMethods = [
        'suiteSetup',
        'setup',
        'test',
        'teardown',
        'suiteTeardown'
      ];

  // chai has no backtraces in ff
  // this patch will change the error
  // class used to provide real .stack.
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

  window.requireApp = function(url, cb, options) {
    require(TestUrlResolver.resolve(url), cb, options);
  };

  /**
   * Appends a templated node to the body for a suite
   * Removes the node at teardown.
   * @param {String} is the type of element.
   * @param {Object} attrs optional attributes.
   */
  window.suiteTemplate = function(is, attrs) {

    var testElement;

    setup(function ta_template() {
      var foundElement = htmlFragments.querySelector('element[name="' + is + '"]');
      testElement = document.createElement(foundElement.getAttribute('extends') || 'div');
      var template = foundElement.querySelector('template');
      testElement.innerHTML = template.innerHTML;

      attrs = attrs || {};
      for (var i in attrs) {
        testElement.setAttribute(i, attrs[i]);
      }

      document.body.appendChild(testElement);
    });

    teardown(function ta_teardown() {
      testElement.parentNode.removeChild(testElement);
    });
  };

  window.requireElements = function(url) {

    url = TestUrlResolver.resolve(url);

    if (requestedFragments[url]) {
      return;
    }
    requestedFragments[url] = true;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false /* intentional sync */);
    xhr.send();

    if (!htmlFragments) {
      htmlFragments = document.createElement('div');
    }
    htmlFragments.innerHTML += xhr.responseText;
  };


  /**
   * Require a file from /common/ resources.
   *
   * Usage: requireCommon('vendor/mocha/mocha.js');
   *
   * @param {String} url relative location of file.
   * @param {Function} cb optional callback called
   *                      when resource has been loaded.
   */
  window.requireCommon = function(url, cb) {
    require(Common.url('/common/' + url), cb);
  };

  // template
  requireCommon('test/template.js');

  // load chai
  window.requireCommon('vendor/chai/chai.js', function() {
    chai.Assertion.includeStack = true;
    patchChai(chai.Assertion);
    window.assert = chai.assert;
  });

  // mocha helpers
  window.requireCommon('test/mocha_task.js');
  window.requireCommon('test/mocha_generators.js', function() {
    testMethods.forEach(function(method) {
      testSupport.mochaGenerators.overload(method);
    });
  });

  // url utilities
  window.requireCommon('test/test_url_resolver.js');

}(this));

