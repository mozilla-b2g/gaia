'use strict';
module.exports = function(val) {
  val = String(val);
  while (val.length < 2) {
    val = '0' + val;
  }
  return val;
};
