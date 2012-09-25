Evme.Location = new function() {
    var _name = "Location", _this = this,
        $elLocationName = null, $elButton = null, $elSelectorDialog = null, $locationScreen = null,
        dialog = null, dialogActive = false, timeoutLocationRequest = null;
    var lat = "", lon = "", name = "",
        lastUserLat = "", lastUserLon = "";
        
    var DEFAULT_SET_LOCATION_TEXT = "Set Location",
        DEFAULT_NEAR_ME_TEXT = "in your area", TIMEOUT_BEFORE_GIVING_UP_ON_LOCATION = 5000,
        TIMEOUT_BETWEEN_MESSAGE_AND_LOCATION_REQUEST = 500,
        COOKIE_NAME = "userLoc", COOKIE_EXPIRATION_MINUTES = 15, COOKIE_EXPIRATION_DO_IT_LATER_MINUTES = 60*24,
        COOKIE_MANUAL_NAME = "cm", COOKIE_MANUAL_EXPIRATION_MINUTES = 60*24,
        MESSAGE_COOKIE_NAME = "lm",
        TIMEOUT_CLICK_LOCATE_ME = 5000,
        
        TEXT_MANUAL_TITLE = "FROM CONFIG",
        TEXT_NO_LOCATIONS_FOUND = "FROM CONFIG",
        TEXT_MENU_TITLE = "FROM CONFIG",
        TEXT_MENU_LOCATE_ME = "FROM CONFIG",
        TEXT_MENU_ENTER_LOCATION = "FROM CONFIG",
        TEXT_MENU_CLOSE = "FROM CONFIG",
        LOCATION_TIP_TEXT = "FROM CONFIG",
        LOCATION_TIP_BUTTON = "FROM CONFIG",
        LOCATION_TIP_TITLE = "FROM CONFIG",
        LOCATION_TIP_LOCATING = "FROM CONFIG",
        ERROR_TIP_TITLE = "FROM CONFIG",
        ERROR_TIP_LABEL = "FROM CONFIG",
        ERROR_TIP_BUTTON_CANCEL = "FROM CONFIG",
        ERROR_TIP_BUTTON_OK = "FROM CONFIG",
        ERROR_CANT_LOCATE_TITLE = "FROM CONFIG",
        ERROR_CANT_LOCATE_TEXT = "FROM CONFIG",
        ERROR_CANT_LOCATE_BUTTON = "FROM CONFIG";
    
    this.init = function(options) {
        options || (options = {});
        
        $elLocationName = options.$elName;
        $elButton = options.$elButton;
        $elSelectorDialog = options.$elSelectorDialog;
        $elButtonManual = options.$elButtonManual;
        
        $elButton.click(_this.toggleDialog);
        
        TEXT_MANUAL_TITLE = options.texts.manualTitle;
        TEXT_NO_LOCATIONS_FOUND = options.texts.manualNoResults;
        TEXT_MENU_TITLE = options.texts.menuTitle;
        TEXT_MENU_LOCATE_ME = options.texts.menuLocateMe;
        TEXT_MENU_ENTER_LOCATION = options.texts.menuEnterLocation;
        TEXT_MENU_CLOSE = options.texts.menuClose;
        LOCATION_TIP_TEXT = options.texts.tip;
        LOCATION_TIP_BUTTON = options.texts.tipButton;
        LOCATION_TIP_TITLE = options.texts.tipTitle;
        LOCATION_TIP_LOCATING = options.texts.tipLocating;
        ERROR_TIP_TITLE = options.texts.errorTipTitle;
        ERROR_TIP_LABEL = options.texts.errorTipLabel;
        ERROR_TIP_BUTTON_CANCEL = options.texts.errorTipButtonCancel;
        ERROR_TIP_BUTTON_OK = options.texts.errorTipButtonOK;
        ERROR_CANT_LOCATE_TITLE = options.texts.errorCantLocateTitle;
        ERROR_CANT_LOCATE_TEXT = options.texts.errorCantLocateText;
        ERROR_CANT_LOCATE_BUTTON_CANCEL = options.texts.errorCantLocateButtonCancel;
        ERROR_CANT_LOCATE_BUTTON_SETTINGS = options.texts.errorCantLocateButtonSettings;
        
        $elSelectorDialog.find(".title").html(TEXT_MENU_TITLE);
        $elSelectorDialog.find(".manual h2").html(TEXT_MANUAL_TITLE);
        
        if (options.$elLocateMe) {
            options.$elLocateMe.html(TEXT_MENU_LOCATE_ME).click(_this.locateMe);
        }
        if (options.$elEnterLocation) {
            options.$elEnterLocation.html(TEXT_MENU_ENTER_LOCATION).click(_this.showLocationSearcher);
        }
        if (options.$elDoItLater) {
            options.$elDoItLater.html(TEXT_MENU_CLOSE).click(_this.toggleDialog);
        }
        
        _this.LocationSelector.init({
            "$input": $("#search-location"),
            "$list": $elSelectorDialog.find("ul.location-results"),
            "$close": $elSelectorDialog.find(".close")
        });
        
        _this.setLocationFromCookie();
        
        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.toggleDialog = function() {
        if (dialogActive) {
            _this.hideDialog();
        } else {
            _this.showSelectorDialog();
        }
    };
    
    this.showSelectorDialog = function() {
        if (!dialogActive) {
            $elSelectorDialog.removeClass("manual").addClass("visible").addClass("options");
            $elButton.addClass("active");
            
            dialogActive = true;
            
            $locationScreen && $locationScreen.remove();
            $locationScreen = $('<div id="location-selector-screen"></div>');
            $locationScreen.click(_this.hideDialog);
            $elSelectorDialog.parent().append($locationScreen);
        }
    };
    
    this.hideDialog = function() {
        if (dialogActive) {
            $elSelectorDialog.removeClass("visible").removeClass("options").removeClass("manual");
            $locationScreen && $locationScreen.remove();
            $locationScreen = null;
            $elButton.removeClass("active");
            dialogActive = false;
        }
    };
    
    this.showLocationSearcher = function() {
        dialogActive = true;
        
        $elSelectorDialog.removeClass("options").addClass("visible").addClass("manual");
        _this.LocationSelector.show();
    };
    
    this.isDialogActive = function() {
        return dialogActive;
    };
    
    this.locateMe = function() {
        Evme.Utils.Cookies.remove(COOKIE_NAME);
        _this.requestUserLocation(showOSErrorDialog, true);
    };
    
    this.requestUserLocation = function(callbackError, bSkipCookie) {
        _this.hideDialog();
        
        if (bSkipCookie || !_this.setLocationFromCookie()) {
            showGeoMessage(callbackError, true);
        }
    };
    
    this.userClickedDoItLater = function() {
        var locationFromCookie = Evme.Utils.Cookies.get(COOKIE_NAME);
        return (locationFromCookie && locationFromCookie == "n");
    };
    
    this.shouldShowButton = function() {
        var locationFromCookie = Evme.Utils.Cookies.get(COOKIE_NAME);
        return (locationFromCookie && locationFromCookie == "n") || Evme.Utils.Cookies.get(COOKIE_MANUAL_NAME);
    };
    
    this.setLocationFromCookie = function() {
        var locationFromCookie = Evme.Utils.Cookies.get(COOKIE_NAME);
        
        if (locationFromCookie) {
            if (locationFromCookie == "n") {
                _this.setButtonText(DEFAULT_SET_LOCATION_TEXT);
                return true;
            } else {
                locationFromCookie = locationFromCookie.split(",");
                _this.setLocation(locationFromCookie[0], locationFromCookie[1]);
                return true;
            }
        } else {
            locationFromCookie = Evme.Utils.Cookies.get(COOKIE_MANUAL_NAME);
            
            if (locationFromCookie) {
                locationFromCookie = locationFromCookie.split(",");
                _this.setLocation(locationFromCookie[0], locationFromCookie[1], locationFromCookie[2]);
                
                return true;
            }
        }
        
        return false;
    };
    
    this.showButton = function() {
        if ($elButton[0].innerHTML == "") {
            _this.setButtonText(DEFAULT_SET_LOCATION_TEXT);
            return;
        }
        
        if (!_this.shouldShowButton()) {
            return;
        }
        
        $elButton.addClass("visible");
        $("#evmeContainer ").addClass("location-visible");
    };
    
    this.hideButton = function() {
        $elButton.removeClass("visible");
        $("#evmeContainer ").removeClass("location-visible");
    };
    
    this.setButtonText = function(txt) {
        if (txt) {
            $elButton[0].innerHTML = txt;
            _this.showButton();
        }
    };
    
    this.setLocation = function(_lat, _lon, _name, bRemoveDialog) {
        _lat && (lat = _lat);
        _lon && (lon = _lon);
        _name && (name = _name);
        (typeof bRemoveDialog !== "boolean") && (bRemoveDialog = true);
        
        if (_name) {
            Evme.Utils.Cookies.remove(COOKIE_NAME);
            Evme.Utils.Cookies.set(COOKIE_MANUAL_NAME, _lat + "," + _lon + "," + name, COOKIE_MANUAL_EXPIRATION_MINUTES);
            _this.setButtonText(name);
        } else {
            Evme.Utils.Cookies.remove(COOKIE_MANUAL_NAME);
            Evme.Utils.Cookies.set(COOKIE_NAME, _lat + "," + _lon, COOKIE_EXPIRATION_MINUTES);
            _this.hideButton();
        }
        
        if (bRemoveDialog) {
            dialog && dialog.remove() && (dialog = null);
        }
        
        cbLocationSet();
        
        return (lat != _lat && lon != _lon);
    };
    
    this.get = function() {
        return {
            "lat": lat,
            "lon": lon
        };
    };
    
    this.LocationSelector = new function() {
        var _name = "LocationSelector", _this = this,
            value = "", $input = null, $list = null, $close = null,
            intervalPolling = null;
            
        var MAX_ITEMS_TO_DISPLAY = 3;
        
        this.init = function(options) {
            $input = options.$input;
            $list = options.$list;
            $close = options.$close;
            
            $close.bind("mousedown", cbClose);
            
            $input.bind("blur", cbBlur)
                  .bind("focus", function() {
                      Viewport.hideAddressBar();
                  });
            
            $input.bind("keyup", checkValue);
            
            Evme.EventHandler.trigger(_name, "init");
        };
        
        this.show = function() {
            $input.focus();
            
            cbShow();
        };
        
        this.load = function(_list) {
            list = _list;
            
            if (list.length == 0) {
                $list[0].innerHTML = "<li>" + TEXT_NO_LOCATIONS_FOUND + "</li>";
            } else {
                $list[0].innerHTML = "";
                var locationsPrinted = {};
                
                for (var i=0; i<Math.min(list.length, MAX_ITEMS_TO_DISPLAY); i++) {
                    (function(i){
                        var loc = list[i];
                        var name = loc.name;
                        loc.region = (loc.country == "United States" || loc.country == "United Kingdom" || loc.country == "Canada")? loc.state : loc.country;
                        if (loc.region) {
                            name += ', ' + loc.region;
                        }
                        
                        if (typeof locationsPrinted[name] == "undefined") {
                            locationsPrinted[name] = true;
                            var $item = $('<li>' + name + '</li>');
                            $item.bind("mousedown", function(){
                                cbClick(loc.name, loc.country, loc.state, loc.lat, loc.lon, $item);
                            });
                            $list.append($item);
                        }
                    })(i);
                }
            }
            
            cbLoad();
        };
        
        this.clear = function() {
            $list[0].innerHTML = "";
        };
        
        this.blur = function() {
            $input.blur();
        };
        
        function checkValue(e) {
            var newValue = $input.val();
            if (newValue !== value || (e && e.keyCode == 13)) {
                value = newValue;
                cbValueChanged(e);
            }
        }
        
        function stopPolling() {
            window.clearInterval(intervalPolling);
        }
        
        function cbBlur(e) {
            Evme.EventHandler.trigger(_name, "blur", {
                "e": e,
                "value": value
            });
        }
        
        function cbShow(e) {
            Evme.EventHandler.trigger(_name, "show");
        }
        
        function cbClose(e) {
            stopPolling();
            Evme.EventHandler.trigger(_name, "close");
        }
        
        function cbValueChanged(e) {
            Evme.EventHandler.trigger(_name, "valueChanged", {
                "value": value,
                "e": e,
                "callback": _this.load
            });
        }
        
        function cbClick(city, country, state, lat, lon, $el) {
            Evme.EventHandler.trigger(_name, "click", {
                "$el": $el,
                "city": city,
                "country": country,
                "state": state,
                "lat": lat,
                "lon": lon
            });
            cbClose();
        }
        
        function cbLoad() {
            Evme.EventHandler.trigger(_name, "load", {
                "value": value,
                "list": list,
                "$list": $list
            });
        }
    };
    
    this.showLocationTip = function() {
        showGeoMessage(null, false);
    };
    
    this.showErrorDialog = function() {
        showErrorDialog();
    };
    
    function actualLocationRequest(errorCallback) {
        var hadError = false;
        
        cbLocationRequest();
        
        // temp hack until GPS works
        //if (!("geolocation" in navigator)) {
            hadError = true;
            cbError(errorCallback);
            return;
        //}
        
        navigator.geolocation.getCurrentPosition(function(position){
            if (!hadError) {
                cbLocationGot(position);
                _this.hideButton();
                
                if (lastUserLat !== position.coords.latitude || lastUserLon !== position.coords.longitude) {
                    lastUserLat = position.coords.latitude;
                    lastUserLon = position.coords.longitude;
                    
                    _this.setLocation(lastUserLat, lastUserLon);
                }
            }
        }, function() {
            if (!hadError) {
                hadError = true;
                cbError(errorCallback);
            }
        });
    }
    
    function showGeoMessage(errorCallback, bActivateLocation) {
        var shownMessage = Evme.Utils.Cookies.get(MESSAGE_COOKIE_NAME);
        var clickedOK = false, timeoutAutoClick = null;
        bActivateLocation = (typeof bActivateLocation != "boolean")? true : bActivateLocation;
        
        if (!shownMessage) {
            dialog = new Evme.Dialog("location");
            
            dialog.show({
                "title": LOCATION_TIP_TITLE,
                "content": LOCATION_TIP_TEXT,
                "buttons": {
                    "ok": {
                        "text": LOCATION_TIP_BUTTON,
                        "callback": function(e){
                            window.clearTimeout(timeoutAutoClick);
                            
                            if (!bActivateLocation) {
                                dialog.remove();
                                return;
                            }
                            
                            if (clickedOK) {
                                return;
                            }
                            
                            clickedOK = true;
                            var $button = dialog.getElement().find(".ok");
                            $button.html('<div class="loading"></div>' + LOCATION_TIP_LOCATING);
                            
                            actualLocationRequest(showErrorDialog);
                            
                            var opts = {
                              "lines": 8,
                              "length": 2,
                              "width": 3,
                              "radius": 3,
                              "color": "#fff",
                              "speed": 1,
                              "trail": 60,
                              "shadow": false
                            };
                            loading = new Spinner(opts).spin($button.find(".loading")[0]);
                        },
                        "remove": false,
                        "entireDialog": false
                    }
                },
                "blackout": true,
                "tip": true
            });
            
            Evme.Utils.Cookies.set(MESSAGE_COOKIE_NAME, "1", 60*24*30);
            
            if (TIMEOUT_CLICK_LOCATE_ME) {
                timeoutAutoClick = window.setTimeout(dialog.clickOK, TIMEOUT_CLICK_LOCATE_ME);
            }
        } else {
            if (bActivateLocation) {
                actualLocationRequest(errorCallback);
            }
        }
    }
    
 	function showErrorDialog() {
        dialog && dialog.remove() && (dialog = null);
        
        var fromCookie = Evme.Utils.Cookies.get(COOKIE_NAME);
        if (fromCookie && fromCookie ==  "n") {
            cbError();
            return;
        }
        
        dialog = new Evme.Dialog("location_error");
        dialog.show({
            "title": ERROR_TIP_TITLE,
            "content":  '<label>' + ERROR_TIP_LABEL + '</label>' +
                        '<form class="zip-wrapper">' +
                            '<fieldset>' +
                                '<input type="text" pattern="[0-9]*" class="textinput" id="location-zip" name="location-zip" maxlength="5" />' +
                                '<span id="location-zip-name"></span>' +
                            '</fieldset>' +
                        '</form>',
            "buttons": {
                "ok": {
                    "text": ERROR_TIP_BUTTON_CANCEL,
                    "callback": function(e) {
                        Evme.Utils.Cookies.set(COOKIE_NAME, "n", COOKIE_EXPIRATION_DO_IT_LATER_MINUTES);
                        animateDialogClose(e, dialog);
                    },
                    "remove": false,
                    "entireDialog": false
                },
                "cancel": {
                    "text": ERROR_TIP_BUTTON_OK,
                    "callback": function(e){
                        zipKeyUp({"keyCode": 13}, dialog);
                    },
                    "remove": false,
                    "entireDialog": false
                }
            },
            "blackout": true
        });
        
        var $input = $("#location-zip");
        $input.bind("blur", function(e){
            zipKeyUp({"keyCode": 13}, dialog);
        });
        $input.bind("touchstart", function(e){
            e.stopPropagation();
        });
        
        $input.bind("keyup", function(e){
            zipKeyUp(e, dialog);
        });
        
        $input[0].focus();
    }
    
    function zipKeyUp(e, dialog) {
        var $el = $("#location-zip"),
            value = $el.val();
            
        // if there's no value, do nothing
        if (value == "" ) {
            e && e.preventDefault && e.preventDefault();
            $("#location-zip-name").html("");
            return false;
        }
        
        // if the value isn't numeric, delete non numeric text and then do nothing
        if (isNaN(value)){
            var prevValue = $el.val().replace(/\D/g, '');
            $el.val(prevValue);
            return false;
        }
        
        
        if (e && e.keyCode == 13) {
            Evme.EventHandler.trigger(_name, "zipSearch", {
                "value": value,
                "e": e,
                "dialog": dialog,
                "callback": zipSet
            });
        } else {
            Evme.EventHandler.trigger(_name, "zipValueChanged", {
                "value": value,
                "e": e,
                "callback": zipSearch
            });
        }
    }
    
    function zipSearch(data) {
        var location = "";
        
        if (data.length > 0) {
            var loc = data[0];
            loc.region = (loc.country == "United States" || loc.country == "United Kingdom" || loc.country == "Canada")? loc.state : loc.country;
            
            location = loc.name;
            if (loc.region) {
                location += ', ' + loc.region;
            }
        }
        
        $("#location-zip-name").text(location);
    }
    
    function zipSet(lat, lon, name, dialog) {
        _this.setLocation(lat, lon, name, false);
        animateDialogClose(null, dialog);
    }
    
    function showOSErrorDialog() {
        dialog && dialog.remove() && (dialog = null);
        
        dialog = new Evme.Dialog("location_os_error");
        dialog.show({
            "title": ERROR_CANT_LOCATE_TITLE,
            "content": ERROR_CANT_LOCATE_TEXT,
            "buttons": {
                "cancel": {
                    "text": ERROR_CANT_LOCATE_BUTTON_CANCEL,
                    "remove": true
                },
                "settings": {
                    "text": ERROR_CANT_LOCATE_BUTTON_SETTINGS,
                    "callback": function() {
                        var host = document.location.host;
                        var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
                        Applications.getByOrigin(document.location.protocol + '//settings.' + domain).launch();
                    }
                }
            },
            "blackout": true,
            "tip": true
        });
    }
    
    function animateDialogClose(e, dialog) {
        dialog.getElement().addClass("closed");
        window.setTimeout(dialog.remove, 300);
    }
    
    function cbLocationRequest() {
        _this.showButton();
        Evme.EventHandler.trigger(_name, "requesting");
    }
    
    function cbLocationGot(data) {
        Evme.EventHandler.trigger(_name, "got", {
            "position": data
        });
    }
    
    function cbLocationSet() {
        Evme.EventHandler.trigger(_name, "set", {
            "lat": lat,
            "lon": lon,
            "name": name
        });
    }
    
    function cbError(errorCallback) {
        errorCallback && errorCallback();
        
        Evme.EventHandler.trigger(_name, "error");
    }
};