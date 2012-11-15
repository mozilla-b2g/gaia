Evme.Dialog = function Evme_Dialog(_id) {
    var NAME = "Dialog", self = this,
        el = null, elBlackout = null,
        id = _id, isBlackout = false, blackoutCallback = null, centered = false,
        waitingOnCloseTimeout = false, timeoutBeforeClickThrough = false;
    
    if (!id) {
        throw new Exception("Please provide an ID for the dialog");
    }
    
    this.getId = function getId() {
        return id;
    };
    
    this.show = function show(options) {
        if (el) {
            window.setTimeout(function onTimeout(){
                el.classList.add("visible");
                elBlackout && elBlackout.classList.add("visible");
            }, 50);
            
            if (centered) {
                self.center();
            }
            
            cbShow();
            
            if (timeoutBeforeClickThrough) {
                waitingOnCloseTimeout = true;
                window.setTimeout(function onTimeout() {
                    waitingOnCloseTimeout = false;
                }, timeoutBeforeClickThrough);
            }
        } else {
            createDialog(options);
        }
        
        return self;
    };
    
    this.remove = function remove() {
        Evme.$remove(el);
        Evme.$remove(elBlackout);
        
        cbRemove();
    };
    
    this.center = function center() {
        el.style.cssText += 'top: 50%; margin-top: ' + -el.offsetHeight/2 + 'px;';
    };
    
    this.getElement = function getElement() {
        return el;
    };
    
    this.clickOK = function clickOK() {
        Evme.$('b.ok', el, function onElement(el){
            //el.ontouchstart();
        });
    };
    
    this.clickCancel = function clickCancel() {
        Evme.$('b.cancel', el, function onElement(el){
            el.click();
        });
    };
    
    function createDialog(options) {
        (!options.className) && (options.className = "");
        
        el = Evme.$create('div', {'class': 'dialog ' + options.className, 'id': 'dialog_' + id},
                    ((options.title)? '<h2>' + options.title + '</h2>' : '') +
                    '<div class="content">' +
                        options.content +
                    '</div>');
                
        el.addEventListener("touchstart", function onTouchStart(e){
            e.preventDefault();
            e.stopPropagation();
        });
        
        if (options.tip) {
            el.appendChild(Evme.$create('span', {'class': "tiparrow"}));
        }
        
        if (options.buttons) {
            var buttons = options.buttons,
                elButtons = Evme.$create('div', {'class': "buttons"});
                
            for (var buttonId in buttons) {
                elButtons.appendChild(createButton(buttonId, buttons[buttonId]));
            }
            
            el.appendChild(elButtons);
        }
        
        centered = options.centered;
        isBlackout = options.blackout;
        timeoutBeforeClickThrough = options.timeoutBeforeClickThrough;
        
        var elContainer = options.elContainer || Evme.Utils.getContainer();
        elContainer.appendChild(el);
        
        if (isBlackout) {
            createBlackoutScreen(options.blackoutCallback);
            elContainer.append(elBlackout);
        }
        
        cbCreate();
        self.show();
        
        return self;
    }
    
    function createBlackoutScreen(callback) {
        elBlackout = Evme.$create('div', {'class': "dialog-blackout"});
        elBlackout.addEventListener("touchstart", function onTouchStart(e){
            if (!waitingOnCloseTimeout) {
                callback && callback(e);
                cbBlackoutClick(e);
            }
        });
                    
        return elBlackout;
    }
    
    function createButton(buttonType, button) {
        var elButton = Evme.$create('b', {'class': 'button ' + buttonType}, button.text);
        
        function buttonCallback(e){
            e.preventDefault();
            e.stopPropagation();
            
            button.callback && button.callback(e, self);
            
            cbButtonClick(e, buttonType);
            
            if (button.remove) {
                self.remove();
            }
        }
        
        elButton.addEventListener("touchstart", buttonCallback);
            
        if (button.entireDialog) {
            el.addEventListener("touchstart", function onTouhStart(e){
                if (!waitingOnCloseTimeout) {
                    buttonCallback(e);
                }
            });
        }
        
        return elButton;
    }
    
    function cbCreate() {
        Evme.EventHandler.trigger(NAME, "create", {
            "id": id,
            "obj": self,
            "isBlackout": isBlackout,
            "el": el
        });
    }
    
    function cbShow() {
        Evme.EventHandler.trigger(NAME, "show", {
            "id": id,
            "obj": self,
            "isBlackout": isBlackout,
            "el": el
        });
    }
    
    function cbBlackoutClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        Evme.EventHandler.trigger(NAME, "blackoutClick", {
            "id": id
        });
    }
    
    function cbButtonClick(e, button) {
        Evme.EventHandler.trigger(NAME, "buttonClick", {
            "e": e,
            "id": id,
            "obj": self,
            "el": el,
            "button": button
        });
    }
    
    function cbRemove() {
        Evme.EventHandler.trigger(NAME, "remove", {
            "id": id,
            "obj": self,
            "isBlackout": isBlackout,
            "el": el
        });
    }
};

Evme.Prompt = function Evme_Prompt(_options) {
    var NAME = "Prompt", self = this,
        elParent = null, el = null,
        id = "", text = "", className = "", storageKey = false,
        onShow = null, onClick = null, onDismiss= null;
    
    var STORAGE_PREFIX = "prompt_";
    
    this.show = function show(options) {
        id = options.id;
        text = options.text;
        className = options.className;
        elParent = options.elParent;
        onShow = options.onShow;
        onClick = options.onClick;
        onDismiss = options.onDismiss;
        
        storageKey = STORAGE_PREFIX + id;
        
        var shown = Evme.Storage.enabled() && Evme.Storage.get(storageKey);
        if (shown) {
            return false;
        }
        if (Evme.$("#" + storageKey)) {
            return false;
        }
        
        el = Evme.$create('div;', {'id': storageKey, 'class': 'prompt textpage ' + (className? className : '')}, text + '<b class="close"></b>');
        el.addEventListener("touchstart", function onTouchStart(e) {
            e && e.preventDefault();
            e && e.stopPropagation();
            
            cbClick();
        });
        
        Evme.$(".close", el)[0].addEventListener("touchstart", function onTouchStart(e){
            e && e.preventDefault();
            e && e.stopPropagation();
            
            self.hide(true);
        });
        
        elParent.append(el);
        
        window.setTimeout(function onTimeout(){
            el.classList.add("visible");
            
            cbShow();
        }, 50);
        
        return true;
    };
    
    this.hide = function hide(fireCallback) {
        el.classList.remove("visible");
        
        window.setTimeout(function onTimeout(){
            Evme.$remove(el);
        }, 500);
        
        if (fireCallback) {
            cbDismiss();
        }
    };
    
    this.markAsShown = function markAsShown() {
        Evme.Storage.set(storageKey, true);
    };
    
    function cbShow() {
        onShow && onShow();
        
        Evme.EventHandler.trigger(NAME, "show", {
            "id": id,
            "text": text
        });
    }
    function cbClick() {
        onClick && onClick();
        
        Evme.EventHandler.trigger(NAME, "click", {
            "id": id,
            "text": text
        });
    }
    function cbDismiss() {
        onDismiss && onDismiss();
        
        Evme.EventHandler.trigger(NAME, "dismiss", {
            "id": id,
            "text": text
        });
    }
    
    _options && self.show(_options);
};