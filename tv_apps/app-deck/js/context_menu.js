'use strict';

/* global MozActivity, Applications */
/* jshint nonew: false */

(function(exports) {


  /**
   * It handles everything related to contextmenu in app-deck.
   *
   * @class ContextMenu
   * @requires Applications
   * @requires SharedUtils
   */
  var ContextMenu = function() {
  };

  ContextMenu.prototype = {
    pinToHomeElem: document.getElementById('pin-to-home'),
    unpinFromHomeElem: document.getElementById('unpin-from-home'),
    mainSection: document.getElementById('main-section'),
    removeElem: document.getElementById('remove-card'),
    contextMenuElem: document.getElementById('context-menu'),

    _appDeck: undefined,
    _target: {},


    /**
     * Initialize ContextMenu
     *
     * @public
     * @method  ContextMenu#init
     * @param  {AppDeck} appDeck - instance of {@link AppDeck}
     */
    init: function cm_init(appDeck) {
      this._appDeck = appDeck;
      this._appDeck.on('focus', this.onFocus.bind(this));

      this.pinToHomeElem.addEventListener('click', this.pinOrUnpin.bind(this));
      this.unpinFromHomeElem.addEventListener(
                                          'click', this.pinOrUnpin.bind(this));

      this.removeElem.addEventListener('click', this.onRemove.bind(this));
    },

    _selfApp: undefined,

    /**
     * Underlying function which actual send string message on 'appdeck-channel'
     *
     * @private
     * @method  ContextMenu#_connectAndSend
     * @param  {String} message - the message which will be sent on
     *                          'appdeck-channel'
     */
    _connectAndSend: function cm_sendMessage(message) {
      this._selfApp.connect('appdeck-channel').then(function (ports) {
        ports.forEach(function(port) {
          port.postMessage(message);
        });
      });
    },

    /**
     * Send message on 'appdeck-channel' using Inter-App Communication.
     * smart-home will monitor this channel. Currently we use this channel to
     * tell smart-home to what app we would like to unpin.
     *
     * @public
     * @method  ContextMenu#sendMessage
     * @param  {String} type - message type, which must be 'unpin' for now.
     * @param  {Object} data - message data in JSON object format
     */
    sendMessage: function cm_sendMessage(type, data) {
      var that = this;
      var message = {
        type: type,
        data: data
      };

      if (this._selfApp) {
        this._connectAndSend(message);
      } else {
        navigator.mozApps.getSelf().onsuccess = function(evt) {
          that._selfApp = evt.target.result;
          that._connectAndSend(message);
        };
      }
    },

    /**
     * Shorthand function to derive launchURL from [app](http://mzl.la/1DJP6oZ)
     * instance
     *
     * @private
     * @method ContextMenu#_composeLaunchURL
     * @param  {DOMApplication} app - see [here](http://mzl.la/1DJP6oZ)
     * @return {String}  launchURL
     */
    _composeLaunchURL: function cm_composeLaunchURL(app) {
      return app.manifestURL.replace('manifest.webapp', '') + app.entryPoint;
    },

    /**
     * To tell smart-home what app we would like to unpin
     *
     * @private
     * @method  ContextMetnu#_sendUnpinMessage
     * @param  {DOMApplication} app - the [app](http://mzl.la/1DJP6oZ) we'd like
     *                              to unpin from Home
     */
    _sendUnpinMessage: function cm_sendUnpinMessage(app) {
      // Notice that here we didn't specify launchURL because we assume all
      // 'Application' in app-deck are launched by calling app.launch().
      // However, in the case of other deck-like app, if we are going to pin
      // application which is launched by different launchURL, we must specify
      // 'launchURL' here.
      this.sendMessage('unpin', {
        manifestURL: app.manifestURL
      });
    },

    /**
     * Based on currently focused SmartButton, we'll decide we are going to
     * pin or unpin the app. This function is invoked when we get 'click' event
     * on pinToHomeElem. Notice that we use `MozActivity` to pin app because we
     * want to bring users to Home when they finish pinning. However we unpin
     * app via IAC because we want users stay in AppDeck after unpinning.
     *
     * @public
     * @method  ContextMenu#pinOrUnpin
     */
    pinOrUnpin: function cm_pinOrUnpin() {
      var app = this._target;
      if (app.pinned) {
        this._sendUnpinMessage(app);
      } else {
        // XXX: preferredSize should be determined by
        // real offsetWidth of cardThumbnailElem in smart-home instead of
        // hard-coded value
        Applications.getIconBlob(app.manifestURL, app.entryPoint, 354, blob => {
          // Notice that here we didn't specify launchURL because we assume
          // all 'Application' in app-deck are launched by calling
          // app.launch().
          // However, in the case of other deck-like app, if we are going to
          // pin application which is launched by different launchURL, we
          // must specify 'launchURL' here.
          new MozActivity({
            name: 'pin',
            data: {
              type: 'Application',
              group: 'application',
              manifestURL: app.manifestURL,
              // We use app's original icon instead of screenshot here
              // because we are in app deck. For the case of getting
              // screenshot, please refer to bug 1100238.
              thumbnail: blob
            }
          });
        });
      }
    },

    onRemove: function cm_onRemove() {
      if (this._target.type === 'app') {
        this.uninstall(this._target);

      } else if (this._target.type === 'bookmark') {
        this._appDeck._bookmarkManager.remove(this._target.url);

      }
    },

    /**
     * Uninstall app represented by current focused SmartButton
     * @public
     * @method  ContextMenu#uninstall
     */
    uninstall: function cm_uninstall(app) {
      // unpin app before uninstall it
      if (app.pinned) {
        this._sendUnpinMessage(app);
      }
      var appInstance = Applications.installedApps[app.manifestURL];
      if (appInstance) {
        navigator.mozApps.mgmt.uninstall(appInstance);
      }
    },

    onFocus: function cm_onFocus(detail) {
      this._target = detail;

      this.contextMenuElem.innerHTML = '';
      if (detail.type === 'app') {
        if (detail.pinned) {
          this.contextMenuElem.appendChild(this.unpinFromHomeElem);
        } else {
          this.contextMenuElem.appendChild(this.pinToHomeElem);
        }
      }

      if (detail.removable === false) {
        this.contextMenuElem.removeChild(this.removeElem);
      } else {
        this.contextMenuElem.appendChild(this.removeElem);
      }
    }
  };

  exports.ContextMenu = ContextMenu;
})(window);
