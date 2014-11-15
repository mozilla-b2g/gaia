'use strict';

(function(exports) {

  var MessageHandler = {
    pinToCardElem: document.getElementById('pin-to-card'),
    init: function cm_init() {
      navigator.mozSetMessageHandler(
                                    'activity', this.handleActivity.bind(this));
    },

    handleActivity: function mh_handleActivity(activity) {
      var name = activity.source.name;
      switch(name) {
        case 'pin':
          home.cardManager.insertCard(activity.source.data);
          break;
      }
    },

    pinToCard: function cm_pinToCard(data) {
      alert(data.manifestURL);
    }
  };
  MessageHandler.init();
  exports.MessageHandler = MessageHandler;
})(window);
