/*
  Haida Template
  
  App template for Haida & Flatfish apps with 'responsive' like 
  approach - sheets on mobile and animated iframes for tablets.

  11.2013 Michal Budzynski (@michalbe)
*/

/****************
 *** APP PART ***
 ****************/

window.onload = function() {
  // attach listeners to the menu list
  var menuElements = document.querySelectorAll('.menu-list a');
  for (var i = 0, j = menuElements.length; i<j; i++) {
    menuElements[i].addEventListener ('click', function (evt) { 
    
      var element = evt.target;
      while(!element.dataset.href) {
        element = element.parentNode;
      }
      
      // in Haida pattern we open new panel using 
      // 'window.open' function
      window.open(element.dataset.href + '.html');

    });
  }
}

/*********************
 *** TEMPLATE PART ***
 *********************/

// Backup of the real 'window'open' function, 
// it could be useful in case we want to build
// responsive app that will change behavior in 
// landscape/portrait modes during the runtime 
// (without restart)
var oldWindowOpen = window.open;

// New 'window.open' function will not open 
// the popup window (or new sheet in Haida), 
// but just render the site in an iframe
var tabletWindowOpen = function(url) {
  document.getElementById('contentFrame').src = url;
}

// We need to know if we are in tablet 
// or mobile environment
var mediaQuery = window.matchMedia( "(min-width: 590px)" );

// in case we are on tablet we want to render 
// all the needed elements (like iframe), because 
// we don't want them to exist in mobile
if (mediaQuery.matches) {
  var section = document.createElement('section');
  section.role = 'region';
  section.dataset.position = 'right';
  section.className = "content-page current";
  
  var iframe = document.createElement('iframe');
  iframe.style.width = '67%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.background = 'transparent';
  iframe.id = 'contentFrame';
  
  section.appendChild(iframe);
  document.body.appendChild(section);
  
  // And we overwrite 'window.open' with our 
  // function declared above
  window.open = tabletWindowOpen;
}

// When message from the iframe is received, we 
// show/hide the menu, somehow classList.toggle() 
// doesn't want to work here (?)
window.addEventListener('message', function(evt) {
  if (evt.data === 'toggleMenu' && section) {
    if (section.classList.contains('menuShowed')) {
        section.classList.remove('menuShowed');
    } else {
      section.classList.add('menuShowed');
    }
  }
});
