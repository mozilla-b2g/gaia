var picker = document.getElementById('picker');
var values = document.getElementById('values');
picker.onchange = function() {
  values.textContent = `
${picker.value}
R: ${picker.r} G: ${picker.g} B: ${picker.b}
H: ${picker.h.toPrecision(3)} \
S: ${picker.s.toPrecision(3)} \
V: ${picker.v.toPrecision(3)}
`;
};

window.onresize = function() {
  picker.resize();
}
