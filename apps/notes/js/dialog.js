function dialog(title, options, callback) {
    var optionsHTML = '',
        CANCEL_BUTTON = "Cancel";
    
    if (!(options instanceof Array)) {
        options = [options];
    }
    
    for (var i=0; i<options.length; i++) {
        optionsHTML += '<li><button data-index="' + i + '">' + options[i] + '</button></li>';
    }
    optionsHTML += '<li><button data-index="-1">' + CANCEL_BUTTON + '</button></li>';
    
    var html = '<menu class="actions">' +
                  '<h3>' + title + '</h3>' +
                  '<ul>' + optionsHTML + '</ul>' +
                '</menu>';
     
     var el = document.createElement("section");
     el.id = "_system_dialog";
     el.setAttribute("role", "dialog");
     el.innerHTML = html;
     el.addEventListener("click", onClick);
     
     removeCurrent();
     document.body.appendChild(el);
     
     function removeCurrent() {
        var el = document.getElementById("_system_dialog");
        if (el) {
            el.removeEventListener("click", onClick);
            el.parentNode.removeChild(el);
        }
     }
     
     function onClick(e) {
         var elClicked = e.target;
         if (elClicked.nodeName !== "BUTTON") return;
         
         el.removeEventListener("click", onClick);
         el.parentNode.removeChild(el);
         
         if (elClicked.dataset.index != -1) {
             callback(elClicked.dataset.index);
         }
     }
}