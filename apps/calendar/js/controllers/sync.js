Calendar.ns('Controllers').Sync = (function() {

  /**
   * Handles all synchronization related
   * tasks. The intent is that this will
   * be the focal point for any view
   * to observe sync events and this
   * controller will decide when to actually
   * tell the stores when to sync.
   */
  function Sync(app) {
    this.app = app;
    Calendar.Responder.call(this);

    this._initEvents();
  }

  Sync.prototype = {
    __proto__: Calendar.Responder.prototype,

    _initEvents: function() {
      var self = this;
      var account = this.app.store('Account');

      // used instead of bind for testing reasons.
      account.on('add', function(id, data) {
        self._syncAccount(id, data);
      });
    },

    _syncAccount: function(id, model) {
      var account = this.app.store('Account');
      account.sync(model, function() {
        //TODO: Eventually trigger sync events.
      });
    }

  };

  return Sync;

}());

