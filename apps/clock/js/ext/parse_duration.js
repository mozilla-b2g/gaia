/**
 * parse-duration v0.1.1
 * Released under the MIT License
 * https://github.com/jkroso/parse-duration
 */
define(function(require, exports, module) {

var duration = /(-?\d*\.?\d+(?:e[-+]?\d+)?)\s*([a-zμ]*)/ig

module.exports = parse

/**
 * conversion ratios
 */

parse.nanosecond =
parse.ns = 1 / 1e6

parse.μs =
parse.microsecond = 1 / 1e3

parse.millisecond =
parse.ms = 1

parse.second =
parse.sec =
parse.s = parse.ms * 1000

parse.minute =
parse.min =
parse.m = parse.s * 60

parse.hour =
parse.hr =
parse.h = parse.m * 60

parse.day =
parse.d = parse.h * 24

parse.week =
parse.wk =
parse.w = parse.d * 7

parse.month = parse.d * (365.25 / 12)

parse.year =
parse.yr =
parse.y = parse.d * 365.25

/**
 * convert `str` to ms
 *
 * @param {String} str
 * @return {Number}
 */

function parse(str){
  var result = 0
  // ignore commas
  str = str.replace(/(\d),(\d)/g, '$1$2')
  str.replace(duration, function(_, n, units){
    units = parse[units]
      || parse[units.toLowerCase().replace(/s$/, '')]
      || 1
    result += parseFloat(n, 10) * units
  })
  return result
}

});
