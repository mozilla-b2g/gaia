document.getElementById('go').onclick = function _go() {
    var a = new MozActivity({ name: 'test', data: {type: 'text'}});
    a.onsuccess = function() { alert('Success!'); };
    a.onerror = function() { alert('Failure.'); };
};
