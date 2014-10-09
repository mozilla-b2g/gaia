function pick(type) {
  var data = {type: type};
  var a = new MozActivity({ name: 'pick', data: data});
  a.onsuccess = function(e) {
    var result = document.getElementById('result');
    result.textContent = a.result.name + ' ' + a.result.type + ' (' +
                         a.result.size + ')';
  };
}

document.getElementById('b1').onclick = function() { 
  pick('application/*');
};
