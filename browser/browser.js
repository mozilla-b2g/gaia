window.onload = function() {
  var go = document.getElementById("browser-go-button");
  go.addEventListener("click", Browser.navigate, false);

}

var Browser = {
  navigate: function(event) {
    var url = document.getElementById("browser-url").value;
    var iframe = document.getElementById("browser-iframe");
    iframe.setAttribute("src", url);
    event.preventDefault();
  }
}
