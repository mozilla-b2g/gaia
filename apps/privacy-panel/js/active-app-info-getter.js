
navigator.getDataStores('activeappwindow').then(function(stores) {
    stores[0].get(1).then(function(objj){
	    ActiveAppNow = objj;
    })
});

navigator.getDataStores('activeappwindow').then(function(stores) {
  stores[0].onchange = function(e){
    stores[0].get(1).then(function(objj){
        if(ActiveAppNow.Name == objj.Name){
        console.log("same");
        }else{
        ActiveAppNow = objj;
        
        NotifItems = Object.keys(ActiveAppNow.Permissions);
        var LSValue = function(){
            if(localStorage.getItem("PriorityThreshold") == null){
                return 18
            } else {
                return parseInt(localStorage.getItem("PriorityThreshold"));
            }
        };

        THRESHOLD = LSValue();

        var Notifiable;

        Notifiable = NotifItems.every(function(element, index, array) {
        console.log('element:', element);
        NowPermName = localStorage.getItem(element);
        if (NowPermName >= THRESHOLD) {
        new Notification("Privacy Panel",{
            body: "Current app is using " + element
         });
        }

        return true;
        });

        }
    })
  };

});
