'use strict';

var sending_not = document.querySelector("#send_device");

if (sending_not) sending_not.onclick = function(){ topNotification('Sending Demo App', 'Waiting for confirmation...'); window.history.back(); }

//The function that actually fires the notification API to show the notification
function topNotification(title, desc) {
	//Check for FFOS 1.1 +
	if ("Notification" in window) {
		//A snippet, referenced from the examples, to request the proper permission if the permission isn't granted already.
		if (Notification.permission !== 'denied') {
        	Notification.requestPermission(function (permission) {
            	if(!('permission' in Notification)) {
                	Notification.permission = permission;
               	}
          	});
     	}
		
		//Permission granted, display the notification already!!
		if (Notification.permission === "granted") {
        	var notification = new Notification(title, { body : desc });    
       	}
	} else { //Assume FFOS 1.0, create and display the notification directly
		var notification = navigator.mozNotification.createNotification(title, desc);
        notification.show();
	}
}