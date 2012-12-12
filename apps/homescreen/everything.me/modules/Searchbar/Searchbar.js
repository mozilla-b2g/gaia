Evme.Searchbar = new function Evme_Searchbar() {
    var NAME = "Searchbar", self = this,
        el = null, elForm = null, elClear = null, elDefaultText = null,
        value = "", isFocused = false,
        timeoutSearchOnBackspace = null, timeoutPause = null, timeoutIdle = null,
        intervalPolling = null,
        
        DEFAULT_TEXT = "FROM CONFIG",
        BUTTON_CLEAR = "FROM CONFIG",
        SEARCHBAR_POLLING_INTERVAL = 300,
        TIMEOUT_BEFORE_SEARCHING_ON_BACKSPACE = 500,
        TIMEOUT_BEFORE_SENDING_PAUSE_EVENT = "FROM CONFIG",
        TIMEOUT_BEFORE_SENDING_IDLE_EVENT = "FROM CONFIG",
        RETURN_KEY_CODE = 13,
        SET_FOCUS_ON_CLEAR = true,
        BACKSPACE_KEY_CODE = 8,
        DELETE_KEY_CODE = 46;

    this.init = function init(options) {
        !options && (options = {});
        
        el = options.el;
        elDefaultText = options.elDefaultText;
        elForm = options.elForm;
        
        if (typeof options.setFocusOnClear === "boolean") {
            SET_FOCUS_ON_CLEAR = options.setFocusOnClear;
        }
        
        elForm.addEventListener("submit", function oSubmit(e){
            e.preventDefault();
            e.stopPropagation();
            cbReturnPressed(e, el.value);
        });
        
        DEFAULT_TEXT = options.texts.defaultText;
        if (DEFAULT_TEXT) {
            elDefaultText.innerHTML = DEFAULT_TEXT;
        }
        BUTTON_CLEAR = options.texts.clear;
        
        TIMEOUT_BEFORE_SENDING_PAUSE_EVENT = options.timeBeforeEventPause;
        TIMEOUT_BEFORE_SENDING_IDLE_EVENT = options.timeBeforeEventIdle;
        
        el.addEventListener("focus", cbFocus);
        el.addEventListener("blur", cbBlur);
        el.addEventListener("keydown", inputKeyDown);
        el.addEventListener("keyup", inputKeyUp);
        
        var elButtonClear = Evme.$("#button-clear");
        elButtonClear.innerHTML = BUTTON_CLEAR;
        elButtonClear.addEventListener("touchstart", function onTouchStart(e){
            e.preventDefault();
            e.stopPropagation();
            clearButtonClick();
        });
        elButtonClear.addEventListener("click", clearButtonClick);
        
        Evme.EventHandler.trigger(NAME, "init");
    };

    this.getValue = function getValue() {
        return value;
    };
    
    this.setValue = function setValue(newValue, bPerformSearch, bDontBlur) {
        if (newValue !== "") {
            self.showClearButton();
        }
        
        if (value !== newValue) {
            value = newValue;
            el.value = value;

            if (bPerformSearch) {
                if (value === "") {
                    cbEmpty();
                } else {
                    cbValueChanged(value);
                }
            }

            if (!bDontBlur) {
                self.blur();
            }
        }
    };

    this.clear = function clear() {
        self.hideClearButton();
        value = "";
        el.value = "";
    };

    this.focus = function focus() {
        if (isFocused) {
            return;
        }
        
        el.focus();
        cbFocus();
    };

    this.blur = function blur(e) {
        if (!isFocused) return;
        
        el.blur();
        cbBlur(e);
    };
    
    this.getElement = function getElement() {
        return el;
    };

    this.startRequest = function startRequest() {
        pending = true;
    };

    this.endRequest = function endRequest() {
        pending = false;
    };

    this.isWaiting = function isWaiting() {
        return pending;
    };
    
    this.hideClearButton = function hideClearButton() {
        Evme.$("#search-header").classList.remove("clear-visible");
    };
    
    this.showClearButton = function showClearButton() {
        Evme.$("#search-header").classList.add("clear-visible");
    };
    
    function clearButtonClick() {
        self.setValue("", false, true);
        
        if (SET_FOCUS_ON_CLEAR) {
            el.focus();
        }
        
        window.setTimeout(function onTimeout(){
            cbClear();
            cbEmpty();
        }, 0);
        
        Evme.EventHandler.trigger(NAME, "clearButtonClick");
    }
    
    function inputKeyDown(e) {
        // Hack to disable keyboard- must be here to cancel the event
        if (Evme.Brain.Dialog.isActive()) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        window.clearTimeout(timeoutPause);
        window.clearTimeout(timeoutIdle);
    }
    
    function inputKeyUp(e) {
        var currentValue = el.value;
        
        if (currentValue !== value) {
            value = currentValue;

            if (value === "") {
                timeoutSearchOnBackspace && window.clearTimeout(timeoutSearchOnBackspace);
                cbEmpty();
            } else {
                self.showClearButton();
                if (e.keyCode === BACKSPACE_KEY_CODE) {
                    timeoutSearchOnBackspace && window.clearTimeout(timeoutSearchOnBackspace);
                    timeoutSearchOnBackspace = window.setTimeout(function onTimeout(){
                        cbValueChanged(value);
                    }, TIMEOUT_BEFORE_SEARCHING_ON_BACKSPACE);
                } else {
                    cbValueChanged(value);
                }
            }
        } else {
            if (e.keyCode === RETURN_KEY_CODE) {
                cbReturnPressed(e, value);
            }
        }
    }

    function pasted(e) {
        //
         // Setting timeout because otherwise the value of the input is the one
         // before the paste.
         //
        window.setTimeout(function onTimeout(){
            inputKeyUp({
                "keyCode": ""
            });
        }, 0);
    }

    function cbValueChanged(val) {
        timeoutPause = window.setTimeout(cbPause, TIMEOUT_BEFORE_SENDING_PAUSE_EVENT);
        timeoutIdle = window.setTimeout(cbIdle, TIMEOUT_BEFORE_SENDING_IDLE_EVENT);
        
        Evme.EventHandler.trigger(NAME, "valueChanged", {
            "value": val
        });
    }
    
    function cbEmpty() {
        self.hideClearButton();
        Evme.EventHandler.trigger(NAME, "empty", {
            "sourceObjectName": NAME
        });
    }
    
    function cbReturnPressed(e, val) {
        Evme.EventHandler.trigger(NAME, "returnPressed", {
            "e": e,
            "value": val
        });
    }
    
    function cbClear() {
        Evme.EventHandler.trigger(NAME, "clear");
    }
    
    function cbFocus(e) {
        if (isFocused) {
            return;
        }
        isFocused = true;
        
        Evme.Brain && Evme.Brain[NAME].onfocus({
            "e": e
        });
    }
    
    function cbBlur(e) {
        if (!isFocused) {
            return;
        }
        
        isFocused = false;
        
        Evme.Brain && Evme.Brain[NAME].onblur({
            "e": e
        });
    }
    
    function cbPause(e) {
        Evme.EventHandler.trigger(NAME, "pause", {
            "query": value
        });
    }
    
    function cbIdle(e) {
        Evme.EventHandler.trigger(NAME, "idle", {
            "query": value
        });
    }
}