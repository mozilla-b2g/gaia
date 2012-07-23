/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var CostControl = {

  REQUEST_BALANCE_TIMEOUT: 5 * 60 * 1000,

  configure: function cc_configure() {
    var self = this;

    function assignTo(name) {
      return function assign_to(value) {
        self[name] = value;
        console.log(name + ': ' + value);
      }
    }

    // For balance
    // Send to...
    SettingsListener.observe('costcontrol.balance.destination', '8000',
      assignTo('CHECK_BALANCE_DESTINATION'));

    // Text to send
    SettingsListener.observe('costcontrol.balance.text', '',
      assignTo('CHECK_BALANCE_TEXT'));

    // Wait from...
    SettingsListener.observe('costcontrol.balance.senders', '1515',
      assignTo('CHECK_BALANCE_SENDERS'));

    // Parse following...
    SettingsListener.observe('costcontrol.balance.regexp',
      '(R\$ [0-9]+,[0-9]+)',
      assignTo('CHECK_BALANCE_REGEXP'));

    // For top up
    // Send to...
    SettingsListener.observe('costcontrol.topup.destination', '7000',
      assignTo('TOP_UP_SEND_NUMBER'));

    // Balance text
    SettingsListener.observe('costcontrol.topup.text', '&code',
      assignTo('TOP_UP_TEXT'));

    // Wait from...
    SettingsListener.observe('costcontrol.topup.senders', '1515',
      assignTo('TOP_UP_RECEIVE_NUMBER'));

    // Parse confirmation following...
    SettingsListener.observe('costcontrol.topup.regexp',
      '(R\$ [0-9]+,[0-9]+)',
      assignTo('TOP_UP_CONFIRMATION_REGEXP'));
  },

  init: function cc_init() {
    this.configure();
/*
    //If we don't have the sender in the variant, just hide the module
    if (!this.CHECK_BALANCE_DESTINATION) {
      document.getElementById("cost-control").style.display = 'none';
      return;
    }
    console.log('---- Cost control init -----');
    //For USSD (TopUp)
    if (window.navigator.mozMobileConnection) {
      this.conn = window.navigator.mozMobileConnection;
      this.conn.addEventListener('ussdreceived', this);
    }
    //For SMS (Cost)
    if (window.navigator.mozSms) {
      this.sms = window.navigator.mozSms;
      this.sms.addEventListener('sent', this);
    }
    //For calls
    if (window.navigator.mozTelephony) {
      this.telephony = window.navigator.mozTelephony;
      this.telephony.addEventListener('callschanged', this);
    }
*/
    //Show the saved balance while we update it
    this.feedback = new Array(document.getElementById('cost-control-time'),
                             document.getElementById('cost-control-credit'));
//    this.getInitialBalance();


    // Widget
    this.widget = document.getElementById('cost-control');

    //Listener for check now button
    this.checkNowBalanceButton = document.getElementById('cost-control-credit-area');
    this.checkNowBalanceButton.addEventListener('click', (function() {
      // this.updateBalance();
      this.mockup_updateBalance();
    }).bind(this));

    //Listener for Top up button
    var _ = navigator.mozL10n.get;
    this.topUpButton = document.getElementById('cost-control-topup');
    this.topUpButton.addEventListener('click', (function() {
      // this.topUp();
      ModalDialog.prompt(
        _('Enter the top up code:\ntypically found in the scratch ' +
        'card or directly in your receipt.'),
        '000002',
        this.mockup_topUp.bind(this)
      );
    }).bind(this));
  },

  inRoaming: function cc_inRoaming() {
    var conn = window.navigator.mozMobileConnection;
    var voice = conn.voice;
    return voice.roaming;
  },

  handleEvent: function cc_handleEvent(evt) {
    console.log('Evento escuchado: ' + evt.type);
    switch (evt.type) {
      case 'ussdreceived':
        this.toppedUp(evt);
        break;
      case 'received':
      case 'sent':
        this.updatedBalance(evt);
        break;
      case 'callschanged':
        //Test this. Issue 2
        console.log("Calls array " + this.telephony.calls.length);
        this.telephony.calls.forEach((function(call) {
          if (call.state === 'disconnected') {
            this.updateBalance();
          }
          console.log('Estado de la llamada: ' + call.state);
        }).bind(this));
        break;
    }
  },

  getInitialBalance: function cc_getInitialBalance() {
    this.balanceText = document.getElementById('cost-control-spent');
    this.dateText = document.getElementById('cost-control-date');
    if (!this.conn.voice.connected) {
      console.log("No conectado, ponemos listener para esperar red");
      this.conn.removeEventListener('voicechange', this.getInitialBalance);
      this.conn.addEventListener('voicechange', this.getInitialBalance);
      this.updateUI(false, 0);
      return;
    }
    console.log('Conectado, quitamos listener de espera de red');
    this.conn.removeEventListener('voicechange', this.getInitialBalance);
    console.log('Getting initial balance');
    this.updateBalance();
  },

  mockup_updateBalance: function cc_mockup_updateBalance() {
    var currentCredit = parseFloat(this.feedback[1].textContent);
    var newCredit = Math.max(0, currentCredit - 2);
    this.widget.classList.add('updating');
    window.setTimeout((function() {
      newCredit = Math.round(newCredit * 100)/100;
      this.feedback[1].textContent = newCredit + 'R$';
      if (newCredit < 2)
        this.widget.classList.add('low-credit');
      this.widget.classList.remove('updating');
    }).bind(this), 3500);
  },

  updateBalance: function cc_updateBalance() {
    console.log('Sending SMS to get balance');
    this.updateUI(true);
    this.sms.send(this.CHECK_BALANCE_DESTINATION, this.CHECK_BALANCE_TEXT);
    //We listen for the SMS a prudential time, then, we just skip any SMS
    this.timeout = window.setTimeout((function() {
      console.log('Removing listener for incoming balance check SMS');
      this.sms.removeEventListener('received', this);
      this.updateUI(false, 0);
    }).bind(this), this.REQUEST_BALANCE_TIMEOUT); // 5min waiting
    this.sms.addEventListener('received', this);
  },

  updatedBalance: function cc_updatedBalance(evt) {
    var receivedBalance = this._parseSMS(evt.message);
    if (receivedBalance !== null) {
      this.saveBalance(receivedBalance);
      this.updateUI(false, receivedBalance);
      this.sms.removeEventListener('received', this);
      window.clearTimeout(this.timeout);
    }
  },

  _parseSMS: function(message) {
    //Checking sender. Not cheking type (number vs string)
    if(evt.message.sender != this.CHECK_BALANCE_SENDERS) return null;
    //Regexp, should be on the variant? Issue 6
    var regex = new RegExp('[0-9]+.[0-9]+');
    var m = regex.exec(message.body);
    if (m !== null) {
      return m;
    }
    return null;
  },

  updateUI: function cc_updateUI(waiting, balance) {
    if (waiting) {
      console.log('Updating UI, we are waiting for cost control SMS');
      this.dateText.innerHTML = this.getSavedDate();
      this.balanceText.innerHTML =
                        parseFloat(this.getSavedBalance()).toFixed(2);
    } else {
      console.log('Updating UI, we have the cost control SMS or timeout ');
      this.dateText.innerHTML = this.getSavedDate();
      var bal = parseFloat(balance) || this.getSavedBalance();
      this.balanceText.innerHTML = parseFloat(bal).toFixed(2);
      console.log('Mostrando feedback con color rosita');
      this.feedback.forEach(function(el) {
        el.setAttribute('class', 'updated');
      });
      window.setTimeout((function() {
        console.log('Eliminando feedback rosita');
        this.feedback.forEach(function(el) {
          el.setAttribute('class', 'not-updated');
        });
      }).bind(this), 10000);
    }
  },

  getSavedBalance: function cc_getSavedBalance() {
    var balance = parseFloat(window.localStorage.getItem('balance'));
    if (isNaN(balance) || balance === null) {
      return 0;
    }
    return balance.toFixed(2);
  },

  getSavedDate: function cc_getSavedDate() {
    var date = window.localStorage.getItem('date');
    if (isNaN(date) || date === null) {
       var date2 = new Date();
       return this._getFormatedDate(date2);
    }
    return this._getFormatedDate(date);
  },

  _getFormatedDate: function(date) {
    //XXX: Bug in Gecko. Check with Kaze. Issue 5
    return date.toLocaleFormat('%b %d %H:%M');
  },

  saveBalance: function cc_saveBalance(balance) {
    console.log('Saving date and balance to the localStorage for later use');
    var date = new Date();
    window.localStorage.setItem('balance', parseFloat(balance).toFixed(2));
    window.localStorage.setItem('date', date.getTime());
  },

  mockup_topUp: function cc_mockup_topUp(howMuch) {
    if (!howMuch)
      return;

    var currentCredit = parseFloat(this.feedback[1].textContent);
    var newCredit = currentCredit + parseInt(howMuch);
    if (newCredit >= 2)
      this.widget.classList.remove('low-credit');
    newCredit = Math.round(newCredit * 100)/100;
    this.feedback[1].textContent = newCredit + 'R$';
  },

  topUp: function cc_topUp() {
    //TODO
    alert('TopUp!!');
  },

  toppedUp: function cc_toppedUP() {
    //TODO
  },

  _pad: function(num) {
    var s = num + '';
    while (s.length < 2) s = '0' + s;
    return s;
  }
};

console.log('Initializing!!!');
CostControl.init();
