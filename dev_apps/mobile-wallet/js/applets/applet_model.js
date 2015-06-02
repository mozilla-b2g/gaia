'use strict';

/* globals SEUtils, TAG */
/* exported AppletModel, AppletListModel */

(function(exports) {
  // TODO decide how to store data in the app
  var AppletModel = function(id, aid, state){
    this.id = id;
    this.aid = SEUtils.byteToHexString(aid);
    this.lifecycleState = state[0];
    this.contactlessState = state[1];
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
    },

    get selected() {
      return this.contactlessState === 1;
    },

    get imgId() {
      return this.aid;
    }
  };

  var AppletListModel = function(appletsData, filter) {
    if(appletsData) {
      this.updateList(appletsData, filter);
    }
  };

  AppletListModel.prototype = {
    applets: [],

    updateList: function alm_updateList(appletsData, filter) {
      var parsedApplets = this._parseAppletList(appletsData);
      parsedApplets = (!filter) ? parsedApplets : parsedApplets.filter(filter);

      // now we create AppletModel objects and store them in the list
      var refreshed = [];
      parsedApplets.forEach((appl, idx) => {
        var aidHex = SEUtils.byteToHexString(appl.aid);
        var nAppl = this.getAppletByHexAID(aidHex);
        if(nAppl) {
          nAppl.state = appl.state;
        } else {
          nAppl = new AppletModel('appl'+idx, appl.aid, appl.state);
        }

        refreshed.push(nAppl);
      });

      this.applets = refreshed;
    },

    getAppletByID: function alm_getAppletByID(id) {
      return this.applets.find((applet) => applet.id === id);
    },

    getAppletByHexAID: function alm_getAppletByHexAID(aid) {
      return this.applets.find((applet) => applet.aid === aid);
    },

    _parseAppletList: function alm_parseAppletList(data) {
      var list = [];
      for(var i = 0, len = data.length; i < len;) {
        if(data[i] === TAG.CRS.APP_TEMPLATE) {
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
}((typeof exports === 'undefined') ? window : exports));
