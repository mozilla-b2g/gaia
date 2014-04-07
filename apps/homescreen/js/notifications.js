var sending_not = document.querySelector("#dynamic");

if (sending_not) sending_not.onclick = function(){ topNotification('Sending Demo App', 'Waiting for confirmation...'); }

//The function that actually fires the notification API to show the notification
function topNotification(title , desc) {
	//var lock = navigator.mozSettings.createLock();
	//var setting = lock.get('bluetooth.enabled');

	//setting.onsuccess = function(){
	//	console.log('bluetooth.enabled: ' + setting.result);
	//}

	//setting.onerror = function(){
	//	console.log('An error occured: ' + setting.error);
	//}

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
			window.asyncStorage.getItem('sendingIcon', function(icon_blob){
        	var notification = new Notification(title, { body : desc, icon: icon_blob});
     		notification.onshow = function(){setTimeout(notification.close, 15000)}    
			});	
       	}
	} else { //Assume FFOS 1.0, create and display the notification directly
		var notification = navigator.mozNotification.createNotification(title, desc);
        notification.show();
	}
}