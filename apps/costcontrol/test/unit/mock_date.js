'use strict';

/*
 * To construct a Date mockup specifying what date to return for "now / today".
 *
 * Use it by replacing Date constructor with that returned by the factory:
 *   window.Date = new MockDateFactory(new window.Date(2012, 0, 1));
 *
 * Subsequents uses of `new Date()` will return January, 1st 2012. Real Date
 * constructor is kept safe in `MockDateFactory.realDate`.
 */
var MockDateFactory = (function(realDate) {

  function buildFakeDateConstructor(now) {
    function FakeDate(year, month, day) {
      if (this instanceof FakeDate) {
        if (arguments.length === 1) {
          return new realDate(year);
        } else if (arguments.length === 3) {
          return new realDate(year, month, day);
        } else if (typeof now !== 'undefined') {
          return new realDate(now);
        } else {
          return new realDate();
        }

      } else {
        return realDate.apply(this, arguments);
      }
    };
    return FakeDate;
  }
  buildFakeDateConstructor.realDate = realDate;

  return buildFakeDateConstructor;

}(this.Date));
