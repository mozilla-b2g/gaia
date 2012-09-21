Evme.Connection = new function() {
    
    var _name = "Connection", _this = this,
            $el = null;
            
    var EL_ID = "connection-message",
        CLASS_NO_CONNECTION = "connection-error",
        DEFAULT_MESSAGE = "FROM CONFIG";
    
    this.init = function(options) {
        !options && (options = {});
        
        $parent = options.$parent;
        
        DEFAULT_MESSAGE = options.texts.defaultMessage;
        
        window.addEventListener(Evme.Utils.CONNECTION.EVENT_ONLINE, function(){
            Evme.EventHandler.trigger(_name, "online");
        });
        window.addEventListener(Evme.Utils.CONNECTION.EVENT_OFFLINE, function(){
            Evme.EventHandler.trigger(_name, "offline");
        });
        
        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.show = function(message) {
        if ($el) return;
        
        $el = $('<div id="' + EL_ID + '">' + (message || DEFAULT_MESSAGE) + '</div>');
        $parent.append($el);
        $el.css("margin-top", -$el.height()/2 + "px");
        
        window.setTimeout(function(){
            $parent.addClass(CLASS_NO_CONNECTION);
            Evme.EventHandler.trigger(_name, "show");
        }, 0);
    };
    
    this.hide = function() {
        if (!$el) return;
        
        $parent.removeClass(CLASS_NO_CONNECTION);
        
        window.setTimeout(function(){
            $el.remove();
            $el = null;
            Evme.EventHandler.trigger(_name, "hide");
        }, 0);
    };
};