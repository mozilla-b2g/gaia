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
          home.cardManager.insertCard(activity.source.data);
          break;
      }
    }
  };
  MessageHandler.init();
  exports.MessageHandler = MessageHandler;
})(window);
