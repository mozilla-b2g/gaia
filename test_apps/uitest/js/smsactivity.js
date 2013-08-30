
function openSMSActivity(){
  var sms = new MozActivity({
    name: "new", // Possible compose-sms in future versions
	data: {
	  type: "websms/sms",
	  number: "+38163123456",
	  body: "my test sms text"
	}
  });

  sms.onsuccess = function (){ 
    window.parent.alert('SMS sent');
  };
  
  sms.onerror = function (){ 
    window.parent.alert('Notification clicked');
  };

}

var clickHandlers = {
  'button1': openSMSActivity,
};

document.body.addEventListener('click', function(evt) {
  if (clickHandlers[evt.target.id || evt.target.dataset.fn])
    clickHandlers[evt.target.id || evt.target.dataset.fn].call(this, evt);
});

