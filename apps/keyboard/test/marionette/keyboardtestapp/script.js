'use strict';

document.getElementById('triggerPromptButton').onclick = () => {
  // setTimeout is needed so we don't block marionette itself.
  window.setTimeout(() => {
    var str = window.prompt('The quick brown fox jumps over a', '');
    document.getElementById('promptResult').textContent = str;
  });
};
