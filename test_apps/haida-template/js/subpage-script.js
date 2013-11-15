// Clicking on the menu button in content page (inside iframe) 
// send a message to the parent window and toggle the menu

window.onload = function() {
  var menuButton = document.querySelector('.portrait-menu');
  menuButton.addEventListener('click', function(){
    window.top.postMessage('toggleMenu', '*');
  });
}