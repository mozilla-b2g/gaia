
window.addEventListener('localized', function startup(evt) {
  window.removeEventListener('localized', startup);
  //CHANGE "Localized EVENT" with "LOAD" for testing in Desktop browser
  // window.addEventListener('load', function startup(evt) {

  /******************************/
  var URI = 'http://m.wikipedia.com';
  /******************************/

  // Retrieve IFRAME
  var iframe = document.getElementById('app');

  // Variables for controlling app status
  var loaded = false;
  var backShowed = false;
  var forwardShowed = false;

  // Get SPLASH control based on load
  iframe.addEventListener('load',function(){
    if(!loaded){
      loaded = true;
      // document.getElementById('app-container').classList.toggle('hide-element');
      document.getElementById('splash').classList.toggle('nodisplay');
      // document.getElementById('splash').classList.toggle('hide-element'); 
    }
    
  });

  // Set URL in iframe
  iframe.src = URI;

  // Manage hash change in iFrame
  iframe.addEventListener('mozbrowserlocationchange',function(){
    iframe.getCanGoBack().onsuccess = function(e) {
      
      if(e.target.result == true) {
        if(!backShowed){
          document.getElementById('back').classList.toggle('nodisplay');
          backShowed = true;
        }
      }else{
        document.getElementById('back').classList.toggle('nodisplay');
        backShowed = false;
      }
      
    }
    iframe.getCanGoForward().onsuccess = function(e) {
      if(e.target.result == true) {
        if(!forwardShowed){
          document.getElementById('forward').classList.toggle('nodisplay');
          forwardShowed = true;
        }
        
      }else{
        if(forwardShowed){
          document.getElementById('forward').classList.toggle('nodisplay');
          forwardShowed = false;
        }
      }
      
    }
    
  });
  document.getElementById('back').addEventListener('click',function(event){
    iframe.getCanGoBack().onsuccess = function(e) {
      if(e.target.result == true) {
	      iframe.goBack();
      }
    }
  });

  document.getElementById('forward').addEventListener('click',function(event){
    iframe.getCanGoForward().onsuccess = function(e) {
      if(e.target.result == true) {
        iframe.goForward();
      }
    }
    
  });

  document.getElementById('splash').addEventListener("transitionend", function() {
    document.getElementById('splash').classList.toggle('hide-element');
    document.getElementById('app-container').classList.toggle('nodisplay');
  }, true); 

  
  
 
});