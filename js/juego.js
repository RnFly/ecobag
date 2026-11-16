// Lógica del juego de EcoBag: sesión, mascota, corazones, canje, mochila, glosario y ajustes

const mensaje = document.getElementById("mensaje");
const inputCodigo = document.getElementById("input-codigo");
const PANELES = ["panel-canje", "panel-glosario", "panel-ajustes"];

let perfil = null;        // datos del usuario
let mascotaActual = null; // { id, nivel } de la mascota que está en el jardín
let corazones = 0;
let temporizador = null;

// ---------- Utilidades ----------

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = "mensaje " + tipo; // "error" o "exito"
}

// Imagen fija (la del glosario): img/mascotas/husky.png
function rutaImagen(id) {
  return "img/mascotas/" + id + ".png";
}

// Animación en bucle (jardín y aparición): img/mascotas/animadas/husky.gif
// Si usas otro formato (por ejemplo webp), cambia "gif" por "webp"
const EXT_ANIMADA = "gif";

function rutaAnimada(id) {
  return "img/mascotas/animadas/" + id + "." + EXT_ANIMADA;
}

// Pone la animación; si no existe, usa la imagen fija
function ponerAnimada(img, id) {
  img.onerror = function () {
    img.onerror = null;
    img.src = rutaImagen(id);
  };
  img.src = rutaAnimada(id);
}

// Animación de DESBLOQUEO (cuando la mascota sale del empaque): img/mascotas/desbloqueo/husky.gif
// Si no existe, usa la animación en bucle; y si tampoco, la imagen fija
const EXT_DESBLOQUEO = "gif";

function ponerDesbloqueo(img, id) {
  img.onerror = function () {
    ponerAnimada(img, id);
  };
  // El ?t= hace que la animación se reproduzca desde el inicio cada vez
  img.src = "img/mascotas/desbloqueo/" + id + "." + EXT_DESBLOQUEO + "?t=" + Date.now();
}

// Abre un panel y cierra los demás. Si ya estaba abierto, lo cierra.
function abrirPanel(id) {
  let abierto = false;
  PANELES.forEach(function (p) {
    const el = document.getElementById(p);
    if (p === id) {
      el.classList.toggle("oculto");
      abierto = !el.classList.contains("oculto");
    } else {
      el.classList.add("oculto");
    }
  });
  mensaje.textContent = "";
  return abierto;
}

// ---------- Al abrir la página ----------

async function iniciar() {
  const { data } = await db.auth.getSession();
  if (!data.session) {
    window.location.href = "login.html";
    return;
  }
  await cargarPerfil();
}

async function cargarPerfil() {
  const { data, error } = await db
    .from("perfiles")
    .select("id, nombre_usuario, nivel_usuario, mascota_activa_id")
    .single();

  if (error) {
    mostrarMascotaError("No se pudo cargar tu perfil");
    return;
  }

  perfil = data;
  document.getElementById("nombre-usuario").textContent = perfil.nombre_usuario;
  document.getElementById("nivel-usuario").textContent = perfil.nivel_usuario;

  if (perfil.mascota_activa_id) {
    await mostrarMascota(perfil.mascota_activa_id);
  }
}

function mostrarMascotaError(texto) {
  mostrarMensaje(texto, "error");
}

async function mostrarMascota(id) {
  const { data, error } = await db
    .from("mascotas_usuario")
    .select("nivel, nombre_personalizado, corazones, mascotas(nombre)")
    .eq("mascota_id", id)
    .single();

  if (error) return;

  mascotaActual = { id: id, nivel: data.nivel };
  corazones = data.corazones;

  document.getElementById("nombre-mascota").textContent = data.nombre_personalizado || data.mascotas.nombre;
  document.getElementById("nivel-mascota").textContent = data.nivel;
  document.getElementById("contador-corazones").textContent = corazones;
  ponerAnimada(document.getElementById("img-mascota"), id);

  document.getElementById("sin-mascota").classList.add("oculto");
  document.getElementById("mascota").classList.remove("oculto");
}

// ---------- Corazones (tap en la mascota) ----------

document.getElementById("img-mascota").addEventListener("click", function () {
  if (!mascotaActual) return;

  corazones++;
  document.getElementById("contador-corazones").textContent = corazones;
  lanzarCorazon();

  // Guarda en la base 0.8 s después del último tap (para no hacer una petición por tap)
  clearTimeout(temporizador);
  temporizador = setTimeout(guardarCorazones, 800);
});

