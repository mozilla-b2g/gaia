/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var CostControl = {
  init: function cc_init() {
    console.log("---- Cost control init -----");
    //For USSD (TopUp)
    if (navigator.mozMobileConnection) {
      this.conn = navigator.mozMobileConnection;
      this.conn.addEventListener('ussdreceived', this);
    }
    //For SMS (Cost)
    if (navigator.mozSms) {
      this.sms = navigator.mozSms;
      this.sms.addEventListener('sent', this);
    }
    //For calls
    if (navigator.mozTelephony) {
      this.telephony = navigator.mozTelephony;
      this.telephony.addEventListener('callschanged', this);
    }
    //Show a fake (saved) balance to the user and update it
    this.feedback = new Array(document.getElementById("cost-control-date"),
                           document.getElementById("cost-control-container"));
    this.getInitialBalance();
    this.checkNowButton = document.getElementById("cost-control-check-now");
    this.checkNowButton.addEventListener('click', (function() {
      this.updateBalance();
    }).bind(this));
  },

  handleEvent: function cc_handleEvent(evt) {
    console.log(evt.type);
    switch (evt.type) {
      case 'ussdreceived':
        this.toppedUp(evt);
        break;
      case 'received':
      case 'sent':
        this.updatedBalance(evt);
        break;
      case 'callschanged':
        console.log(this.telephony.calls);
        this.telephony.calls.forEach((function (call) {
          if (call.state === "disconnected") {
            this.updateBalance();
          }
          console.log("Estado de la llamada: " + call.state);
        }).bind(this));
        break;
    }
  },

  getInitialBalance: function() {
    console.log("Getting initial balance");
    this.balanceText = document.getElementById("cost-control-spent");
    this.dateText = document.getElementById("cost-control-date");
    this.updateBalance();
  },

  updateBalance: function() {
    console.log("Sending SMS to get balance");
    this.updateUI(true);
    //Fake TODO
    this.sms.send("669961186", "Tu saldo es de 27.34€, gracias por confiar en Vivo");
    //We listen for the sms a prudential time, then, we just skip any received sms
    this.timeout = window.setTimeout((function() {
      console.log("Removing listener for incoming balance check SMS");
      this.sms.removeEventListener('received', this);
      this.updateUI(false, 0);
    }).bind(this), 1000*60*5); //5 minutes of wait for a message
    this.sms.addEventListener('received', this);
  },

  updatedBalance: function(evt) {
    //Remove the timeout and the listener
    //console.log(message.message.(id, body, delivery, read, receiver, sender, timestamp);
    console.log(evt.message.body);
    window.clearTimeout(this.timeout);
    this.sms.removeEventListener('received', this);
    var receivedBalance = this._parseSMS(evt.message.body);
    console.log(receivedBalance);
    this.saveBalance(receivedBalance);
    this.updateUI(false, receivedBalance);
  },

  _parseSMS: function(body) {
    var regex = new RegExp("[0-9]+.[0-9]+");
    var m = regex.exec(body);
    if (m !== null) {
      return m;
    }
    return null;
  },

  updateUI: function(waiting, balance) {
    if (waiting) {
      console.log("Updating UI, we are waiting for cost control SMS");
      this.dateText.innerHTML = this.getSavedDate();
      this.balanceText.innerHTML = parseFloat(this.getSavedBalance()).toFixed(2);
    } else {
      console.log("Updating UI, we have the cost control SMS or timeout ");
      var date = new Date();
      var d = date.getDate() + "/" + (date.getMonth()+1) + " " + this._pad(date.getHours()) + ":" + this._pad(date.getMinutes());
      this.dateText.innerHTML = d;
      var bal = parseFloat(balance) || this.getSavedBalance();
      this.balanceText.innerHTML = parseFloat(bal).toFixed(2);
      this.feedback.forEach(function(el) {
        console.log("Mostrando feedback con color rosita");
        el.setAttribute("class", 'updated');
      });
      window.setTimeout((function() {
        console.log("Eliminando feedback rosita");
        this.feedback.forEach(function(el) {
          el.setAttribute("class", 'not-updated');
        });
      }).bind(this), 10000);
    }
  },

  getSavedBalance: function() {
    return parseFloat(window.localStorage.getItem("balance")).toFixed(2);
  },

  getSavedDate: function() {
    return window.localStorage.getItem("date");
  },

  saveBalance: function(balance) {
    console.log("Saving date and balance to the localStorage");
    var date = new Date();
    var d = date.getDate() + "/" + (date.getMonth()+1) + " " + this._pad(date.getHours()) + ":" + this._pad(date.getMinutes());
    window.localStorage.setItem("balance", parseFloat(balance).toFixed(2));
    window.localStorage.setItem("date", d);
  },

  topUp: function() {
    alert("TopUp!!");
  },

  toppedUp: function() {
    //TODO
  },

  _pad: function(num) {
    var s = num + "";
    while (s.length < 2) s = "0" + s;
    return s;
  }
};

CostControl.init();
