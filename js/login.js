
const cajaLogin = document.getElementById("caja-login");
const cajaRegistro = document.getElementById("caja-registro");
const mensaje = document.getElementById("mensaje");
 
function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = "mensaje " + tipo;
}
 
function traducirError(error) {
  const texto = error.message;
  if (texto.includes("Invalid login credentials")) return "Correo o contraseña incorrectos";
  if (texto.includes("already registered")) return "Ese correo ya tiene una cuenta";
  if (texto.includes("at least 6")) return "La contraseña debe tener mínimo 6 caracteres";
  return "Ocurrió un error: " + texto;
}
 
// ---------- Cambiar entre login y registro ----------
 
document.getElementById("ir-registro").addEventListener("click", function () {
  cajaLogin.classList.add("oculto");
  cajaRegistro.classList.remove("oculto");
  mensaje.textContent = "";
});
 
document.getElementById("ir-login").addEventListener("click", function () {
  cajaRegistro.classList.add("oculto");
  cajaLogin.classList.remove("oculto");
  mensaje.textContent = "";
});
 
// ---------- Iniciar sesión ----------
 
document.getElementById("form-login").addEventListener("submit", async function (e) {
  e.preventDefault(); // evita que la página se recargue
 
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
 
  const { error } = await db.auth.signInWithPassword({ email: email, password: password });
 
  if (error) {
    mostrarMensaje(traducirError(error), "error");
    return;
  }
 
  window.location.href = "juego.html";
});
 
// ---------- Registrarse ----------
 
document.getElementById("form-registro").addEventListener("submit", async function (e) {
  e.preventDefault();
 
  const usuario = document.getElementById("reg-usuario").value.trim();
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const password2 = document.getElementById("reg-password2").value;
 
  if (password !== password2) {
    mostrarMensaje("Las contraseñas no coinciden", "error");
    return;
  }
 
  // "data" guarda el nombre de usuario; el trigger de la base lo usa para crear el perfil
  const { data, error } = await db.auth.signUp({
    email: email,
    password: password,
    options: { data: { nombre_usuario: usuario } }
  });
 
  if (error) {
    mostrarMensaje(traducirError(error), "error");
    return;
  }
 
  // Si la confirmación de correo está apagada, ya trae sesión y entra directo
  if (data.session) {
    window.location.href = "juego.html";
  } else {
    mostrarMensaje("Cuenta creada. Revisa tu correo para confirmarla.", "exito");
  }
});
 