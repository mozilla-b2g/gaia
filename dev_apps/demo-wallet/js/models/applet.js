'use strict';

/* globals SEUtils, TAG */
/* exported AppletModel, AppletListModel */

(function(exports) {
  // TODO decide how to store data in the app
  var AppletModel = function(id, aid, state){
    this.id = id;
    this.aid = SEUtils.byteToHexString(aid);
    this.lifecycleState = SEUtils.byteToHexString(state.subarray(0,1));
    this.contactlessState = SEUtils.byteToHexString(state.subarray(1));
  };

  AppletModel.prototype = {
    // id in view
    id: null,
    aid: null,
    lifecycleState: null,
    contactlessState: null,

    set state(value) {
      this.lifecycleState = value[0];
      this.contactlessState = value[1];
    }
  };

  var AppletListModel = function(appletsData, filter) {
    this.updateList(appletsData, filter);
  };

  AppletListModel.prototype = {
    applets: [],

    updateList: function alm_updateList(appletsData, filter) {
      var parsedApplets = this._parseAppletList(appletsData);
      parsedApplets = (!filter) ? parsedApplets : parsedApplets.filter(filter);

      this.applets = [];
      // now we create AppletModel objects and store them in the list
      // TODO consider storing in IndexDB or PouchDB
      parsedApplets.forEach((appl, idx) => {
        this.applets.push(new AppletModel('appl'+idx, appl.aid, appl.state));
      });
    },

    getAppletByID: function alm_getAppletByID(id) {
      return this.applets.find((applet) => applet.id === id);
    },

    getAppletByHexAID: function alm_getAppletByHexAID(aid) {
      return this.applets.find((applet) => applet.aid === aid);
    },

    getAppletByByteAID: function alm_getAppletByByteAID(aid) {
      return this.getAppletByByteAID(SEUtils.byteToHexString(aid));
    },

    _parseAppletList: function alm_parseAppletList(data) {
      var list = [];
      for(var i = 0, len = data.length; i < len;) {
        if(data[i] === 0x61) {
          var end = i+2 + data[i+1];
          var appletData = data.subarray(i+2, end);
          var applet = this._parseApplet(appletData);

          if(applet) {
            list.push(applet);
          }
          i = end;
        }
      }

      return list;
    },

    _parseApplet: function alm_parseApplet(data) {
      if (data[0] === TAG.CRS.AID) {
        var applet = {
          aid: data.subarray(2, 2 + data[1]),
          state: data.subarray(data[1] + 5)
        };
        return applet;
      }
    },
  };

  exports.AppletModel = AppletModel;
  exports.AppletListModel = AppletListModel;
}(window));