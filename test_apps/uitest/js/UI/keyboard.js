function keyboardTest() {
  (function designmode(id) {
    var iframe = document.querySelector('#' + id);
    iframe.contentDocument.designMode = 'on';
    iframe.contentDocument.body.textContent = 'Hola supermercado';
  })('iframe-designmode');

  (function contentEditable(id) {
    var iframe = document.querySelector('#' + id);
    iframe.contentDocument.body.setAttribute('contenteditable', true);
    iframe.contentDocument.body.textContent = 'Telebancos por aqui';
  })('iframe-contenteditable');

  var readme = document.getElementById('readme');
  readme.hidden = true;

  document.getElementById('readme_button').addEventListener('click',
    function toggle_readme() {
      readme.hidden = !readme.hidden;
    }
  );
}
window.addEventListener('load', keyboardTest);
