/**
 * Defer is a factory that would create a wrapped Promise object with exposed
 * resolve / reject API so that we can easily resolve / reject promise from
 * outside.
 *
 * This is mostly useful when you are going to queue promises for later use.
 *
 * API:
 * 
 * var defer = Defer();
 * defer.resolve('return value');
 * defer.reject('reason')
 *
 * @module Defer
 */
define(function(require) {
  'use strict';

  var Defer = function() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  };

  return function ctor_defer() {
    return new Defer();
  };
});
