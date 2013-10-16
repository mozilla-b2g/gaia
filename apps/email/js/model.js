/*global define, console */

define(function(require) {
  var evt = require('evt');

  function dieOnFatalError(msg) {
    console.error('FATAL:', msg);
    throw new Error(msg);
  }

/**
 * Provides a front end to the API and slice objects returned from the API.
 * Since the UI right now is driven by a shared set of slices, this module
 * tracks those slices and creates events when they are changed. This means
 * the card modules do not need a direct reference to each other to change
 * the backing data for a card, and that card modules and app logic do not
 * need a hard, static dependency on the MailAPI object. This allows some
 * more flexible and decoupled loading scenarios. In particular, cards can
 * be created an inserted into the DOM without needing the back end to
 * complete its startup and initialization.
 *
 * It mixes in 'evt' capabilities, so it will be common to see model
 * used with 'latest' and 'latestOnce' to get the latest model data
 * whenever it loads.
 *
 * Down the road, it may make sense to have more than one model object
 * in play. At that point, it may make sense to morph this into a
 * constructor function and then have the card objects receive a model
 * instance property for their model reference.
 *
 * @type {Object}
 */
  var model = {
    firstRun: null,

    /**
    * acctsSlice event is fired when the property changes.
    * event: acctsSlice
    * @param {Object} the acctsSlice object.
    **/
    acctsSlice: null,

    /**
    * account event is fired when the property changes.
    * event: account
    * @param {Object} the account object.
    **/
    account: null,

    /**
    * foldersSlice event is fired when the property changes.
    * event: foldersSlice
    * @param {Object} the foldersSlice object.
    **/
    foldersSlice: null,

    /**
    * folder event is fired when the property changes.
    * event: folder
    * @param {Object} the folder object.
    **/
    folder: null,

    _callEmit: function(id) {
      this.emitWhenListener(id, this[id]);
    },

    inited: false,

    /**
     * Returns true if there is an account. Should only be
     * called after inited is true.
     */
    hasAccount: function() {
      return (model.getAccountCount() > 0);
    },

    /**
     * Given an account ID, get the account object. Only works once the
     * acctsSlice property is available. Use model.latestOnce to get a
     * handle on an acctsSlice property, then call this method.
     * @param  {String} id account ID.
     * @return {Object}    account object.
     */
    getAccount: function(id) {
      if (!model.acctsSlice || !model.acctsSlice.items)
        throw new Error('No acctsSlice available');

      var targetAccount;
      model.acctsSlice.items.some(function(account) {
        if (account.id === id)
          return !!(targetAccount = account);
      });

      return targetAccount;
    },

    /**
     * Get the numbers of configured account.
     * Should only be called after this.inited is true.
     * @return {Number} numbers of account.
     */
    getAccountCount: function() {
      var count = 0;

      if (model.acctsSlice &&
          model.acctsSlice.items &&
          model.acctsSlice.items.length) {
        count = model.acctsSlice.items.length;
      }

      return count;
    },

    /**
     * Call this to initialize the model. It can be called more than once
     * per the lifetime of an app. The usual use case for multiple calls
     * is when a new account has been added.
     * @param  {boolean} showLatest Choose the latest account in the
     * acctsSlice. Otherwise it choose the account marked as the default
     * account.
     */
    init: function(showLatest, callback) {
      // Set inited to false to indicate initialization is in progress.
      this.inited = false;
      require(['api'], function(MailAPI) {
        if (!this.api) {
          this.api = MailAPI;
          this._callEmit('api', this.api);
        }

        // If already initialized before, clear out previous state.
        this.die();

        var acctsSlice = this.acctsSlice = MailAPI.viewAccounts(false);
        acctsSlice.oncomplete = (function() {
          if (acctsSlice.items.length) {
            // For now, just use the first one; we do attempt to put unified
            // first so this should generally do the right thing.
            // XXX: Because we don't have unified account now, we should
            //      switch to the latest account which user just added.
            var account = showLatest ? acctsSlice.items.slice(-1)[0] :
                                       acctsSlice.defaultAccount;

            this.changeAccount(account, callback);
          }

          this.inited = true;
          this._callEmit('acctsSlice');
        }).bind(this);
      }.bind(this));
    },

    /**
     * Changes the current account tracked by the model. This results
     * in changes to the 'account', 'foldersSlice' and 'folder' properties.
     * @param  {Object}   account  the account object.
     * @param  {Function} callback function to call once the account and
     * related folder data has changed.
     */
    changeAccount: function(account, callback) {
      // Do not bother if account is the same.
      if (this.account && this.account.id === account.id) {
        if (callback)
          callback();
        return;
      }

      this._dieFolders();

      this.account = account;
      this._callEmit('account');

      var foldersSlice = this.api.viewFolders('account', account);
      foldersSlice.oncomplete = (function() {
        this.foldersSlice = foldersSlice;
        this.selectInbox(callback);
        this._callEmit('foldersSlice');
      }).bind(this);
    },

    /**
     * Given an account ID, change the current account to that account.
     * @param  {String} accountId
     * @return {Function} callback
     */
    changeAccountFromId: function(accountId, callback) {
      if (!this.acctsSlice || !this.acctsSlice.items.length)
        throw new Error('No accounts available');

      this.acctsSlice.items.some(function(account) {
        if (account.id === accountId) {
          this.changeAccount(account, callback);
          return true;
        }
      }.bind(this));
    },

    /**
     * Just changes the folder property tracked by the model.
     * Assumes the folder still belongs to the currently tracked
     * account.
     * @param  {Object} folder the folder object to use.
     */
    changeFolder: function(folder) {
      this.folder = folder;
      this._callEmit('folder');
    },

    /**
     * For the already loaded account and associated foldersSlice,
     * set the inbox as the tracked 'folder'.
     * @param  {Function} callback function called once the inbox
     * has been selected.
     */
    selectInbox: function(callback) {
      if (!this.foldersSlice)
        throw new Error('No foldersSlice available');

      var inboxFolder = this.foldersSlice.getFirstFolderWithType('inbox');
      if (!inboxFolder)
        dieOnFatalError('We have an account without an inbox!',
                        this.foldersSlice.items);

      if (this.folder && this.folder.id === inboxFolder.id) {
        if (callback)
          callback();
      } else {
        if (callback)
          this.once('folder', callback);

        this.changeFolder(inboxFolder);
      }
    },

    /**
     * Called by other code when it knows the current account
     * has received new inbox messages. Just triggers an
     * event with the count for now.
     * @param  {Object} accountUpdate update object from
     * sync.js accountResults object structure.
     */
    notifyInboxMessages: function(accountUpdate) {
      if (accountUpdate.id === this.account.id)
        model.emit('newInboxMessages', accountUpdate.count);
    },

    _dieFolders: function() {
      if (this.foldersSlice)
        this.foldersSlice.die();
      this.foldersSlice = null;

      this.folder = null;
    },

    die: function() {
      if (this.acctsSlice)
        this.acctsSlice.die();
      this.acctsSlice = null;
      this.account = null;

      this._dieFolders();
    }
  };

  return evt.mix(model);
});
