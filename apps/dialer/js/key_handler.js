'use strict';

var kFontStep = 4;
var kMinFontSize = 12;

// Frequencies comming from http://en.wikipedia.org/wiki/Telephone_keypad
var gTonesFrequencies = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

var TonePlayer = {
  _sampleRate: 4000,

  init: function tp_init() {
   this._audio = new Audio();
   this._audio.mozSetup(2, this._sampleRate);
  },

  generateFrames: function tp_generateFrames(soundData, freqRow, freqCol) {
    var currentSoundSample = 0;
    var kr = 2 * Math.PI * freqRow / this._sampleRate;
    var kc = 2 * Math.PI * freqCol / this._sampleRate;
    for (var i = 0; i < soundData.length; i += 2) {
      var smoother = 0.5 + (Math.sin((i * Math.PI) / soundData.length)) / 2;

      soundData[i] = Math.sin(kr * currentSoundSample) * smoother;
      soundData[i + 1] = Math.sin(kc * currentSoundSample) * smoother;

      currentSoundSample++;
    }
  },

  play: function tp_play(frequencies) {
    var soundDataSize = this._sampleRate / 4;
    var soundData = new Float32Array(soundDataSize);
    this.generateFrames(soundData, frequencies[0], frequencies[1]);
    this._audio.mozWriteAudio(soundData);
  }
};

var KeypadManager = {
  
  phoneNumber:'',
  init: function kh_init() {

    //Clean previous values in phone number
    document.getElementById('phone-number-view').value = '';
    KeypadManager.phoneNumber='';

    // Add listeners
    document.getElementById('kb-keypad').addEventListener('mousedown',this.keyHandler,true);
    document.getElementById('kb-keypad').addEventListener('mouseup',this.keyHandler,true);
    
    document.getElementById('kb-callbar-add-contact').addEventListener('mouseup',this.addContact,false);
    document.getElementById('kb-callbar-call-action').addEventListener('mouseup',this.makeCall,false);
    document.getElementById('kb-delete').addEventListener('mousedown',this.deleteDigit,false);
    document.getElementById('kb-delete').addEventListener('mouseup',this.deleteDigit,false);
    document.getElementById('kb-callbar-back-action').addEventListener('mouseup', this.callbarBackAction,false);

    //Start Player of sounds in dialer
    TonePlayer.init();

    //Update UI properly
    this.render(0);
  },
  util:{
    //Method which manage caret to last position
    moveCaretToEnd:function hk_util_moveCaretToEnd(el) {
        if (typeof el.selectionStart == "number") {
            el.selectionStart = el.selectionEnd = el.value.length;
        } else if (typeof el.createTextRange != "undefined") {
            el.focus();
            var range = el.createTextRange();
            range.collapse(false);
            range.select();
        }
    }
  },
  render:function hk_render(layout_type){
    if(layout_type){
      document.getElementById('kb-callbar-call-action').classList.add('hide');
      document.getElementById('kb-callbar-add-contact').classList.add('hide');
      document.getElementById('kb-delete').classList.add('hide');
      document.getElementById('kb-callbar-back-action').classList.remove('hide');      
    }else{
      //Default layout
      document.getElementById('kb-callbar-call-action').classList.remove('hide');
      document.getElementById('kb-callbar-add-contact').classList.remove('hide');
      document.getElementById('kb-delete').classList.remove('hide');
      document.getElementById('kb-callbar-back-action').classList.add('hide');
    }
    
  },
  /*
   * Method which delete a digit/all digits from screen. It depends on "Hold action"
   * Hold functionality is based on two var: hold_timer,hold_active.
   */
  deleteDigit:function hk_deleteDigit(event){
    //We stop bubbling propagation 
    event.stopPropagation();

    //Depending of the event type 
    if(event.type=='mousedown'){
      //Start holding event management
      KeypadManager.hold_timer=setTimeout(function(){
        // After .400s we consider that is a "Hold action"
        KeypadManager.hold_active=true;
      },400);
    }else if(event.type=='mouseup'){
      //In is a "Hold action" end
      if(KeypadManager.hold_active){
        //We delete all digits
        
        KeypadManager.phoneNumber='';
      }else{
        //Delete last digit
        KeypadManager.phoneNumber=KeypadManager.phoneNumber.slice(0, -1);
        
      }
      
      document.getElementById('phone-number-view').value=KeypadManager.phoneNumber;
      KeypadManager.util.moveCaretToEnd(document.getElementById('phone-number-view'));
      //We set to default var involved in "Hold event" management
      clearTimeout(KeypadManager.hold_timer);
      KeypadManager.hold_active=false;
    }
  },
  /*
   * Method that retrieves phone number and makes a phone call
   */
  makeCall: function hk_makeCall(event){
    //Stop bubbling propagation 
    event.stopPropagation();

    
    //If is not empty --> Make call
    if (KeypadManager.phoneNumber != '') {
      
        CallHandler.call(KeypadManager.phoneNumber);

    }

    
  },
  /*
   * Method that add phone number to contact list
   */
  addContact: function hk_addContact(event){
    
    //TODO Create the request to the contacts app

  },
  /*
   * Method executed when the user clicks on the button to close the dialpad.
   */
  callbarBackAction: function hk_callbarBackAction (event) {
    // document.getElementById('call-screen').classList.add('call-screen-show');
    OnCallHandler.toggleKeypad();
  },
  /*
   * Method which handle keypad actions
   */
  keyHandler:function hk_keyHandler(event){
    if(event.target.getAttribute('data-value')!=null){
      var key=event.target.getAttribute('data-value');
    }else if(event.target.parentNode.getAttribute('data-value')!=null){
      var key=event.target.parentNode.getAttribute('data-value');
    }
      
    if(key!=undefined){
        event.stopPropagation();
    
    if(event.type=='mousedown'){
      //Play key sound
      TonePlayer.play(gTonesFrequencies[key]);

      // Manage "Hold action" in "0" key
      if(key=='0'){
        KeypadManager.hold_timer=setTimeout(function(){
          KeypadManager.hold_active=true;
        },400);
          }
        }else if(event.type=='mouseup'){
          if(key=='0'){
            if(KeypadManager.hold_active){
              KeypadManager.phoneNumber+='+';
            }else{
              KeypadManager.phoneNumber+=key;
            }
          }else{
            KeypadManager.phoneNumber+=key;
          }
          document.getElementById('phone-number-view').value=KeypadManager.phoneNumber;
          KeypadManager.util.moveCaretToEnd(document.getElementById('phone-number-view'));
          //We set to default var involved in "Hold event" management
          clearTimeout(KeypadManager.hold_timer);
          KeypadManager.hold_active=false;
        } 

      }
  
  },
  handleEvent: function kh_handleEvent(event){
    //TODO Use it if is necessary to control more events
    
  }
 
};