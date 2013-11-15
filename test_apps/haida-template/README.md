# Haida Template

App template for Haida & Flatfish apps with 'responsive' like approach - sheets on mobile and animated iframes for tablets with the same codebase.

## Why?

[Haida](https://wiki.mozilla.org/FirefoxOS/Haida) is a full concept that aims to propose a radically different user experience in line with the [DNA of Mozilla](https://etherpad.mozilla.org/haida-summit). One of the main features introduced by Haida is in-apps gesture based navigation with 'sheets' - instead of keeping all the app content in one HTML file, Haida uses `window.open` method (for now) to spawn separate sheets for different panels. User can simply navigate between the sheets with swipe gestures. 

In the same time sheets pattern on tablets is not as useful as on mobile. With bigger resolution we don't have any banefits of using gestures to navigate between content. Instead of spawning a new sheet, `window.open` method will open the content in the iframe, like on the image below:

![Haida Template on different devices](http://images.virtualdesign.pl/images/46457Haida_FlatfishdemoApp.png)

## How?

Using simple [media query match](https://developer.mozilla.org/en-US/docs/Web/API/Window.matchMedia) in `script.js` determine if we are in tablet or mobile. In tablet mode we create iframe and overwrite the `window.open` function to update the iframe's source instead of opening new sheet. Apps that are properly prepared for Haida pattern should now work on tablets with the same codebase but different behavior.

## Todo

 * implement [Haida](https://wiki.mozilla.org/FirefoxOS/Haida) sheets in Popup Manager.
 * expose responsive functions to the shared files (?)