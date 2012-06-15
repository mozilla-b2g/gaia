/*
 * Class which manage "keypad" in dialer app
 */


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
    document.getElementById('kb-callbar-back-action').addEventListener('mouseup',CallUI.ui.show,false);

    

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
    
    //TODO Method which render properly if there is a call or not
    // layout_type==1 represents dialer when there is a call active
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