var CallUI={
	
	init:function cm_init(){
		document.getElementById('mute').addEventListener('mouseup',CallHandler.toggleMute,false);
		document.getElementById('keypad-visibility').addEventListener('mouseup',CallHandler.toggleKeypad,false);
		document.getElementById('speaker').addEventListener('mouseup',CallHandler.toggleSpeaker,false);
		document.getElementById('co-basic-answer').addEventListener('mouseup',CallHandler.answer,false);
		document.getElementById('co-basic-reject').addEventListener('mouseup',CallHandler.end,false);
	},
	update:function cm_update(phone_number){
		document.getElementById('cs-h-info-primary').innerHTML=phone_number;
	},
	cleanTimer:function cm_cleanTime(){
		clearInterval(CallUI.timer);
	},
	render:function cm_render(layout_type){
		
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
				if(!document.getElementById('co-basic-answer').classList.contains('hide')){
					document.getElementById('co-basic-answer').classList.add('hide');
				}
				if(!document.getElementById('co-basic-answer').classList.contains('transparent')){
					document.getElementById('co-advanced').classList.remove('transparent');
				}

				document.getElementById('keypad-visibility').removeAttribute('disabled');

				document.getElementById('call-duration').innerHTML="00:00";
				 
				// Create a method which manage Time in dialer
				// var sec=0;
				// CallUI.timer=setInterval(function(){
				// 	sec++;

				// 	var minutes=Math.floor(sec/60);
				// 	var seconds=sec%60;
				// 	if(minutes<10){
				// 		minutes='0'+minutes;
				// 	}

				// 	if(seconds<10){
				// 		seconds='0'+seconds;
				// 	}

				// 	document.getElementById('call-duration').innerHTML=minutes+':'+seconds;
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
			document.getElementById('call-screen').classList.remove('call-screen-show');
		}
	}
}

// var CallManager={
// 	telephony:undefined,
// 	current_call:undefined,
	
// 	init:function ch_init(){
// 		this.telephony = navigator.mozTelephony;
// 		// alert("INIT CALLMANAGER");
// 		//Set DEFAULT Params
// 		this.telephony.muted=false;
// 		// this.telephony.speakerEnabled=false;
// 		alert("Call Manager init");
// 		//Init UI manager
// 		CallUI.init();
// 		CallUI.render(0);
// 		CallUI.ui.show();
// 		//Retrieve value of this and reference it with "_this"
// 		// var _this=this;
// 		// this.telephony.addEventListener('incoming', function incoming(event) {
// 		// 	// event.call.answer();
// 		// 	_this.current_call=event.call;
// 		// 	// this.current_call.answer();
// 		// 	CallManager.incoming();
// 		// });
// 	},
// 	configuration:{
// 		setDefault: function cm_setDefault(){

// 		},
// 		change:{
// 			mute:function cm_conf_change_mute(){
				
// 				//this.telephony.muted=!this.telephony.muted;
// 				alert(this.telephony.muted);
// 			},
// 			speaker:function cm_conf_change_speaker(){
				
// 				this.telephony.speakerEnabled=!this.telephony.speakerEnabled;
// 			},
// 			keypadVisibility:function cm_conf_change_keypadVisibility(){
// 				KeyboardManager.render(1);
// 				CallUI.hide();
// 			}

// 		}
// 	},
// 	check:function ch_check(){

// 	  //   if (this.telephony.calls.length > 0) {
// 	  //     	this.current_call=this.telephony.calls[0]);
// 			// CallManager.incoming();
// 	  //   }else{
// 	  //   	CallUI.ui.hide();
// 	  //   }
// 	},
// 	incoming:function ch_incoming_call(){
// 		// CallUI.render(2);
// 		// CallUI.ui.show();
		
// 		// this.current_call.ondisconnected = function ondisconnected(event) {
// 		//   /* Do something when the call finishes. */
// 		//   CallUI.ui.hide();
// 		// };
// 		// // Event handlers for the call.
// 		// this.current_call.onconnected = function onconnected(event) {
// 		//   /* Do something when the callee picks up the call. */
		  
// 		//   CallUI.render(1);

// 		// };
	    
	    
// 	},

// 	call:function ch_call(phone_number){
			
		

		
// 		// // Check if the speaker is enabled.
// 		// concole.log(telephony.speakerEnabled);
// 		// Then, we dial out.
		
// 		CallUI.render(0);
// 		CallUI.ui.show();
		 
// 		this.telephony.speakerEnabled=false;
// 		this.current_call = this.telephony.dial(phone_number);

// 		// var contact={
// 		// 	phone_number:phone_number
// 		// }

// 		// Event handlers for the call.
// 		this.current_call.onconnected = function onconnected(event) {
// 		  /* Do something when the callee picks up the call. */
		  
// 		  CallUI.render(1);

// 		};

// 		this.current_call.ondisconnected = function ondisconnected(event) {
// 		  /* Do something when the call finishes. */
// 		  CallUI.ui.hide();
// 		};

		
// 	},
// 	answer:function ch_answer(){
// 		// CallManager.self.current_call.answer();
// 	},
// 	hangup:function ch_hangup(){
// 		// Hang up the call.
// 		//TODO Check BUG in Bugzilla because it is not working
// 		// CallManager.self.current_call.hangUp();

// 		// CallUI.ui.hide();
// 	}

// }