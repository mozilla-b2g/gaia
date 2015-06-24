define(function(require, exports) {
'use strict';

// note: names should _never_ change (they are persisted in the account and
// calendar databases)
// we need to use l10nID's for backwards compatibility
// (not changing string IDs between releases).
// the `View#showErrors` method prepends a "error-" to all "l10nID"
var ERRORS = {
  'authentication': {
    name: 'authentication',
    l10nID: 'unauthenticated'
  },
  'invalid-server': {
    name: 'invalid-server',
    l10nID: 'internal-server-error'
  },
  'server-failure': {
    name: 'server-failure',
    l10nID: 'internal-server-error'
  },
  // offline is not stored in the database but we keep it here since it might be
  // used in multiple places of the app
  'offline': {
    name: 'offline',
    l10nID: 'offline'
  }
};

/**
 * These errors are _not_ exceptions and are designed to be passed not thrown
 * in typical |throw new X| fashion.
 */
exports.create = function(dataOrId) {
  var data = typeof dataOrId === 'string' ?
    { error: { name: dataOrId, message: dataOrId } } :
    dataOrId;
  var { error, detail } = data;
  var result = {};
  var id = error.name;
  var shouldMap = id in ERRORS;
  result.name = shouldMap ? ERRORS[id].name : id;
  result.l10nID = shouldMap ? ERRORS[id].l10nID : id;
  result.message = `Calendar Error: [${result.name}] ${error.message}`;
  result.detail = detail;
  return result;
};

// Since errors are passed between worker and main thread we can't use
// instanceof checks and should also favor plain objects for serialization
exports.isAuthentication = makeCheck('authentication');
exports.isInvalidServer = makeCheck('invalid-server');
exports.isServerFailure = makeCheck('server-failure');
exports.isUndefinedError = function(err) {
  return !(err.name in ERRORS);
};

function makeCheck(name) {
  return function(err) {
    return err.name === ERRORS[name].name;
  };
}

});
