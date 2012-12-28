Evme.ConnectionMessage = new function Evme_ConnectionMessage() {
    var NAME = "ConnectionMessage", self = this,
        
        CLASS_NO_CONNECTION = "connection-error";
    
    this.init = function init(options) {
        !options && (options = {});
        
        Evme.EventHandler.trigger(NAME, "init");
    };
    
    this.show = function show(elParent, l10Key, l10Args) {
        if (Evme.$('.connection-message', elParent).length > 0) {
            return;
        }
        
        var el = Evme.$create('div', {
                'class': "connection-message",
                'data-l10n-id': Evme.Utils.l10nKey(NAME, l10Key),
                'data-l10n-args': JSON.stringify(l10Args)
            });
            
        elParent.appendChild(el);
        el.style.cssText = "margin-top: " + (-el.offsetHeight/2) + "px";
        elParent.classList.add(CLASS_NO_CONNECTION);
        
        Evme.EventHandler.trigger(NAME, "show");
    };
    
    this.hide = function hide() {
        var elMessages = Evme.$('.connection-message');
        for (var i=0, el; el=elMessages[i++];) {
            el.parentNode.classList.remove(CLASS_NO_CONNECTION);
            Evme.$remove(el);
        }
        
        Evme.EventHandler.trigger(NAME, "hide");
    };
};