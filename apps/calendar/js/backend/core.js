define(function(require, exports, module) {
'use strict';

// this module is a "temporary" solution for all the circular dependencies
// that we have on the calendar app at the moment. we inject all the
// dependencies since stores, providers and db are tight coupled.
// the plan is to not rely on the "app" namespace since we are splitting the
// code into "backend" (worker) and "frontend" (main thread)

exports.db = null;
exports.providerFactory = null;
exports.storeFactory = null;

});
