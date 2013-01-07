Evme.ConnectionMessage = new function() {
    var _name = "ConnectionMessage", _this = this,
        $el = null;
            
    var CLASS_NO_CONNECTION = "connection-error",
        DEFAULT_MESSAGE = "FROM CONFIG";
    
    this.init = function(options) {
        !options && (options = {});
        
        DEFAULT_MESSAGE = options.texts.defaultMessage;
        
        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.show = function(message, $parent) {
        if ($parent.find('.connection-message').length > 0) return;
        
        var $el = $('<div class="connection-message">' + (message || DEFAULT_MESSAGE) + '</div>');
        $parent.append($el);
        $el.css("margin-top", -$el.height()/2 + "px");
        $parent.addClass(CLASS_NO_CONNECTION);
        
        Evme.EventHandler.trigger(_name, "show");
    };
    
    this.hide = function() {
        var $messages = $('.connection-message');
        for (var i=0,l=$messages.length; i<l; i++) {
            var $el = $($messages[i]);
            $el.parent().removeClass(CLASS_NO_CONNECTION);
            $el.remove();
        }
        
        Evme.EventHandler.trigger(_name, "hide");
    };
};