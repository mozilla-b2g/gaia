// Handles events from the Keyboard app, in order to 
// resize the current app when needed

(function() {

	window.addEventListener('background.Keyboard.loaded', function receiver(e) {
		var keyboardFrame = BackgroundServiceManager.getFrame(KEYBOARD_URL);
		var keyboardWindow = keyboardFrame.contentWindow;

		// Keyboard app notifying resize the screen
		window.addEventListener('message', function receiver(e) {
			currentApp = WindowManager.getAppFrame(WindowManager.getDisplayedApp());
			var event = JSON.parse(e.data);
			if(event.action == "resize") {
				WindowManager.setAppSize(WindowManager.getDisplayedApp());
				currentApp.style.height = "-moz-calc("+currentApp.style.height+" - "+event.height+")";
				currentApp.classList.add("keyboardOn");
				keyboardFrame.style.display = "block";
				keyboardFrame.style.height = "100%";
			}
		});

		// Handling showime and hideime events, as they are received only in System
		// https://bugzilla.mozilla.org/show_bug.cgi?id=754083

		function hideImeListener(evt) { 
			keyboardFrame.style.height = 0;
			keyboardFrame.style.display = "none";
			WindowManager.setAppSize(WindowManager.getDisplayedApp());
		}

		window.addEventListener("showime", function showImeListener(evt) {
			var event = { type: evt.type };
			if(evt.detail) {
				event.detail = { type: evt.detail.type };
				keyboardWindow.postMessage(JSON.stringify(event), "*");
			}
			window.addEventListener("hideime", hideImeListener);
		});

		window.addEventListener("appwillclose", function appCloseListener(evt) { 
			var currentApp = WindowManager.getAppFrame(WindowManager.getDisplayedApp());
			window.removeEventListener("hideime", hideImeListener);
			keyboardFrame.style.height = 0;
			currentApp.style.height = 0;
			currentApp.classList.remove("keyboardOn");
		});
	});

}());