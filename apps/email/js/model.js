/*global define, console */

define(function(require) {
  var evt = require('evt');

  function dieOnFatalError(msg) {
    console.error('FATAL:', msg);
    throw new Error(msg);
  }

  var model = {
    firstRun: null,

    acctsSlice: null,
    account: null,

    foldersSlice: null,
    folder: null,

    _callEmit: function(id) {
      this.emitWhenListener(id, this[id]);
    },

    // Indicates if the model has been inited.
    inited: false,

    // Returns true if there is an account. Should only be
    // called after inited is true.
    hasAccount: function() {
      return !!(model.acctsSlice &&
                model.acctsSlice.items &&
                model.acctsSlice.items.length);
    },

    init: function(showLatest) {
      // Set inited to false to indicate initialization is in progress.
      this.inited = false;

      require(['api'], function(MailAPI) {
        this.api = MailAPI;

        if (this.firstRun) {
          this.firstRun(MailAPI);
          this.firstRun = null;
        }

        if (this.acctsSlice)
          this.acctsSlice.die();

        var acctsSlice = this.acctsSlice = MailAPI.viewAccounts(false);
        acctsSlice.oncomplete = (function() {
          if (acctsSlice.items.length) {
            // For now, just use the first one; we do attempt to put unified
            // first so this should generally do the right thing.
            // XXX: Because we don't have unified account now, we should
            //      switch to the latest account which user just added.
            var account = showLatest ? acctsSlice.items.slice(-1)[0] :
                                       acctsSlice.defaultAccount;

            this.account = account;
            this._callEmit('account');

            var foldersSlice = MailAPI.viewFolders('account', account);
            foldersSlice.oncomplete = (function() {
              // Do not bother if accounts do not have an inbox.
              var inboxFolder = foldersSlice.getFirstFolderWithType('inbox');
              if (!inboxFolder)
                dieOnFatalError('We have an account without an inbox!',
                                foldersSlice.items);

              this.foldersSlice = foldersSlice;
              this.folder = inboxFolder;

              this._callEmit('folder');
              this._callEmit('foldersSlice');
            }).bind(this);
          } else {
            this.die();
          }
          this.inited = true;
          this._callEmit('acctsSlice');
        }).bind(this);
      }.bind(this));
    },

    die: function() {
      if (this.acctsSlice)
        this.acctsSlice.die();
      this.acctsSlice = null;
      this.account = null;

      if (this.foldersSlice)
        this.foldersSlice.die();
      this.foldersSlice = null;

      this.folder = null;
    }
  };

  return evt.mix(model);
});
