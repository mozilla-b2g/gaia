/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var CostControl = {
  init: function cc_init() {
    console.log("---- Cost control init -----");
    //For USSD (TopUp)
    this.conn = window.navigator.mozMobileConnection;
    //For SMS (Cost)
    this.sms = window.navigator.mozSms;
    //Show a fake (saved) balance to the user
    this.getInitialBalance();
    //And update it
    this.updateBalance();
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
        this.updatedBalance(evt);
        break;
    }
  },

  getInitialBalance: function() {
    this.balanceText = document.getElementById("cost-control-spent");
    this.dateText = document.getElementById("cost-control-date");
    this.balanceText.innerHTML = this.getSavedBalance();
    this.dateText.innerHMLT = this.getSavedDate();
    this.updateBalance();
  },

  updateBalance: function() {
    console.log("Sending SMS to get balance");
    this.updateUI(true);
    window.clearTimeout(this.timeout);
    //Fake TODO
    this.sms.send("690243624", "mensaje para pedir saldo");
    //We listen for the sms a prudential time, then, we just skip any received sms
    this.timeout = window.setTimeout((function() {
      console.log("Removing listener for incoming balance check SMS");
      this.sms.removeEventListener('received', this);
      this.updateUI(false);
    }).bind(this), 1500); //FIXME, milliseconds to wait
    this.sms.addEventListener('received', this);
  },
  updatedBalance: function(message) {
    console.log("-- SMS -- Evt: " + message);
    console.log("-- SMS -- Evt.type: " + message.type);
    window.clearTimeout(this.timeout);
    //Fake
    var parsedBalance = this.getSavedBalance() + 3.2;
    this.saveBalance(parsedBalance);
    this.updateUI(false);
  },

  updateUI: function(waiting) {
    //TODO
    if (waiting) {
      this.waitingBalance = true;
      this.dateText.innerHTML = this.getSavedDate();
      this.balanceText.innerHTML = this.getSavedBalance() + "--refreshing";
    } else {
      this.dateText.innerHTML = this.dateText();
      this.balanceText.innerHTML = this.getSavedBalance();
      this.waitingBalance = false;
    }
  },

  getSavedBalance: function() {
    return window.localStorage.getItem("balance");
  },

  getSavedDate: function() {
    return window.localStorage.getItem("date");
  },

  saveBalance: function(balance) {
    var date = new Date();
    var d = date.getDate() + "/" + date.getMonth() + "/" + date.getYear() + " at " + date.getHours() + ":" + date.getMinutes();
    window.localStorage.setItem("balance", balance);
    window.localStorage.setItem("date", d);
  },

  topUp: function() {
    //TODO
  }
};

CostControl.init();
