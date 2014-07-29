'use strict';

/**
 * Helper for applying methods from a mock to an element in the DOM. This is
 * needed when mocking web components. For instance, we may have to test that
 * some code properly calls into a web component like so:
 *
 * ```html
 * <!-- mock html -->
 * <gaia-web-component id="myWC"></gaia-web-component>
 * ```
 *
 * ```js
 * // code to test
 * var wc = document.getElementById('myWC');
 * wc.foo();
 * ```
 *
 * ```js
 * // test
 * var wc = document.getElementById('myWC');
 * this.sinon.stub(wc, 'foo');
 * // call method that will call foo()
 * sinon.assert.calledOnce(wc.foo);
 * ```
 *
 * This won't work because we aren't importing the actual gaia-web-component
 * component. The solution here is to copy the methods from a mock to the
 * gaia-web-component, like this:
 *
 * ```html
 * <!-- mock html -->
 * <gaia-web-component id="myWC"></gaia-web-component>
 * ```
 *
 * ```js
 * // code to test
 * var wc = document.getElementById('myWC');
 * wc.foo();
 * ```
 *
 * ```js
 * // mock
 * var MockGaiaWebComponent = {
 *   foo: function() {}
 * };
 * ```
 *
 * ```js
 * // test
 *
 * // use MocksHelper to set GaiaWebComponent = MockGaiaWebComponent
 *
 * var customElementsHelperForMyTest =
 *   new CustomElementsHelper(['GaiaWebComponent']);
 * customElementsHelperForMyTest.resolve();
 *
 * // now stub and call it as before
 * ```
 */
var CustomElementsHelper = function(mocks) {
  this.mocks = mocks.sort();
};

CustomElementsHelper.prototype = {
  resolve: function emh_resolve() {
    this.mocks.forEach(function(objName) {
      var eltName = objName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      var matchingElts = document.querySelectorAll(eltName);
      for (var key in window[objName]) {
        for (var i = 0; i < matchingElts.length; i++) {
          matchingElts[i][key] = window[objName][key];
        }
      }
    });
  }
};