async function guardarCorazones() {
  await db
    .from("mascotas_usuario")
    .update({ corazones: corazones })
    .eq("usuario_id", perfil.id)
    .eq("mascota_id", mascotaActual.id);
}

function lanzarCorazon() {
  const corazon = document.createElement("span");
  corazon.className = "corazon-flotante";
  corazon.textContent = "♥";
  corazon.style.marginLeft = (Math.random() * 80 - 40) + "px";
  document.getElementById("zona-mascota").appendChild(corazon);
  setTimeout(function () { corazon.remove(); }, 900);
}

// ---------- Canjear código ----------

document.getElementById("btn-abrir-canje").addEventListener("click", function () {
  if (abrirPanel("panel-canje")) inputCodigo.focus();
});

document.getElementById("btn-canjear").addEventListener("click", async function () {
  const codigo = inputCodigo.value.trim();
  if (codigo === "") {
    mostrarMensaje("Escribe un código", "error");
    return;
  }

  const { data, error } = await db.rpc("canjear_codigo", { p_codigo: codigo });

  if (error) {
    mostrarMensaje("Ocurrió un error: " + error.message, "error");
    return;
  }
  if (!data.ok) {
    mostrarMensaje(data.error, "error");
    return;
  }

  if (data.resultado === "nueva") {
    mostrarMensaje("¡Nueva mascota desbloqueada!", "exito");
  } else if (data.resultado === "subio_nivel") {
    mostrarMensaje("¡Tu mascota subió de nivel!", "exito");
  } else if (data.resultado === "repetida_maxima") {
    mostrarMensaje("Tu mascota ya está en nivel 10. ¡Recibes una semilla rara!", "exito");
  } else {
    mostrarMensaje("¡Código canjeado!", "exito");
  }

  inputCodigo.value = "";
  document.getElementById("panel-canje").classList.add("oculto");
  await cargarPerfil();

  // Si el código dio una mascota, se muestra la animación del empaque
  if (data.mascota_id) {
    await mostrarApertura(data.mascota_id);
  }
});

// ---------- Animación: empaque que se abre ----------

// Cambia estas líneas si usas tus propios archivos:
const IMG_EMPAQUE = "img/empaque.png";          // foto del empaque cerrado
const ANIM_APERTURA = "img/empaque-abre.gif";   // animación de apertura 
const DURACION_APERTURA = 1500;                 // milisegundos que dura tu animación

async function mostrarApertura(id) {
  const { data } = await db.from("mascotas").select("nombre").eq("id", id).single();

  const apertura = document.getElementById("apertura");
  const empaque = document.getElementById("empaque");
  const personaje = document.getElementById("personaje");
  const boton = document.getElementById("btn-continuar");
  const texto = document.getElementById("apertura-texto");

  document.getElementById("nombre-nueva").textContent = data ? data.nombre : "";

  // Estado inicial: empaque cerrado (si no hay foto, se usa un emoji)
  empaque.className = "empaque";
  empaque.textContent = "";
  const imgEmpaque = document.createElement("img");
  imgEmpaque.alt = "Empaque";
  imgEmpaque.onerror = function () { empaque.textContent = "📦"; };
  imgEmpaque.src = IMG_EMPAQUE;
  empaque.appendChild(imgEmpaque);

  personaje.classList.add("oculto");
  boton.classList.add("oculto");
  texto.textContent = "¡Toca el empaque para abrirlo!";
  apertura.classList.remove("oculto");

  function revelar() {
    empaque.classList.add("oculto");
    ponerDesbloqueo(document.getElementById("img-nueva"), id);
    personaje.classList.remove("oculto");
    boton.classList.remove("oculto");
    texto.textContent = mensaje.textContent;
  }

  empaque.onclick = function () {
    empaque.onclick = null;

    // ¿existe tu animación de apertura?
    const prueba = new Image();
    prueba.alt = "Abriendo";
    prueba.onload = function () {
      empaque.classList.add("reproduciendo");
      empaque.textContent = "";
      empaque.appendChild(prueba);
      setTimeout(revelar, DURACION_APERTURA);
    };
    prueba.onerror = function () {
      empaque.classList.add("abriendo"); // animación por defecto
      setTimeout(revelar, 800);
    };
    prueba.src = ANIM_APERTURA + "?t=" + Date.now();
  };
}

document.getElementById("btn-continuar").addEventListener("click", function () {
  document.getElementById("apertura").classList.add("oculto");
});

// ---------- Glosario + "Conoce a tu animalito" (todo desbloqueado desde el inicio) ----------

