define(function(require, exports, module) {
'use strict';

module.exports = function mochaPromise(mochaFn, description, callback) {
  if (typeof description === 'function') {
    callback = description;
    description = null;
  }

  function execute(done) {
    var promise;
    try {
      promise = callback.call();
    } catch (error) {
      return done(error);
    }

    promise.then(() => done()).catch(done);
  }

  if (description) {
    mochaFn(description, execute);
  } else {
    mochaFn(execute);
  }
};

});
