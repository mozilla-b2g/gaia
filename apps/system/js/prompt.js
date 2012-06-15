'use strict';

(function(){
    window.addEventListener('mozbrowsershowmodalprompt', function(ev){
      ev.preventDefault();
      switch (ev.detail.promptType) {
        case 'alert':
          document.getElementById('alert').classList.add('visible');
          document.getElementById('alert-ok').addEventListener('click', function confirm_click(){
            ev.detail.returnValue = document.getElementById('alert-input').value;
            document.getElementById('alert').classList.remove('visible');
            ev.unblock();
          });
        break;
        case 'prompt':
          document.getElementById('prompt').classList.add('visible');
          document.getElementById('prompt-input').value = ev.detail.initialValue;
          document.getElementById('prompt-ok').addEventListener('click', function prompt_click(){
            ev.detail.returnValue = document.getElementById('prompt-input').value;
            document.getElementById('prompt').classList.remove('visible');
            console.log('=== 2222 ====');
            console.log('=== '+ev.detail.message+' ====');
            ev.unblock();
          });
          document.getElementById('prompt-message').textContent = ev.detail.message;
          break;
        case 'confirm':
          document.getElementById('confirm').classList.add('visible');
          document.getElementById('confirm-message').textContent = ev.detail.message;
          document.getElementById('confirm-ok').addEventListener('click', function confirm_click(){
            document.getElementById('confirm').classList.remove('visible');
            ev.detail.returnValue = true;
            console.log('=== 1111 ====');
            ev.unblock();
          });
          break;
      }
  });
})();
