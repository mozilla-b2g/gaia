'use strict';

(function(exports) {

  var MessageHandler = {
    init: function cm_init() {
      navigator.mozSetMessageHandler(
                                    'activity', this.handleActivity.bind(this));
    },

    handleActivity: function mh_handleActivity(activity) {
      var name = activity.source.name;
      switch(name) {
        case 'pin':
          home.cardManager.insertCard({
            cardEntry: activity.source.data
          });
          break;
        case 'unpin':
          // XXX: this is extra step, we should remove this step once we were
          // done fixing and refactoring cardManager.removeCard.
          // The reason we need this step here is because we only accept
          // card instance as parameter when we call removeCard.
          var card = home.cardManager.findCardFromCardList({
            manifestURL: activity.source.data.manifestURL,
            launchURL: activity.source.data.launchURL
          });
          home.cardManager.removeCard(card);
          break;
      }
    }
  };
  MessageHandler.init();
  exports.MessageHandler = MessageHandler;
})(window);
