define(function(require, exports) {
'use strict';

var co = require('ext/co');
var core = require('core');
var nextTick = require('common/next_tick');
var object = require('common/object');

exports.persist = co.wrap(function *(model) {
  var storeFactory = core.storeFactory;
  var accountStore = storeFactory.get('Account');
  var calendarStore = storeFactory.get('Calendar');

  // begin by persisting the account
  var [, result] = yield accountStore.verifyAndPersist(model);

  // finally sync the account so when
  // we exit the request the user actually
  // has some calendars. This should not take
  // too long (compared to event sync).
  yield accountStore.sync(result);

  // begin sync of calendars
  var calendars = yield calendarStore.remotesByAccount(result._id);

  // note we don't wait for any of this to complete
  // we just begin the sync and let the event handlers
  // on the sync controller do the work.
  for (var key in calendars) {
    core.syncController.calendar(
      result,
      calendars[key]
    );
  }

  return result;
});

exports.get = function(id) {
  var accountStore = core.storeFactory.get('Account');
  return accountStore.get(id);
};

exports.remove = function(id) {
  var accountStore = core.storeFactory.get('Account');
  return accountStore.remove(id);
};

exports.observe = function(stream) {
  var accountStore = core.storeFactory.get('Account');

  var getAllAndWrite = co.wrap(function *() {
    try {
      var accounts = yield accountStore.all();
      var data = object.map(accounts, (id, account) => {
        return {
          account: account,
          provider: core.providerFactory.get(account.providerType)
        };
      });
      stream.write(data);
    } catch(err) {
      console.error(`Error fetching accounts: ${err.message}`);
    }
  });

  accountStore.on('add', getAllAndWrite);
  accountStore.on('remove', getAllAndWrite);
  accountStore.on('update', getAllAndWrite);

  stream.cancel = function() {
    accountStore.off('add', getAllAndWrite);
    accountStore.off('remove', getAllAndWrite);
    accountStore.off('update', getAllAndWrite);
  };

  nextTick(getAllAndWrite);
};

/**
 * Returns a list of available presets filtered by
 * the currently used presets in the database.
 * (can't create multiple local calendars)
 */
exports.availablePresets = function(presetList) {
  var accountStore = core.storeFactory.get('Account');
  return accountStore.availablePresets(presetList);
};

});
