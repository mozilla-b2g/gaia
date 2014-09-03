(function(exports) {
'use strict';

exports.retry = function retry(fn, thisObj, attempts) {
  if (typeof thisObj === 'number') {
    attempts = thisObj;
    thisObj = null;
  }

  if (attempts < 1) {
    var error = new Error();
    error.name = 'RetryError';
    error.msg = 'No success here :(';
    return Promise.reject(error);
  }

  var promise;
  try {
    promise = fn.call(thisObj);
  } catch (err) {
    return Promise.reject(err);
  }

  if (!promise || typeof promise.then !== 'function') {
    return Promise.reject(
      new Error(
        'Calendar.retry takes a function that returns a promise!'
      )
    );
  }

  return promise.then((success) => {
    if (success) {
      return;
    }

    return retry(fn, thisObj, attempts - 1);
  });
};

}(Calendar));
