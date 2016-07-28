/**
 *
 **/

define(
  [
    './worker-router',
    'exports'
  ],
  function(
    $router,
    exports
  ) {
'use strict';

var sendMessage = $router.registerCallbackType('maildb');

function MailDB(testOptions) {
  this._callbacksQueue = [];
  function processQueue() {
    console.log('main thread reports DB ready');
    this._ready = true;

    this._callbacksQueue.forEach(function executeCallback(cb) {
      cb();
    });
    this._callbacksQueue = null;
  }

  sendMessage('open', [testOptions], processQueue.bind(this));
}
exports.MailDB = MailDB;
MailDB.prototype = {
  close: function() {
    sendMessage('close');
  },

  getConfig: function(callback) {
    if (!this._ready) {
      console.log('deferring getConfig call until ready');
      this._callbacksQueue.push(this.getConfig.bind(this, callback));
      return;
    }

    console.log('issuing getConfig call to main thread');
    sendMessage('getConfig', null, callback);
  },

  saveConfig: function(config) {
    sendMessage('saveConfig', [config]);
  },

  saveAccountDef: function(config, accountDef, folderInfo, callback) {
    sendMessage('saveAccountDef', [ config, accountDef, folderInfo ], callback);
  },

  loadHeaderBlock: function(folderId, blockId, callback) {
    sendMessage('loadHeaderBlock', [ folderId, blockId], callback);
  },

  loadBodyBlock: function(folderId, blockId, callback) {
    sendMessage('loadBodyBlock', [ folderId, blockId], callback);
  },

  saveAccountFolderStates: function(accountId, folderInfo, perFolderStuff,
                                    deletedFolderIds, callback, reuseTrans) {
    var args = [ accountId, folderInfo, perFolderStuff, deletedFolderIds ];
    sendMessage('saveAccountFolderStates', args, callback);
    // XXX vn Does this deserve any purpose?
    return null;
  },

  deleteAccount: function(accountId) {
    sendMessage('deleteAccount', [accountId]);
  },
};

}); // end define
