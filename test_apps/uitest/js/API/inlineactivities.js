document.getElementById('go').onclick = function _go() {
  var a = new MozActivity(
    {
      name: 'test-inline',
      data: {
      }
    }
  );

  a.onsuccess = function() {
    document.getElementById('result').textContent = this.result.text;
  };

  a.onerror = function() {
    document.getElementById('result').textContent = '(canceled)';
  };
};
