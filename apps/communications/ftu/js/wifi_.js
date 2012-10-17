var WifiManager = {

	init: function init(){

		if ('mozWifiManager' in window.navigator){
			this.api = window.navigator.mozWifiManager;
			this.changeStatus();
			
			console.log("YA TENGO LA API");
			this.gCurrentNetwork = this.api.connection.network;
			
			// this.enable();
			// this.api.onenabled = function onWifiEnabled() {
		 //    console.log("Coño un cambio!");
		 //  };
		}
	},
	scan:function scan(callback){
		if ('mozWifiManager' in window.navigator){
			// this.enable();
			console.log("ESCANEANDO");

			var req = WifiManager.api.getNetworks();
			var self = this;
    	req.onsuccess = function onScanSuccess() {
    		self.networks = req.result;
				callback(self.networks) ;
    	};
    	req.onerror = function onScanError(){
    		console.log('Error reading networks');
    	};
		}else{
			var fakeNetworks = {
		    'Mozilla-G': {
		      ssid: 'Mozilla-G',
		      bssid: 'xx:xx:xx:xx:xx:xx',
		      capabilities: ['WPA-EAP'],
		      relSignalStrength: 67,
		      connected: false
		    },
		    'Livebox 6752': {
		      ssid: 'Livebox 6752',
		      bssid: 'xx:xx:xx:xx:xx:xx',
		      capabilities: ['WEP'],
		      relSignalStrength: 32,
		      connected: false
		    },
		    'Mozilla Guest': {
		      ssid: 'Mozilla Guest',
		      bssid: 'xx:xx:xx:xx:xx:xx',
		      capabilities: [],
		      relSignalStrength: 98,
		      connected: false
		    },
		    'Freebox 8953': {
		      ssid: 'Freebox 8953',
		      bssid: 'xx:xx:xx:xx:xx:xx',
		      capabilities: ['WPA2-PSK'],
		      relSignalStrength: 89,
		      connected: false
		    }
		  };
		  this.networks = fakeNetworks;
		  callback(fakeNetworks);
		}
	},
	enable: function enable(firstTime){
		// Inicializamos la WIFI para que esté disponible para despues
		console.log("******** ENABLE!");
		WifiManager.api.onenabled = function onWifiEnabled() {
	    console.log("YA ESTA ACTIVADO");
	  };
		var settings = window.navigator.mozSettings;
		settings.createLock().set({'wifi.enabled': true});
		console.log("******** ENABLED!");
		

		// console.log("*************************************");
		// var settings = window.navigator.mozSettings;
		// if (!settings.createLock) {
		// 	console.log("****** CREATE LOCK FAIL");
		// 	return;
		// }
		// console.log("****** CREATE LOCK DEL TIRON");
		// var req = settings.createLock().get('wifi.enabled');
  // 	req.onsuccess = function wf_getStatusSuccess() {
  // 		if(!req.result['wifi.enabled']){
  // 			settings.createLock().set({'wifi.enabled': true});
  // 		}else{
  // 			if(firstTime){
  // 				settings.createLock().set({'wifi.enabled': false});
  // 			}
  			
  // 		}
  // 	};
  // 	req.onerror = function() {
  // 		console.log("Error changing status.");
  // 	};
	 
	},
	getNetwork: function wm_gn(ssid){
		return this.networks[ssid];
	},
	connect: function connect(ssid, password, user, callback){
		var network = this.networks[ssid];
		this.ssid = ssid;
		var key = this.getSecurityType(network);
	    if (key == 'WEP') {
	    	network.wep = password;
	    } else if (key == 'WPA-PSK') {
	    	console.log('PSK!!!!!');
	    	network.psk = password;
	    } else if (key == 'WPA-EAP') {
	        network.password = password;
	        if (user && user.length) {
	        	network.identity = user;
	        }
	    } else {
	    	//CONECTO DIRECTAMENTE Y ME SALGO
	    	this.api.associate(network);
	    	return;
	    }
		console.log(key +' '+ssid+' us '+user+' pass '+password);
	  network.keyManagement = key;

	  this.gCurrentNetwork = network;
		this.api.associate(network);
		console.log("Despues de conectar");
		
	},
	changeStatus: function cs(callback){
		console.log("CHANGE ESTATUS");
		 /**
		   * mozWifiManager status
		   * see dom/wifi/nsIWifi.idl -- the 4 possible statuses are:
		   *  - connecting:
		   *        fires when we start the process of connecting to a network.
		   *  - associated:
		   *        fires when we have connected to an access point but do not yet
		   *        have an IP address.
		   *  - connected:
		   *        fires once we are fully connected to an access point.
		   *  - connectingfailed:
		   *        fires when we fail to connect to an access point.
		   *  - disconnected:
		   *        fires when we were connected to a network but have been
		   *        disconnected.
		   */
		   var self = this;
		   WifiManager.api.onstatuschange = function(event) {
		   	// console.log("¡¡¡¡¡¡¡¡¡¡CAMBIO DE ESTADO!!!!!!!!!!!");
		   	console.log("Cambio a "+event.status+" de "+self.ssid);
		   		UIManager.updateNetworkStatus(self.ssid, event.status);
		   		if(event.status=='connected'){
		   			self.isConnected = true;
		   		}else{
		   			self.isConnected = false;
		   		}
		   };
		   
	},

 	getSecurityType: function gst(network){
		var key = network.capabilities[0];
	      if (/WEP$/.test(key))
	        return 'WEP';
	      if (/PSK$/.test(key))
	        return 'WPA-PSK';
	      if (/EAP$/.test(key))
	        return 'WPA-EAP';
	      return false;
	},
	isUserMandatory: function ium(ssid){
		if(this.getSecurityType(this.networks[ssid]).indexOf('EAP')!=-1)
			return true;	
		return false;
	},
	isPasswordMandatory: function ipm(ssid) {
		if(!this.getSecurityType(this.networks[ssid])){
			return false;
		}
		return true;
	}

}