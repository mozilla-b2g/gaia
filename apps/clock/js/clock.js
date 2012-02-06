'use strict';

function choiceChanged(target) {
  var choice = target.dataset.choice;
  if (!choice)
    return;

  var view = document.getElementById(choice + '-view');
  if (!view)
    return;

  var tabs = document.getElementById('tabs').querySelector('fieldset');
  var tabsCount = tabs.childElementCount;
  for (var i = 0; i < tabsCount; i++) {
    var tab = tabs.children[i];
    delete tab.dataset.active;

    var tabView = document.getElementById(tab.dataset.choice + '-view');
    if (tabView)
      tabView.hidden = true;
  }

  target.dataset.active = true;
  view.hidden = false;
}

window.addEventListener('load', function clockLoad(evt) {
  window.removeEventListener('load', clockLoad);

  var readyEvent = document.createEvent('CustomEvent');
  readyEvent.initCustomEvent('appready', true, true, null);
  window.dispatchEvent(readyEvent);
});