document.getElementById("btn-glosario").addEventListener("click", async function () {
  if (!abrirPanel("panel-glosario")) return;

  const grid = document.getElementById("grid-glosario");
  document.getElementById("ficha").classList.add("oculto");
  grid.textContent = "Cargando...";

  const { data, error } = await db
    .from("mascotas")
    .select("id, nombre, habitat, dieta, amenazas, como_ayudar")
    .eq("activa", true)
    .order("nombre");

  if (error) {
    grid.textContent = "No se pudo cargar el glosario";
    return;
  }

  grid.textContent = "";
  data.forEach(function (m) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "item-glosario";

    const img = document.createElement("img");
    img.src = rutaImagen(m.id);
    img.alt = m.nombre;

    boton.appendChild(img);
    boton.appendChild(document.createElement("br"));
    boton.appendChild(document.createTextNode(m.nombre));
    boton.addEventListener("click", function () { mostrarFicha(m); });
    grid.appendChild(boton);
  });
});

function mostrarFicha(m) {
  const ficha = document.getElementById("ficha");
  ficha.textContent = "";

  const titulo = document.createElement("h4");
  titulo.textContent = m.nombre;
  ficha.appendChild(titulo);

  agregarLinea(ficha, "Hábitat", m.habitat);
  agregarLinea(ficha, "Qué come", m.dieta);
  agregarLinea(ficha, "Amenazas", m.amenazas);
  agregarLinea(ficha, "Cómo ayudarlo", m.como_ayudar);

  ficha.classList.remove("oculto");
}

function agregarLinea(ficha, titulo, texto) {
  const p = document.createElement("p");
  const negrita = document.createElement("strong");
  negrita.textContent = titulo + ": ";
  p.appendChild(negrita);
  p.appendChild(document.createTextNode(texto || "Próximamente"));
  ficha.appendChild(p);
}

// ---------- Ajustes ----------

document.getElementById("btn-ajustes").addEventListener("click", async function () {
  if (!abrirPanel("panel-ajustes")) return;

  const select = document.getElementById("select-mascota");
  const inputNombre = document.getElementById("input-nombre");

  const { data, error } = await db
    .from("mascotas_usuario")
    .select("mascota_id, nombre_personalizado, mascotas(nombre)");

  if (error || data.length === 0) {
    select.textContent = "";
    inputNombre.value = "";
    document.getElementById("aviso-ajustes").textContent = "Aún no tienes mascotas para configurar";
    return;
  }

  select.textContent = "";
  data.forEach(function (m) {
    const opcion = document.createElement("option");
    opcion.value = m.mascota_id;
    opcion.textContent = m.nombre_personalizado || m.mascotas.nombre;
    if (perfil && m.mascota_id === perfil.mascota_activa_id) opcion.selected = true;
    select.appendChild(opcion);
  });

  inputNombre.value = "";
});

document.getElementById("btn-guardar-ajustes").addEventListener("click", async function () {
  const id = document.getElementById("select-mascota").value;
  const nombre = document.getElementById("input-nombre").value.trim();
  if (!id) return;

  // 1) mascota que aparece en el jardín
  const r1 = await db.from("perfiles").update({ mascota_activa_id: id }).eq("id", perfil.id);

  // 2) nombre nuevo (solo si escribió uno)
  let r2 = { error: null };
  if (nombre !== "") {
    r2 = await db
      .from("mascotas_usuario")
      .update({ nombre_personalizado: nombre })
      .eq("usuario_id", perfil.id)
      .eq("mascota_id", id);
  }

  if (r1.error || r2.error) {
    document.getElementById("aviso-ajustes").textContent = "No se pudieron guardar los cambios";
    return;
  }

  mostrarMensaje("¡Cambios guardados!", "exito");
  document.getElementById("panel-ajustes").classList.add("oculto");
  await cargarPerfil();
});

// ---------- Otros botones ----------

document.getElementById("btn-salir").addEventListener("click", async function () {
  await db.auth.signOut();
  window.location.href = "login.html";
});

document.getElementById("btn-como-jugar").addEventListener("click", function (e) {
  e.preventDefault();
  document.getElementById("ayuda").classList.remove("oculto");
});

document.getElementById("btn-cerrar-ayuda").addEventListener("click", function () {
  document.getElementById("ayuda").classList.add("oculto");
});

// Botones ✕ de las pantallas (glosario y ajustes)
document.querySelectorAll(".cerrar").forEach(function (boton) {
  boton.addEventListener("click", function () {
    document.getElementById(boton.dataset.cerrar).classList.add("oculto");
  });
});

iniciar();