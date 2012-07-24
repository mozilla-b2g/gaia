/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var CostControl = {

  REQUEST_BALANCE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  REQUEST_BALANCE_UPDATE_INTERVAL: 1 * 60 * 60 * 1000, // 1 hour

  // Enable observers for the basic parameters of the cost control
  configure: function cc_configure() {
    var self = this;

    function assignTo(name) {
      return function assign_to(value) {
        self[name] = value;
        console.log(name + ': ' + self[name]);
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
      '(R\\$\\s+[0-9]+[,\\.][0-9]+)',
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
      '(R\\$\\s+[0-9]+[,\\.][0-9]+)',
      assignTo('TOP_UP_CONFIRMATION_REGEXP'));
  },

  // Attach event listeners for automatic updates:
  //  * After calling
  //  * After sending a message
  //  * Periodically
  configureEventListeners: function cc_configureEventListeners() {
    var periodicallyUpdateEvent =
      new CustomEvent('costcontrolPeriodicallyUpdate');

    // Listen for SMS
    if (window.navigator.mozSms) {
      this.sms = window.navigator.mozSms;
      this.sms.addEventListener('sent', this);
    }

    // Listen to ending calls
    if (window.navigator.mozTelephony) {
      this.telephony = window.navigator.mozTelephony;
      this.telephony.addEventListener('callschanged', this);
    }

    // Periodically update
    this.widget.addEventListener('costcontrolPeriodicallyUpdate', this);
    window.setInterval((function cc_periodicUpdateBalance() {
      this.widget.dispatchEvent(periodicallyUpdateEvent);
    }).bind(this), this.REQUEST_BALANCE_UPDATE_INTERVAL);
  },

  // Attach event listeners for manual updates
  configureWidget: function cc_configureWidget() {
    console.log('---- Configuring widget -----');
    this.widget = document.getElementById('cost-control');
    this.widgetCredit = document.getElementById('cost-control-credit');
    this.widgetTime = document.getElementById('cost-control-time');

    // Listener for check now button
    this.checkNowBalanceButton = document.getElementById('cost-control-credit-area');
    this.checkNowBalanceButton.addEventListener(
      'click',
      (function() {
        if (!this.isWaiting)
          this.mockup_updateBalance();
      }).bind(this)
    );

    // Listener for top up button
    this.topUpButton = document.getElementById('cost-control-topup');
    this.topUpButton.addEventListener('click', (function() {
      var _ = navigator.mozL10n.get;
      ModalDialog.prompt(
        _('Enter the top up code:') + '\n' +
        _('Typically found in the scratch card or directly in your receipt.'),
        '000002',
        this.mockup_topUp.bind(this)
      );
    }).bind(this));
  },

  // Initializes the cost control module: basic parameters, autmatic and manual
  // updates.
  init: function cc_init() {
    console.log('---- Cost control init -----');
    this.configure();
    this.configureWidget();
    this.configureEventListeners();
    this.updateUI();

    // Show the saved balance while we update it
    this.feedback = new Array(document.getElementById('cost-control-time'),
                               document.getElementById('cost-control-credit'));

    this.updateUI();
  },

  // Return true if the device is in roaming
  inRoaming: function cc_inRoaming() {
    var conn = window.navigator.mozMobileConnection;
    var voice = conn.voice;
    return voice.roaming;
  },

  // Handle the events that triggers automatic balance updates
  handleEvent: function cc_handleEvent(evt) {

    // Ignore if the device is in roaming
    if (inRoaming()) {
      console.warn('Device in roaming, no automatic updates allowed');
      return;
    }

    console.log('Evento escuchado: ' + evt.type);
    switch (evt.type) {

      // Periodically updates
      case 'costcontrolPeriodicallyUpdate':

      // After sending a message
      case 'sent':
        this.mockup_updateBalance();
        break;

      // After ending a call
      case 'callschanged':
        //Test this. Issue 2
        console.log("Calls array " + this.telephony.calls.length);
        for (var i = 0, call; call = this.telephony.calls[i]; i++) {
          console.log('Estado de la llamada: ' + call.state);
          if (call.state === 'disconnected')
            this.mockup_updateBalance();
        };
        break;
    }
  },

  // Enable / disable waiting mode for the interface
  setWaitingMode: function cc_setWaitingMode(waiting) {
    this.isWaiting = waiting;
    if (waiting)
      this.widget.classList.add('updating');
    else
      this.widget.classList.remove('updating');
  },

  mockup_updateBalance: function cc_mockup_updateBalance() {
    var self = this;

    // Return the balance from the message or null if impossible to parse
    function parseBalanceSMS(message) {
      var newBalance = null;
      var found = message.body.match(new RegExp(self.CHECK_BALANCE_REGEXP));
      console.log('body: '+ message.body);
      console.log('regexp: '+ self.CHECK_BALANCE_REGEXP);
      console.log('found: ' + found);

      // Impossible parse
      if (!found || !found[1]) {
        console.warn('Impossible to parse balance message.')

      // Parsing succsess
      } else {
        newBalance = found[1];
      }

      return newBalance;
    }

    // What happend when the a SMS is received
    function onSMSReceived(evt) {
      // Ignore messages from other senders
      var message = evt.message;
      if (message.sender !== '800268'/*self.CHECK_BALANCE_SENDERS*/)
        return;

      stopWaiting();

      var newBalance = parseBalanceSMS(message);
      console.log('balance: '+newBalance);
      self.updateUI(newBalance);
    }

    // Disable processing SMS
    function stopWaiting() {
      window.clearTimeout(self.balanceTimeout);
      self.setWaitingMode(false);
      self.sms.removeEventListener('received', onSMSReceived);
    }

    // Send the request SMS
    // XXX: Uncomment after removing mockups
    /*var result = this.sms.send(
      this.CHECK_BALANCE_DESTINATION,
      this.CHECK_BALANCE_TEXT
    );*/

    // Wait for the balance SMS
    this.setWaitingMode(true);
    this.sms.addEventListener('received', onSMSReceived);
    this.balanceTimeout = window.setTimeout(
      stopWaiting,
      this.REQUEST_BALANCE_TIMEOUT
    );

    // Mockup to emulate SMS reception
    window.setTimeout((function() {
      var currentCredit = parseFloat(this.feedback[1].textContent.slice(2));
      var newCredit = Math.max(0, currentCredit - 2);
      newCredit = Math.round(newCredit * 100)/100;
      this.sms.send('+34638358467', 'R$ ' + newCredit);
    }).bind(this), 3500);
  },

  updateUI: function cc_updateUI(balance) {
    if (balance) {
      var now = new Date();
      var datestring = now.toLocaleFormat('%A, %H:%M');
      window.localStorage.setItem('costcontrolDate', datestring);
      window.localStorage.setItem('costcontrolBalance', balance);
    }

    this.widgetCredit.textContent = this.getSavedBalance();
    this.widgetTime.textContent = this.getSavedDate();
  },

  getSavedBalance: function cc_getSavedBalance() {
    return window.localStorage.getItem('costcontrolBalance') || 'R$12.34';
  },

  getSavedDate: function cc_getSavedDate() {
    return window.localStorage.getItem('costcontrolDate') || 'Today';
  },

  _getFormatedDate: function(date) {
    //XXX: Bug in Gecko. Check with Kaze. Issue 5
    return date.toLocaleFormat('%b %d %H:%M');
  },

  mockup_topUp: function cc_mockup_topUp(howMuch) {
    if (!howMuch)
      return;

    // Introduce errors

    // 

    var currentCredit = parseFloat(this.feedback[1].textContent);
    var newCredit = currentCredit + parseInt(howMuch);
    if (newCredit >= 2)
      this.widget.classList.remove('low-credit');
    newCredit = Math.round(newCredit * 100)/100;
    this.feedback[1].textContent = newCredit + 'R$';
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
