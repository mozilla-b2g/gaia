var UIManager = {
	get splashScreen() {
    delete this.splashScreen;
    return this.splashScreen = document.getElementById('splash');
  },
  get progressBar() {
    delete this.progressBar;
    return this.progressBar = document.getElementById('activation_progress');
  },
  get activationScreen() {
    delete this.activationScreen;
    return this.activationScreen = document.getElementById('activation');
  },
  get finishScreen() {
    delete this.finishScreen;
    return this.finishScreen = document.getElementById('finish');
  },
  get navBar() {
    delete this.navBar;
    return this.navBar = document.getElementById('nav-bar');
  },
  get mainTitle() {
    delete this.mainTitle;
    return this.mainTitle = document.getElementById('main_title');
  },
  get pincodeScreen() {
    delete this.pincodeScreen;
    return this.pincodeScreen = document.getElementById('pincode');
  },
  get pinInput() {
    delete this.pinInput;
    return this.pinInput = document.getElementById('pincode');
  },
  get refreshButton() {
    delete this.refreshButton;
    return this.refreshButton = document.getElementById('wifi-refresh');
  },
  get simImportButton() {
    delete this.simImportButton;
    return this.simImportButton = document.getElementById('sim_import');
  },
  get doneButton() {
    delete this.doneButton;
    return this.doneButton = document.getElementById('done');
  },
  get networks() {
    delete this.networks;
    return this.networks = document.getElementById('networks');
  },
  get joinButton() {
    delete this.joinButton;
    return this.joinButton = document.getElementById('join');
  },
  get timezoneConfiguration() {
    delete this.timezoneConfiguration;
    return this.timezoneConfiguration = document.getElementById('timezone-configuration');
  },
  get dateConfiguration() {
    delete this.dateConfiguration;
    return this.dateConfiguration = document.getElementById('date-configuration');
  },
  get timeConfiguration() {
    delete this.timeConfiguration;
    return this.timeConfiguration = document.getElementById('time-configuration');
  },
  get dateConfigurationLabel() {
    delete this.dateConfigurationLabel;
    return this.dateConfigurationLabel = document.getElementById('date-configuration-label');
  },
  get timeConfigurationLabel() {
    delete this.timeConfigurationLabel;
    return this.timeConfigurationLabel = document.getElementById('time-configuration-label');
  },
  get buttonLetsGo() {
    delete this.buttonLetsGo;
    return this.buttonLetsGo = document.getElementById('end');
  },
	init: function ui_init() {
		// TODO Use l10n for dates
		var currentDate = new Date();
		this.timeConfigurationLabel.innerHTML = currentDate.toLocaleFormat('%H:%M');
		this.dateConfigurationLabel.innerHTML = currentDate.toLocaleFormat('%Y-%m-%d');
		// AÑado los eventos al DOM
		this.refreshButton.addEventListener('click', this);
		this.simImportButton.addEventListener('click', this);
		this.doneButton.addEventListener('click', this);
		this.joinButton.addEventListener('click', this);
		this.networks.addEventListener('click', this.chooseNetwork.bind(this));
		this.timezoneConfiguration.addEventListener('change', this);
		this.timeConfiguration.addEventListener('input', this);
		this.dateConfiguration.addEventListener('input', this);
		this.buttonLetsGo.addEventListener('click', function() {
			alert("Terminé");
			// var message = {
	  //     action: 'first-run-end'
	  //   };
			// parent.postMessage(JSON.stringify(message), '*');

			if(AppManager.currentActivity) {
				AppManager.currentActivity.postResult({termine: 'termine'});
				// delete AppManager.currentActivity;
				// alert("Apuntico cerrar");
				window.close();
			}
		});
	},
	handleEvent: function ui_handleEvent(event) {
		switch(event.target.id){
			case 'wifi-refresh':
				WifiManager.scan(UIManager.renderNetworks);
				break;
			case 'sim_import':
				var feedbackMessage = document.getElementById("sim_import_feedback");
				feedbackMessage.innerHTML = "Importing...";
				importSIMContacts(
					function(){
						feedbackMessage.innerHTML = "Reading SIM card...";
					}, function(n){
						feedbackMessage.innerHTML = n+" contacts imported";
					}, function(){
						feedbackMessage.innerHTML = "Error reading your SIM card.";
				});
				break;
			case 'done':
				this.unlockSIM();
				break;
			case 'join':
				this.joinNetwork();
				break;
			case 'time-configuration':
				this.setTime();
				break;
			case 'date-configuration':
				this.setDate();
				break;
			case 'timezone-configuration':
				this.setTimeZone();
				break;
		}
	},
	joinNetwork: function ui_jn() {
		var ssid = document.getElementById("wifi_ssid").value;
		var password = document.getElementById("wifi_password").value;
		var user = document.getElementById("wifi_user").value;
		
		//Necesito ssid password y/o user
		if(password == ''){
			// PONER ERROR EN EL FORMULARIO de PASSWORD
			return;
		}

		if(WifiManager.isUserMandatory(ssid)){
			if(user == ''){
				// PONER ERROR EN EL FORMULARIO de USUARIO
				return;
			}
			// ENVIO FORMULARIO CON SSID,USER y PASSWORD
			WifiManager.connect(ssid,password,user);
			window.history.back();
		
		}else{
			// ENVIO FORMULARIO CON SSID Y PASSWORD
			WifiManager.connect(ssid,password);
			window.history.back();
		}
	},
	setDate: function ui_sd() {
		var dateLabel = document.getElementById('date-configuration-label');
		// Retrieve values from input
		var newTime = document.getElementById('date-configuration').value;
		// Retrieve year/month/date
		var time = newTime.split('-');
		// Current time
		var currentTime = new Date();
		// Create new time with previous params
		var timeToSet = new Date(parseInt(time[0]),
									(parseInt(time[1])-1),
									parseInt(time[2]),
									currentTime.getHours(),
									currentTime.getMinutes()
									);
		// Set date through API
		TimeManager.set(timeToSet.getTime());
		// Set DATE properly
		dateLabel.innerHTML = timeToSet.toLocaleFormat('%Y-%m-%d');
	},
	setTime: function ui_st() {
		var timeLabel = document.getElementById('time-configuration-label');
		// Retrieve values from input
		var newTime = document.getElementById('time-configuration').value;
		// Retrieve hour/minutes
		var time = newTime.split(':');
		// Current time
		var currentTime = new Date();
		// Create new time with previous params
		var timeToSet = new Date(currentTime.getFullYear(),
									currentTime.getMonth(),
									currentTime.getDate(),
									parseInt(time[0]),
									parseInt(time[1]));
		// Set time through API
		TimeManager.set(timeToSet.getTime());
		// Set time properly
		timeLabel.innerHTML = timeToSet.toLocaleFormat('%H:%M');
	},
	setTimeZone: function ui_stz() {
		var tzConfiguration = document.getElementById('timezone-configuration');
		var tzOverlay = document.getElementById('time_zone_overlay');
		var tzInput = document.getElementById('timezone-configuration');
		var tzTitle = document.getElementById('time-zone-title');
		var tzLabel = document.getElementById('timezone-configuration-label');
		
		var gmt = tzInput.options[tzInput.selectedIndex].value;

		var classes = tzOverlay.classList;
		for (var i = 0; i < classes.length; i++) {
			tzOverlay.classList.remove(classes[i]);
		};
		tzOverlay.classList.add("gmt"+gmt);
		
		// TODO Include SET when it will be ready
		// TODO Include automatic set of time
		// https://bugzilla.mozilla.org/show_bug.cgi?id=796265
		tzLabel.innerHTML=TimeManager.getTimeZone(gmt);
		tzTitle.innerHTML=TimeManager.getTimeZone(gmt);
	},
	unlockSIM: function ui_us() {
		var pinInput = document.getElementById("sim_pin");
		var pin = pinInput.value;
    if (pin === '')
      return;
		pinInput.value = '';
	  
	  // Unlock SIM
	  var options = {lockType: 'pin', pin: pin };
	  var conn = window.navigator.mozMobileConnection;
		var req = conn.unlockCardLock(options);
    req.onsuccess = function sp_unlockSuccess() {
    	UIManager.pincodeScreen.classList.remove("show");
			UIManager.activationScreen.classList.add("show");
			window.location.hash = "#languages";

    };
    req.onerror = function sp_unlockError() {
     	var retry = (req.result && req.result.retryCount) ?
      	parseInt(req.result.retryCount, 10) : -1;
  		document.getElementById("pin_error").innerHTML = 'Error '+retry;
    };
	},
	chooseNetwork: function ui_cn(event) {
		// Remove refresh option
		UIManager.activationScreen.classList.add("no-options");
		// Retrieve SSID from dataset
		var ssid = event.target.dataset.ssid;
		
		// Do we need to type password?	
		if(!WifiManager.isPasswordMandatory(ssid)){
			WifiManager.connect(ssid);
			WifiManager.scan(UIManager.renderNetworks);
		}else{
			// Actualizo el título
			UIManager.mainTitle.innerHTML = ssid;
			// Selecciono la red
			var selectedNetwork = WifiManager.getNetwork(ssid);

			var ssidHeader = document.getElementById("wifi_ssid");
			var userLabel = document.getElementById("label_wifi_user");
			var userInput = document.getElementById("wifi_user");

			// Actualizo el formulario
			ssidHeader.value = ssid;
			// Renderizo el formulario según el tipo
			UIManager.renderNetworkConfiguration(selectedNetwork,function() {
				// Activo el menú secundario
				UIManager.navBar.classList.add('secondary-menu');
				// Actualizo los campos según el tipo de red
				if(WifiManager.isUserMandatory(ssid)){
					userLabel.classList.remove('hidden');
					userInput.classList.remove('hidden');

				}else{
					userLabel.classList.add('hidden');
					userInput.classList.add('hidden');
				}
				// Cambio el hash
				window.location.hash = "#configure_network";
			});
		}
	},
	renderNetworks: function ui_rn(networks) {
		var networksDOM = document.getElementById("networks");
		networksDOM.innerHTML = '';
		var ssids = Object.getOwnPropertyNames(networks);
        ssids.sort(function(a, b) {
          return networks[b].relSignalStrength - networks[a].relSignalStrength;
        });

        // add detected networks
        for (var i = 0; i < ssids.length; i++) {
          var network = networks[ssids[i]];

          // ssid
		    var ssid = document.createElement('a');
		    ssid.textContent = network.ssid;
		    ssid.dataset.ssid = network.ssid;
		    // supported authentication methods
		    var small = document.createElement('small');
		    var keys = network.capabilities;
		    if (keys && keys.length) {
		      small.textContent = keys.join(', ');
		      ssid.className = 'wifi-secure';
		    } else {
		      small.textContent = 'open';
		    }

		    // create list item
		    var li = document.createElement('li');
		    li.setAttribute('id', network.ssid);
		    li.appendChild(small);
		    li.appendChild(ssid);




          networksDOM.appendChild(li);
      	}
	},
	renderNetworkConfiguration: function uim_rnc(ssid,callback) {
		if(callback)
			callback();
	},
	updateNetworkStatus: function uim_uns(ssid,status) {
		console.log("ACTUALIZANDO "+ssid+" CON "+status);
		document.getElementById(ssid).childNodes[0].innerHTML = status;
	} 
};