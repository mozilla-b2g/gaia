'use strict';

/* global ConnectionManager */

(function(exports) {

  /**
   * MessageHandler handles all incoming messages which includes both
   * [IAC](http://mzl.la/1TKR6zw) and [MozActivity](http://mzl.la/1Pu8ecc).
   * This class relies on {@link ConnectionManager} to monitor incoming `unpin`
   * message on [IAC](http://mzl.la/1TKR6zw).
   *
   * @class MessageHandler
   * @requires {@link ConnectionManager}
   * @requires {@link Home}
   */
  var MessageHandler = function() {
    this.isStop = false;
    this.activityQueue = [];
  };

  MessageHandler.prototype = {
    _connectionManager: undefined,

    _home: undefined,

    /**
     * Initialize MessageHandler
     * @public
     * @method  MessageHandler#init
     */
    init: function cm_init(home) {
      this._home = home;
      navigator.mozSetMessageHandler(
                                    'activity', this.handleActivity.bind(this));
      this._connectionManager = new ConnectionManager();
      this._connectionManager.init(['iac-appdeck-channel']);
      this._connectionManager.on('unpin', this.unpin.bind(this));
    },

    /**
     * Pin card of `cardEntry`
     * @public
     * @method  MessageHandler#pin
     * @param {Object} cardEntry - cardEntry representing the card
     * @param {String} cardEntry.type - valid values are 'Application', 'Deck',
     *                                and 'Folder'
     * @param {String} cardEntry.group - valud values are 'tv', 'application',
     *                                 'device', and 'dashboard'
     * @param {String} cardEntry.manifestURL - manifestURL, if the card
     *                                       represent an app or a deck
     * @param {String} cardEntry.launchURL - optional
     * @param {Blob} cardEntry.thumnail - see [blob](http://mzl.la/1BRI7IV)
     */
    pin: function mh_pin(cardEntry) {
      this._home.cardManager.insertCard({
        cardEntry: cardEntry
      });
    },

    /**
     * Unpin card
     * @public
     * @method  MessageHandler#unpin
     * @param  {Object} data
     * @param  {String} data.manifestURL - manifestURL of the unpinned app
     * @param  {String} data.launchURL - optional
     */
    unpin: function mh_unpin(data) {
      var home = this._home;
      // XXX: this is extra step, we should remove this step once we were
      // done fixing and refactoring cardManager.removeCard.
      // The reason we need this step here is because cardManager.removeCard
      // only accept card instance as sole parameter.
      var card = home.cardManager.findCardFromCardList(data);
      home.cardManager.removeCard(card);
    },

    handleActivity: function mh_handleActivity(activity) {
      if(this.isStop) {
        this.activityQueue.push(activity);
        return;
      }
      this._digestActivity(activity);
    },

    /**
     * Stop from processing activity in activityQueue. The reason we need this
     * is that we don't need to do pinning when smart-home is not visible.
     *
     * @public
     * @method  MessageHandler#stopActivity
     */
    stopActivity: function mh_stopActivity() {
      this.isStop = true;
    },

    _digestActivity: function(activity) {
      var name = activity.source.name;
      switch(name) {
        case 'pin':
          this.pin(activity.source.data);
          break;
      }
    },

    /**
     * Resume processing activity in activityQueue. We could call this method to
     * continue processing pinning when smart-home is visible.
     *
     * @public
     * @method  MessageHandler#resumeActivity
     */
    resumeActivity: function mh_resumeActivity() {
      this.isStop = false;
      if (this.activityQueue.length === 0) {
        return false;
      }

      var activity;
      while(this.activityQueue.length > 0) {
        activity = this.activityQueue.pop();
        this._digestActivity(activity);
      }
      return true;
    }
  };

  exports.MessageHandler = MessageHandler;
})(window);
