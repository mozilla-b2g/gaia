'use strict';

var CallUI={
  
  init:function cm_init(){
    //Add events to our DOM
    document.getElementById('mute').addEventListener('mouseup',OnCallHandler.toggleMute,false);
    document.getElementById('keypad-visibility').addEventListener('mouseup',OnCallHandler.toggleKeypad,false);
    document.getElementById('speaker').addEventListener('mouseup',OnCallHandler.toggleSpeaker,false);
    document.getElementById('co-basic-answer').addEventListener('mouseup',OnCallHandler.answer,false);
    document.getElementById('co-basic-reject').addEventListener('mouseup',OnCallHandler.end,false);
  },
  update:function cm_update(phone_number){
    //Updating phone number in screen
    document.getElementById('cs-h-info-primary').innerHTML=phone_number;
    KeypadManager.phoneNumber = phone_number;
    document.getElementById('phone-number-view').value=KeypadManager.phoneNumber;
    KeypadManager.util.moveCaretToEnd(document.getElementById('phone-number-view'));
  },
  cleanTimer:function cm_cleanTime(){
    //TODO Review this functionality
    clearInterval(CallUI.timer);
  },
  render:function cm_render(layout_type){
    // Method which renders our call screen with different layouts: 
    // 0 Outgoing call before answer
    // 1 Outgoing call after answer
    // 2 Incoming Call
    switch(layout_type){
      case 0:
        document.getElementById('call-duration').innerHTML="...";
        document.getElementById('co-basic-answer').classList.add('hide');
        document.getElementById('co-advanced').classList.remove('transparent');
        document.getElementById('keypad-visibility').setAttribute('disabled','disabled');
        break;
      case 1:
        //TODO Review of using "toggle" despite of "contains"+add/remove
        if(!document.getElementById('co-basic-answer').classList.contains('hide')){
          document.getElementById('co-basic-answer').classList.add('hide');
        }
        if(!document.getElementById('co-basic-answer').classList.contains('transparent')){
          document.getElementById('co-advanced').classList.remove('transparent');
        }

        document.getElementById('keypad-visibility').removeAttribute('disabled');
        document.getElementById('call-duration').innerHTML="00:00";
        
        //TODO Implement this functionality with UX design about how time has to be shown. 
        // Create a method which manage Time in dialer
        // var sec=0;
        // CallUI.timer=setInterval(function(){
        //  sec++;

        //  var minutes=Math.floor(sec/60);
        //  var seconds=sec%60;
        //  if(minutes<10){
        //    minutes='0'+minutes;
        //  }

        //  if(seconds<10){
        //    seconds='0'+seconds;
        //  }

        //  document.getElementById('call-duration').innerHTML=minutes+':'+seconds;
        // },1000);
        
        break;
      case 2:
        document.getElementById('co-basic-answer').classList.remove('hide');
        document.getElementById('co-advanced').classList.add('transparent');
        document.getElementById('call-duration').innerHTML="";
        break;
    }
  },
  ui:{
    show:function cm_show(){
      document.getElementById('call-screen').classList.add('call-screen-show');
    },
    hide:function cm_hide(){
      CallUI.update(KeypadManager.phoneNumber);

      document.getElementById('views').classList.toggle('show');
    }
  }
};

