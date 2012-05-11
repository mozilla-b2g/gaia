/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

if (!owd.settings.app.net3G) {
  (function(doc) {
    'use strict';

    /** DOM element for enabling the use of 3G data **/
    var use3G_checkbox;

    /** DOM element for enabling the use of roaming **/
    var useRoaming_checkbox;

    /** DOM element for starting the saving of settings **/
    var saveSettings_button;

    /** DOM element to keep the APN value **/
    var apn_input;

    /** DOM element to keep the USER value **/
    var user_input;

    /** DOM element to keep the PASSWORD value **/
    var password_input;

    /** DOM element containing the list of specific preferences for 3G **/
    var pref_list;

    window.addEventListener("DOMContentLoaded", function(evt) {
      saveSettings_button = doc.querySelector("#saveSettings3G");
      use3G_checkbox = doc.querySelector("#enableData");
      useRoaming_checkbox = doc.querySelector("#enableRoaming");
      apn_input = doc.querySelector("#apn");
      user_input = doc.querySelector("#user");
      password_input = doc.querySelector("#passwd");
      pref_list = doc.querySelector("#pref3g-list");
    });

    var settings = window.navigator.mozSettings;

    var settingsToSave = { };

    owd.settings.app.net3G = {
      // API not related to the UI
      saveSettings3G : function(evt) {
        var dataCallSettings = [{"ril.data.roaming.enabled":
                                  useRoaming_checkbox.checked},
                                {"ril.data.apn":
                                  apn_input.value},
                                {"ril.data.user":
                                  user_input.value},
                                {"ril.data.passwd":
                                  password_input.value}];
        var lock = settings.getLock();
        dataCallSettings.forEach(function(obj) {
          var req = lock.set(obj);
          req.onsuccess = function () {
            console.log("Setting " + obj + " saved.");
          };
          req.onerror = function () {
            console.log("Error while saving " + obj + " settings");
          };
        });

        var obj = {"ril.data.enabled" : use3G_checkbox.checked};
        var req = lock.set(obj);
        req.onsuccess = function () {
          console.log("Setting " + obj + " saved.");
        };
        req.onerror = function () {
          console.log("Error while saving " + obj + " settings");
        };

        console.log(JSON.stringify(settingsToSave));
        owd.messaging.info("Settings saved");
      },
    };

    owd.settings.app.net3G.ui = {
     /*
      * This function is executed when the application shows this card
      */
      prefetch : function() {
        // LOAD SAVED SETTINGS
        console.log("Trying to load saved settings");
        var lock = settings.getLock();

        console.log("Reading 3G USE");
        var reqData = lock.get('ril.data.enabled');
        reqData.onsuccess = function() {
          console.log("DATA SUCCESS");
          var data = reqData.result['ril.data.enabled'];
          if (typeof data !== "undefined"){
            use3G_checkbox.checked = data;
          }
          console.log("Data = "+data);
          toggleDisabled(pref_list,!data);
        };
        reqData.onerror = function() {
          console.log("DATA ERROR");
        };

        console.log("Reading ROAMING USE");
        var reqRoaming = lock.get('ril.data.roaming.enabled');
        reqRoaming.onsuccess = function(){
          console.log("ROAMING SUCCESS");
          var roaming = reqRoaming.result['ril.data.roaming.enabled'];
          if (typeof roaming !== "undefined")
            useRoaming_checkbox.checked = roaming;
          console.log("Roaming = "+roaming);
        };
        reqRoaming.onerror = function(){
          console.log("ROAMING ERROR");
        };

        console.log("Reading APN");
        var reqApn = lock.get('ril.data.apn');
        reqApn.onsuccess = function(){
          console.log("APN SUCCESS");
          var apn = reqApn.result['ril.data.apn'];
          if (typeof apn !== "undefined")
            apn_input.value = apn;
        };
        reqApn.onerror = function(){
          console.log("APN ERROR");
          apn_input.value = "Not found";
        };

        console.log("Reading USER");
        var reqUser = lock.get('ril.data.user');
        reqUser.onsuccess = function(){
          var user = reqUser.result['ril.data.user'];
          if (typeof user !== "undefined")
            user_input.value = user;

          console.log("USER SUCCESS");
        };
        reqUser.onerror = function(){
          user_input.value = "Not found";
          console.log("USER ERROR");
        };

        console.log("Reading PASSWORD");
        var reqPasswd = lock.get('ril.data.passwd');
        reqPasswd.onsuccess = function(){
          var passwd = reqPasswd.result['ril.data.passwd'];
          if (typeof passwd !== "undefined")
            password_input.value = passwd;
          console.log("PASSWD SUCCESS");
        };
        reqPasswd.onerror = function(){
          password_input.value = "Not found";
          console.log("PASSWD ERROR");
        };

      },

      /** switches the use of 3g data. Enables the inputs for the specific settings **/
      enableData : function(evt) {
        owd.messaging.showSpinner();
        console.log("3G is "+(evt.target.checked?"ON":"OFF"));
        toggleDisabled(pref_list, !evt.target.checked);
        setTimeout("owd.messaging.hideSpinner()",600);
      },

      /** switches the use of 3g data **/
      enableRoaming : function(evt) {
        //owd.messaging.error("Roaming is not available yet"); // just testing messages
        console.log("Roaming is "+(evt.target.checked?"ON":"OFF"));
      }
    };

  })(document);

   // utility functions

  function toggleDisabled(el, value) {
    try {
      el.disabled = value;
    }
    catch(E){
      console.log("Error enabling element "+el);
    }
    if (el.childNodes && el.childNodes.length > 0) {
      for (var x = 0; x < el.childNodes.length; x++) {
        toggleDisabled(el.childNodes[x],value);
      }
    }
  };
}
