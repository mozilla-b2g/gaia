// these methods are all borrowed from MOUT.js (released under MIT license)
define(function(require, exports) {
'use strict';

// TODO: add MOUT.js as a dependency!!!! this is just a temporary solution

exports.norm = function norm(val, min, max){
  // 0 / 0 === NaN
  if (val === min && min === max) {
    return 1;
  }
  return (val - min) / (max - min);
};

exports.clamp = function clamp(val, min, max) {
  return val < min ? min : (val > max ? max : val);
};

exports.round = function round(value, radix){
  radix = radix || 1; // default round 1
  return Math.round(value / radix) * radix;
};

exports.floor = function floor(val, step) {
  step = Math.abs(step || 1);
  return Math.floor(val / step) * step;
};

exports.ceil = function ceil(val, step) {
  step = Math.abs(step || 1);
  return Math.ceil(val / step) * step;
};

exports.lerp = function lerp(ratio, start, end){
  return start + (end - start) * ratio;
};

exports.debounce = function debounce(fn, threshold, isAsap){
  var timeout, result;
  function debounced(){
    //jshint -W040
    var args = arguments, context = this;
    //jshint +W040
    function delayed(){
      if (! isAsap) {
        result = fn.apply(context, args);
      }
      timeout = null;
    }
    if (timeout) {
      clearTimeout(timeout);
    } else if (isAsap) {
      result = fn.apply(context, args);
    }
    timeout = setTimeout(delayed, threshold);
    return result;
  }
  debounced.cancel = function(){
    clearTimeout(timeout);
  };
  return debounced;
};

exports.throttle = function throttle(fn, delay) {
  var context, timeout, result, args,
    diff,
    prevCall = 0;
  function delayed() {
    prevCall = Date.now();
    timeout = null;
    result = fn.apply(context, args);
  }
  function throttled() {
    //jshint -W040
    context = this;
    //jshint +W040
    args = arguments;
    diff = delay - (Date.now() - prevCall);
    if (diff <= 0) {
      clearTimeout(timeout);
      delayed();
    } else if (!timeout) {
      timeout = setTimeout(delayed, diff);
    }
    return result;
  }
  throttled.cancel = function() {
    clearTimeout(timeout);
  };
  return throttled;
};

});
