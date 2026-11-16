// Carrusel de promociones: cambia solo cada 4.5 s y tiene botones < >
const slides = document.querySelectorAll(".slide");
let actual = 0;

function mostrar(n) {
  actual = n;
  slides.forEach(function (s, i) {
    s.classList.toggle("activo", i === n);
  });
}

function siguiente() {
  mostrar((actual + 1) % slides.length);
}

document.getElementById("prev").addEventListener("click", function () {
  mostrar((actual - 1 + slides.length) % slides.length);
});
document.getElementById("next").addEventListener("click", siguiente);

setInterval(siguiente, 4500);
mostrar(0);
