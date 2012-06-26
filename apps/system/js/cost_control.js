/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var CostControl = {
  init: function cc_init() {
    //For USSD (TopUp)
    this.conn = window.navigator.mozMobileConnection;
    //For SMS (Cost)
    this.sms = window.navigator.mozSms;
    //Show a fake (saved) balance to the user
    this.getInitialBalance();
    //And update it
    this.updateBalance();
    //this.waitingUpdate = false;
  },

  addListener: function() {
    conn.addEventListener('ussdreceived', this);
  },

  removeListener: function() {
    conn.removeEventListener('ussdreceived', this);
  },

  handleEvent: function cc_handleEvent(evt) {
    switch (evt.type) {
      console.log(evt.type);
      case 'ussdreceived':
        this.toppedUp(evt);
        break;
      case 'received':
        this.updatedBalance(evt);
    }
  },

  getInitialBalance: function() {
    this.getSavedBalance();
    this.updateBalance();
    //ussdreceived
    //cancelussd()
  },

  updateBalance: function() {
    //Send USSD to check
    //Listen USSD message
    //this.cost= result from ussd;
    this.waitingBalance = true;
    window.clearTimeout(this.timeout);
    var result = sms.send("*5000", "");
    //We need to check for errors
    result.onerror = function() {
      console.log("There was an error sending the check balance SMS!!");
      this.removeListener('received', this);
    }.bind(this);
    //We listen for the sms a prudential time, then, we just skip any received sms
    this.timeout = window.setTimeout(function() {
      this.removeListener('received', this);
    }, 15000). bind(this); //FIXME, seconds to wait
    saveCost(cost);
    this.removeListener();
  },
  updatedBalance: function(message) {
    console.log("-- SMS -- Evt: " + message);
    console.log("-- SMS -- Evt.type: " + message.type);
    window.clearTimeout(this.timeout);
    //Fake
    var parsedBalance = getSavedBalance() + 3.2;
    saveBalance(parsedBalance);
    this.updateUI(false);
  },

  updateUI: function(waiting) {
    //TODO
    if (waiting) {
      this.waitingBalance = true;
    } else {
      this.waitingBalance = false;
    }
  },

  getSavedBalance: function() {
    return window.localStorage.getItem("balance");
  },

  saveBalance: function(balance) {
    window.localStorage.setItem("balance", balance);
  },

  topUp: function() {
    //TODO
  }
};

CostControl.init();
