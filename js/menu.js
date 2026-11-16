// Abre y cierra el menú lateral (hamburguesa). Lo usan todas las páginas.
const botonMenu = document.getElementById("btn-menu");
const menuLateral = document.getElementById("menu-lateral");
 
botonMenu.addEventListener("click", function () {
  menuLateral.classList.toggle("abierto");
});
 