var OnCallHandler = {
  currentCall: null,
  _screenLock: null,
  _ticker: null,
  _displayed: false,

  setup: function och_setup() {
    var hash = document.location.hash;
    var screenClass = hash.slice(1, hash.length);
    this.screen.classList.add(screenClass);

    // Animating the screen in the viewport.
    this.toggleScreen();

    this._screenLock = navigator.requestWakeLock('screen');
    ProximityHandler.enable();

    var self = this;
    var telephony = window.navigator.mozTelephony;
    if (telephony) {
      // Somehow the muted property appears to true after initialization.
      // Set it to false.
      telephony.muted = false;
      telephony.oncallschanged = function och_callsChanged(evt) {
        telephony.calls.forEach(function callIterator(call) {
          self.currentCall = call;
          call.addEventListener('statechange', self);

          //Update UI properly
          CallUI.update(call.number);
          CallUI.render(2);

          self.lookupContact(call.number);

          self.recentsEntry = {
            date: Date.now(),
            type: (screenClass == 'incoming') ?
                   'incoming' : 'outgoing',
            number: call.number
          };
        });
      }
    }
  },

  handleEvent: function och_handleEvent(evt) {
    switch (evt.call.state) {
      case 'connected':
        this.connected();
        break;
      case 'disconnected':
        this.disconnected();
        break;
      default:
        break;
    }
  },

  connected: function ch_connected() {
    // Update UI properly.
    CallUI.render(1);

    this.recentsEntry.type += '-connected';

    /*
    this._ticker = setInterval(function ch_updateTimer(self, startTime) {
      var elapsed = new Date(Date.now() - startTime);
      self.statusView.innerHTML = elapsed.toLocaleFormat('%M:%S');
    }, 1000, this, Date.now());
    */
  },

  disconnected: function ch_disconnected() {

    if (this.currentCall) {
      this.currentCall.removeEventListener('statechange', this);
      this.currentCall = null;
    }

    if (this.muteButton.classList.contains('mute'))
      this.toggleMute();
    if (this.speakerButton.classList.contains('speak'))
      this.toggleSpeaker();

    if (this._ticker)
      clearInterval(this._ticker);

    if (this.recentsEntry) {
      Recents.add(this.recentsEntry);
      this.recentsEntry = null;
    }

    if (this._screenLock) {
      this._screenLock.unlock();
      this._screenLock = null;
    }

    ProximityHandler.disable();

    // Out animation before closing the window
    this.toggleScreen();

  },

  answer: function ch_answer() {
    OnCallHandler.currentCall.answer();
  },

  end: function ch_end() {
    if (OnCallHandler.recentsEntry &&
       (OnCallHandler.recentsEntry.type.indexOf('-connected') == -1)) {
      OnCallHandler.recentsEntry.type += '-refused';
    }

    if (OnCallHandler.currentCall)
      OnCallHandler.currentCall.hangUp();

    // We're not waiting for a disconnected statechange
    // If the user touch the 'end' button we wants to get
    // out of the call-screen right away.
    OnCallHandler.disconnected();

  },

  get screen() {
    delete this.screen;
    return this.screen = document.getElementById('call-screen');
  },

  get numberView() {
    delete this.numberView;
    return this.numberView = document.getElementById('call-number-view');
  },
  get statusView() {
    delete this.statusView;
    return this.statusView = document.getElementById('call-status-view');
  },
  get actionsView() {
    delete this.actionsView;
    return this.actionsView = document.getElementById('call-actions-container');
  },
  get muteButton() {
    delete this.muteButton;
    return this.muteButton = document.getElementById('mute');
  },
  get speakerButton() {
    delete this.speakerButton;
    return this.speakerButton = document.getElementById('speaker');
  },
  get keypadButton() {
    delete this.keypadButton;
    return this.keypadButton = document.getElementById('keypad-visibility');
  },
  get keypadView() {
    delete this.keypadView;
    return this.keypadView = document.getElementById('kb-keypad');
  },
  get keypadCallbarBackAction() {
    delete this.keypadCallbarBackAction;
    return this.keypadCallbarBackAction = document.getElementById('kb-callbar-back-action');
  },

  toggleScreen: function ch_toggleScreen() {

    var callScreen = OnCallHandler.screen;
    callScreen.classList.remove('animate');
    callScreen.classList.toggle('prerender');

    var displayed = OnCallHandler._displayed;
    // hardening against the unavailability of MozAfterPaint
    var finished = false;

    var finishTransition = function ch_finishTransition() {
      if (finished)
        return;

      if (securityTimeout) {
        clearTimeout(securityTimeout);
        securityTimeout = null;
      }

      finished = true;

      window.setTimeout(function cs_transitionNextLoop() {
        callScreen.classList.add('animate');
        callScreen.classList.toggle('displayed');
        callScreen.classList.toggle('prerender');

        callScreen.addEventListener('transitionend', function trWait() {
          callScreen.removeEventListener('transitionend', trWait);

          // We did animate the call screen off the viewport
          // now closing the window.
          if (displayed)
            window.close();
        });
      });
    };

    window.addEventListener('MozAfterPaint', function ch_finishAfterPaint() {
      window.removeEventListener('MozAfterPaint', ch_finishAfterPaint);
      finishTransition();
    });
    var securityTimeout = window.setTimeout(finishTransition, 100);

    OnCallHandler._displayed = !OnCallHandler._displayed;
  },

  toggleMute: function ch_toggleMute() {
    OnCallHandler.muteButton.classList.toggle('mute');
    navigator.mozTelephony.muted = !navigator.mozTelephony.muted;
  },

  toggleKeypad: function ch_toggleKeypad() {

    //Render keyboard properly
    KeypadManager.render(1);
    //Show it hidding call screen
    CallUI.ui.hide();

  },

  toggleSpeaker: function ch_toggleSpeaker() {
    OnCallHandler.speakerButton.classList.toggle('speak');
    navigator.mozTelephony.speakerEnabled = !navigator.mozTelephony.speakerEnabled;
  },

  lookupContact: function och_lookupContact(number) {
    Contacts.findByNumber(number, (function(contact) {
    OnCallHandler.numberView.innerHTML = contact.name;
    }).bind(this));
  },

};

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);
  KeypadManager.init();
  CallUI.init();
  OnCallHandler.setup();
});