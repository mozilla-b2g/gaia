// Handles all synchronization related tasks. The intent is that exports will be
// the focal point for any view to observe sync events and exports controller
// will decide when to actually tell the stores when to sync.
define(function(require, exports, module) {
'use strict';

var Responder = require('common/responder');
var accountsService = require('./accounts');
var calendarsService = require('./calendars');
var co = require('ext/co');
var isOffline = require('common/is_offline');

exports = module.exports = new Responder();

exports.pending = 0;

function incrementPending() {
  if (!exports.pending) {
    exports.emit('syncStart');
  }

  exports.pending++;
}

function resolvePending() {
  if (!(--exports.pending)) {
    exports.emit('syncComplete');
  }

  if (exports.pending < 0) {
    dump('\n\n Error calendar sync .pending is < 0 \n\n');
  }
}

/**
 * Sync all accounts, calendars, events.
 * There is no callback for all intentionally.
 *
 * Use:
 *
 *    controller.once('syncComplete', cb);
 *
 */
exports.all = co.wrap(function *(callback) {
  // exports is for backwards compatibility... in reality we should remove
  // callbacks from .all.
  if (callback) {
    exports.once('syncComplete', callback);
  }

  if (isOffline()) {
    exports.emit('syncOffline');
    exports.emit('syncComplete');
    return;
  }

  var accounts = yield accountsService.all();
  accounts = accounts.map(a => a.account);
  var syncs = accounts.map(exports._account, exports);

  // If we have nothing to sync
  if (!exports.pending) {
    exports.emit('syncComplete');
  }

  return yield syncs;
});

/**
 * Initiates a sync for a single calendar.
 *
 * @param {Object} account parent of calendar.
 * @param {Object} calendar specific calendar to sync.
 */
exports.calendar = co.wrap(function *(account, calendar) {
  incrementPending();
  try {
    yield calendarsService.sync(account, calendar);
    resolvePending();
  } catch(err) {
    resolvePending();
    return handleError(err);
  }
});

/**
 * Initiates a sync of a single account and all
 * associated calendars (calendars that exist after
 * the full sync of the account itself).
 *
 * @param {Object} account sync target.
*/
exports._account = co.wrap(function *(account) {
  incrementPending();

  try {
    // need to sync the account first in case the calendar list changed
    yield accountsService.sync(account);

    var calendars = yield accountsService.getCalendars(account._id);
    // wait for all the calendars to be synced
    yield calendars.map(calendar => {
      return exports.calendar(account, calendar);
    });

    resolvePending();
  } catch (err) {
    resolvePending();
    return handleError(err);
  }
});

/**
 * Private helper for choosing how to dispatch errors.
 * When given a callback the callback will be called otherwise the error
 * controller will be invoked.
 */
function handleError(err) {
  // we need to reject the promise but we should also emit an event because
  // there might be errors in multiple accounts and frontend might be
  // listening/handling all the syncErrors
  exports.emit('syncError', err);
  return Promise.reject(err);
}

});
