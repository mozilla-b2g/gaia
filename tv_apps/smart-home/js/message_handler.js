'use strict';

/* global ConnectionManager */

(function(exports) {

  // XXX: Notice that the module has dependency on `home` instance. We should
  // remove this dependency once we refactor this singleton module into
  // instantiable module
  var MessageHandler = {
    _connectionManager: undefined,

    init: function cm_init() {
      navigator.mozSetMessageHandler(
                                    'activity', this.handleActivity.bind(this));
      this._connectionManager = new ConnectionManager();
      this._connectionManager.init(['iac-appdeck-channel']);
      this._connectionManager.on('unpin', this.unpin.bind(this));
    },

    pin: function mh_pin(cardEntry) {
      home.cardManager.insertCard({
        cardEntry: cardEntry
      });
    },

    unpin: function mh_unpin(data) {
      // XXX: this is extra step, we should remove this step once we were
      // done fixing and refactoring cardManager.removeCard.
      // The reason we need this step here is because cardManager.removeCard
      // only accept card instance as sole parameter.
      var card = home.cardManager.findCardFromCardList(data);
      home.cardManager.removeCard(card);
    },

    handleActivity: function mh_handleActivity(activity) {
      var name = activity.source.name;
      switch(name) {
        case 'pin':
          this.pin(activity.source.data);
          break;
      }
    }
  };

  MessageHandler.init();
  exports.MessageHandler = MessageHandler;
})(window);
