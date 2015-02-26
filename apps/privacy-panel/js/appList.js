var appPermGetter = [];
var Values = [];

var appClass = document.getElementsByClassName("app-element");
function appPermGen(){
  appsInfoReader = navigator.mozApps.mgmt.getAll();
  appsInfoReader.onsuccess = function(){
    for(i=0;i<appClass.length;i++){
      appPermGetter[i] = this.result[i].manifest;
      if(appPermGetter[i].name == "Send To Bluetooth Device"){
        appPermGetter[i].name = "Bluetooth Transfer"
      }
      if (typeof appPermGetter[i].permissions === "undefined"){
        appPermGetter[i].permissions = {};
      }
      var permNames = Object.keys(appPermGetter[i].permissions);
      var sumTotal = 0;
      for(j=0;j<permNames.length;j++){
        getNumberNow = (localStorage.getItem(permNames[j])) || 0;        
        sumTotal += parseInt(getNumberNow)*5;
      }//console.log(sumTotal/permNames.length);
      document.querySelector("[data-key='" + appPermGetter[i].name + "']").setAttribute("data-perm", (sumTotal / permNames.length) || 0);
      if(Values.length < appClass.length - 2){
        Values.push(document.querySelector("[data-key='" + appPermGetter[i].name + "']").getAttribute("data-perm"));
      }
    }
  }
}

document.getElementById('menu-item-tc').addEventListener('click', function(){
  appPermGen();

});
function permSorter(){
  tinysort('div#tc-appList>ul>li',{order:'desc', data:'perm'});
}
x = 0;

window.watch( "x", function( id, oldVal, newVal ){
  setTimeout(function(){ tinysort('div#tc-appList>ul>li',{order:'desc', data:'perm'}); }, 100);

  return newVal;
});
