function next(stream_url) {
  var x = new XMLHttpRequest();
  x.onreadystatechange = function() {
    if(x.readyState !== 4) return;
    eval(x.responseText);
  };
  x.open("GET", "http://gaiamobile.org:8080/marionette" + window.location.search);
  x.send();
}

function msg(m) {
  var child = document.createElement("p");
  child.appendChild(document.createTextNode(JSON.stringify(m)))
  document.body.appendChild(child);
};

function cmd(form) {
  var x = new XMLHttpRequest();
  x.onreadystatechange = function() {
    if (x.readyState !== 4) return;
    console.log(x.responseText)
  };
  x.open("PUT", "");
  x.send(form.cmd.value);
}

window.onload = function() {
 var f = document.getElementById("cmd_form");
 f.addEventListener("submit", function (evt) {
  evt.preventDefault();
  try { cmd(f) } catch(e) { console.log(e) }
 });
 next("http://gaiamobile.org:8080/marionette" + window.location.search);
}
