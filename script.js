/* ========================================================
   NELIDA FEM - TIENDA PUBLICA
   Supabase + Catalogo + Carrito + WhatsApp movil y escritorio
   ======================================================== */
"use strict";

const WHATSAPP_POR_DEFECTO = "51972491860";
const CLAVE_CARRITO = "nelida-fem-carrito-supabase-v1";
const CLAVE_FAVORITOS = "nelida-fem-favoritos-v1";

let productos = [];
let carrito = leerCarrito();
let favoritos = leerFavoritos();
let filtroActivo = "todos";
let numeroWhatsApp = WHATSAPP_POR_DEFECTO;

const $ = (id) => document.getElementById(id);

// Se utilizan caracteres Unicode para evitar emojis danados al copiar.
const EMOJI = {
  bolsa: "\u{1F6CD}\uFE0F",
  corazon: "\u{1F497}",
  prenda: "\u{1F455}",
  talla: "\u{1F4CF}",
  cantidad: "\u{1F522}",
  dinero: "\u{1F4B0}",
  subtotal: "\u{1F4B5}",
  paquete: "\u{1F4E6}",
  brillo: "\u2728"
};

function soles(valor) {
  return `S/ ${new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(valor) || 0)}`;
}

/* 1. CARRITO GUARDADO EN EL NAVEGADOR */

function leerCarrito() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || "[]");
    if (!Array.isArray(datos)) return [];

    return datos.filter((item) =>
      item && typeof item.id === "string" &&
      typeof item.talla === "string" &&
      Number.isInteger(item.cantidad) &&
      item.cantidad >= 1 && item.cantidad <= 99
    );
  } catch {
    return [];
  }
}

function guardarCarrito() {
  try {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  } catch (error) {
    console.warn("No se pudo guardar el carrito:", error);
  }
}

/* 2. FAVORITOS: SE GUARDAN EN ESTE NAVEGADOR */

function leerFavoritos() {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_FAVORITOS) || "[]");
    if (!Array.isArray(guardados)) return [];
    return [...new Set(guardados.filter((id) =>
      typeof id === "string" && id.length > 0 && id.length <= 100
    ))];
  } catch (error) {
    console.warn("No se pudieron recuperar los favoritos:", error);
    return [];
  }
}

function guardarFavoritos() {
  try {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(favoritos));
  } catch (error) {
    console.warn("No se pudieron guardar los favoritos:", error);
  }
}

function esFavorito(id) {
  return favoritos.includes(String(id));
}

function actualizarContadorFavoritos() {
  // El contador incluye únicamente prendas publicadas actualmente.
  const total = favoritos.filter((id) => !!productoPorId(id)).length;
  $("contador-favoritos").textContent = String(total);
  $("abrir-favoritos").setAttribute(
    "aria-label", `Ver mis prendas favoritas (${total})`
  );
}

function alternarFavorito(id) {
  const producto = productoPorId(id);
  if (!producto) return;

  const identificador = String(id);
  if (esFavorito(identificador)) {
    favoritos = favoritos.filter((actual) => actual !== identificador);
  } else {
    favoritos.push(identificador);
  }
  guardarFavoritos();
  actualizarContadorFavoritos();
  renderizarProductos();
}

/* 3. UTILIDADES */

function categoriaNormalizada(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function imagenValida(ruta) {
  return typeof ruta === "string" && (
    /^https:\/\//i.test(ruta) ||
    /^assets\/[\w./-]+$/i.test(ruta)
  );
}

function elemento(etiqueta, clase = "", texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = String(texto);
  return nodo;
}

function productoPorId(id) {
  return productos.find((p) => p.id === id);
}

function cantidadProducto(id) {
  return carrito.reduce((total, item) =>
    total + (item.id === id ? item.cantidad : 0), 0);
}

function crearFoto(ruta, clase, nombre = "Prenda") {
  const caja = elemento("div", clase);
  const sustituto = elemento("span", "foto-sustituta", EMOJI.prenda);
  caja.append(sustituto);

  if (imagenValida(ruta)) {
    const imagen = document.createElement("img");
    imagen.src = ruta;
    imagen.alt = `Fotografia de ${nombre}`;
    imagen.loading = "lazy";
    imagen.onload = () => sustituto.remove();
    imagen.onerror = () => imagen.remove();
    caja.append(imagen);
  }
  return caja;
}

/* 3. STOCK Y TOTALES */

function limpiarCarritoDesactualizado() {
  const nuevo = [];
  const acumulados = new Map();

  for (const item of carrito) {
    const p = productoPorId(item.id);
    if (!p || !p.tallas.includes(item.talla)) continue;

    const usado = acumulados.get(item.id) || 0;
    const cantidad = Math.min(item.cantidad, 99, p.stock - usado);
    if (cantidad <= 0) continue;

    const existente = nuevo.find((x) => x.id === item.id && x.talla === item.talla);
    if (existente) {
      const adicional = Math.min(99 - existente.cantidad, cantidad);
      existente.cantidad += adicional;
      acumulados.set(item.id, usado + adicional);
    } else {
      nuevo.push({ id: item.id, talla: item.talla, cantidad });
      acumulados.set(item.id, usado + cantidad);
    }
  }

  carrito = nuevo;
  guardarCarrito();
}

function totalPedido() {
  return carrito.reduce((total, item) => {
    const p = productoPorId(item.id);
    return total + (p ? p.precio * item.cantidad : 0);
  }, 0);
}

/* 4. TEXTO BONITO PARA WHATSAPP */

function textoPedido() {
  const separador = "\u2501".repeat(16);
  const prendas = carrito.map((item, indice) => {
    const p = productoPorId(item.id);
    if (!p) return null;

    return [
      `${EMOJI.prenda} *${indice + 1}. ${p.nombre}*`,
      "",
      `${EMOJI.talla} Talla: ${item.talla}`,
      `${EMOJI.cantidad} Cantidad: ${item.cantidad}`,
      `${EMOJI.dinero} Precio unitario: ${soles(p.precio)}`,
      `${EMOJI.subtotal} Subtotal: *${soles(p.precio * item.cantidad)}*`
    ].join("\n");
  }).filter(Boolean);

  return [
    `${EMOJI.bolsa} *NUEVO PEDIDO - NELIDA FEM*`,
    "",
    `\u00A1Hola! ${EMOJI.corazon} Quisiera realizar el siguiente pedido:`,
    "",
    separador,
    prendas.join(`\n${separador}\n`),
    separador,
    "",
    `${EMOJI.corazon} *TOTAL DEL PEDIDO: ${soles(totalPedido())}*`,
    "",
    `${EMOJI.paquete} \u00BFPodrian confirmarme la disponibilidad de las prendas y como realizar el pago?`,
    "",
    `\u00A1Muchas gracias! ${EMOJI.brillo}`
  ].join("\n");
}

/* 5. ENLACE ADAPTADO AL DISPOSITIVO */

function esDispositivoMovil() {
  return /Android|iPhone|iPad|iPod|Windows Phone|IEMobile|Mobile/i
    .test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function enlaceWhatsApp(mensaje) {
  const numero = String(numeroWhatsApp).replace(/\D/g, "");
  const texto = encodeURIComponent(mensaje);

  // En celular, enlace universal para abrir WhatsApp instalado.
  if (esDispositivoMovil()) {
    return `https://wa.me/${numero}?text=${texto}`;
  }

  // En computadora, mantenemos WhatsApp Web: los emojis funcionaron ahi.
  return `https://web.whatsapp.com/send?phone=${numero}&text=${texto}`;
}

function configurarEnlaceWhatsApp(enlace, mensaje, habilitado = true) {
  enlace.href = habilitado ? enlaceWhatsApp(mensaje) : "#";
  // En celular no se abre una pestana adicional para facilitar la app.
  enlace.target = esDispositivoMovil() ? "_self" : "_blank";
  enlace.rel = "noopener noreferrer";
}

/* 6. MOSTRAR PRODUCTOS */

function renderizarProductos() {
  const catalogo = $("catalogo");
  catalogo.replaceChildren();

  const visibles = productos.filter((p) =>
    filtroActivo === "todos" ||
    (filtroActivo === "favoritos" && esFavorito(p.id)) ||
    categoriaNormalizada(p.categoria) === filtroActivo
  );

  $("cantidad-productos").textContent =
    `${visibles.length} ${visibles.length === 1 ? "producto" : "productos"}`;

  $("estado-productos").hidden = visibles.length > 0;
  $("volver-catalogo").hidden = visibles.length > 0 || filtroActivo !== "favoritos";
  if (!visibles.length) {
    $("estado-productos").textContent = filtroActivo === "favoritos"
      ? "Aún no tienes favoritos. Pulsa ♡ en las prendas que te gusten para guardarlas aquí."
      : "No hay publicaciones disponibles en esta categoría.";
  }

  for (const p of visibles) {
    const tarjeta = elemento("article", "producto");
    const foto = crearFoto(p.imagen, "producto-foto", p.nombre);
    const disponible = p.stock > 0 && p.tallas.length > 0;

    foto.append(elemento("span", "insignia", disponible ? "Disponible" : "Agotado"));

    // El corazón guarda la prenda sin agregarla al carrito.
    const marcado = esFavorito(p.id);
    const botonFavorito = elemento(
      "button",
      marcado ? "boton-corazon seleccionado" : "boton-corazon",
      marcado ? "♥" : "♡"
    );
    botonFavorito.type = "button";
    botonFavorito.title = marcado ? "Quitar de favoritos" : "Guardar en favoritos";
    botonFavorito.setAttribute(
      "aria-label", `${marcado ? "Quitar de" : "Guardar en"} favoritos: ${p.nombre}`
    );
    botonFavorito.setAttribute("aria-pressed", String(marcado));
    botonFavorito.addEventListener("click", () => alternarFavorito(p.id));
    foto.append(botonFavorito);

    const detalles = elemento("div", "producto-informacion");
    detalles.append(
      elemento("p", "categoria-producto", p.categoria),
      elemento("h3", "", p.nombre),
      elemento("p", "precio", soles(p.precio)),
      elemento("p", "descripcion", p.descripcion || "Prenda de Nelida FEM")
    );

    const label = elemento("label", "", "Selecciona tu talla");
    const select = elemento("select");
    select.id = `talla-${p.id}`;
    label.htmlFor = select.id;

    for (const talla of p.tallas) {
      const opcion = elemento("option", "", talla);
      opcion.value = talla;
      select.append(opcion);
    }
    select.disabled = !disponible;

    const boton = elemento("button", "boton-principal boton-agregar",
      disponible ? "+ Agregar al carrito" : "No disponible");
    boton.type = "button";
    boton.disabled = !disponible;
    boton.addEventListener("click", () => agregarAlCarrito(p.id, select.value));

    detalles.append(
      label,
      select,
      boton,
      elemento("p", "stock-producto",
        p.stock > 0 ? `Stock referencial: ${p.stock} unidades` : "Sin stock")
    );
    tarjeta.append(foto, detalles);
    catalogo.append(tarjeta);
  }
}

/* 7. MODIFICAR CARRITO */

function agregarAlCarrito(id, talla) {
  const p = productoPorId(id);
  if (!p || !p.tallas.includes(talla)) return;

  if (cantidadProducto(id) >= p.stock) {
    alert("No hay mas unidades disponibles de esta prenda.");
    return;
  }

  const item = carrito.find((x) => x.id === id && x.talla === talla);
  if (item) {
    if (item.cantidad >= 99) return;
    item.cantidad++;
  } else {
    carrito.push({ id, talla, cantidad: 1 });
  }

  guardarCarrito();
  renderizarCarrito();
  abrirCarrito();
}

function cambiarCantidad(id, talla, accion) {
  const item = carrito.find((x) => x.id === id && x.talla === talla);
  const p = productoPorId(id);
  if (!item || !p) return;

  if (accion === "quitar" || (accion === "restar" && item.cantidad === 1)) {
    carrito = carrito.filter((x) => x !== item);
  } else if (accion === "sumar") {
    if (cantidadProducto(id) < p.stock && item.cantidad < 99) item.cantidad++;
  } else if (accion === "restar") {
    item.cantidad--;
  }

  guardarCarrito();
  renderizarCarrito();
}

/* 8. CARRITO DETALLADO */

function renderizarCarrito() {
  const lista = $("lista-carrito");
  lista.replaceChildren();
  $("carrito-vacio").hidden = carrito.length > 0;

  $("contador-carrito").textContent = String(
    carrito.reduce((suma, item) => suma + item.cantidad, 0)
  );
  $("total-carrito").textContent = soles(totalPedido());

  for (const item of carrito) {
    const p = productoPorId(item.id);
    if (!p) continue;

    const fila = elemento("div", "item-carrito");
    const foto = crearFoto(p.imagen, "miniatura-carrito", p.nombre);
    const datos = elemento("div", "detalles-carrito");

    datos.append(
      elemento("h3", "", p.nombre),
      elemento("p", "talla-carrito", `Talla: ${item.talla}`)
    );

    const unitario = elemento("div", "precio-unitario");
    unitario.append(
      elemento("span", "", "Precio unitario"),
      elemento("strong", "", soles(p.precio))
    );
    datos.append(unitario);

    const controles = elemento("div", "controles-cantidad");

    for (const [accion, texto] of [
      ["restar", "-"],
      ["cantidad", String(item.cantidad)],
      ["sumar", "+"],
      ["quitar", "Quitar"]
    ]) {
      if (accion === "cantidad") {
        controles.append(elemento("span", "", texto));
        continue;
      }

      const boton = elemento("button", accion === "quitar" ? "quitar" : "", texto);
      boton.type = "button";
      boton.setAttribute("aria-label", `${accion} ${p.nombre}, talla ${item.talla}`);
      if (accion === "sumar") {
        boton.disabled = cantidadProducto(p.id) >= p.stock || item.cantidad >= 99;
      }
      boton.addEventListener("click", () => cambiarCantidad(item.id, item.talla, accion));
      controles.append(boton);
    }
    datos.append(controles);

    const subtotal = elemento("div", "subtotal-carrito");
    subtotal.append(
      elemento("span", "", "Subtotal"),
      elemento("strong", "", soles(p.precio * item.cantidad))
    );
    datos.append(subtotal);
    fila.append(foto, datos);
    lista.append(fila);
  }

  const finalizar = $("finalizar-pedido");
  const hayProductos = carrito.length > 0;
  finalizar.classList.toggle("inactivo", !hayProductos);
  finalizar.setAttribute("aria-disabled", String(!hayProductos));
  configurarEnlaceWhatsApp(finalizar, hayProductos ? textoPedido() : "", hayProductos);
}

function abrirCarrito() {
  const dialogo = $("ventana-carrito");
  if (!dialogo.open) dialogo.showModal();
}

/* 9. CARGAR PRODUCTOS DESDE SUPABASE */

async function cargarTienda() {
  if (!window.supabase || !window.NELIDA_SUPABASE) {
    throw new Error("No se cargo la libreria o la configuracion de Supabase.");
  }

  const { url, publishableKey } = window.NELIDA_SUPABASE;
  if (!url?.startsWith("https://") || !publishableKey?.startsWith("sb_publishable_")) {
    throw new Error("Revisa los datos de supabase-config.js.");
  }

  const cliente = window.supabase.createClient(url, publishableKey);
  const respuesta = await cliente
    .from("productos")
    .select("id,nombre,descripcion,categoria,precio,tallas,stock,imagen_url")
    .eq("activo", true)
    .order("creado_en", { ascending: false });

  if (respuesta.error) throw respuesta.error;

  productos = (respuesta.data || []).map((p) => ({
    id: p.id,
    nombre: String(p.nombre),
    descripcion: String(p.descripcion || ""),
    categoria: String(p.categoria || "Otros"),
    precio: Number(p.precio),
    tallas: Array.isArray(p.tallas) ? p.tallas.map(String) : [],
    stock: Math.max(0, Math.floor(Number(p.stock) || 0)),
    imagen: p.imagen_url || ""
  }));

  const config = await cliente
    .from("configuracion")
    .select("anuncio,lema,whatsapp,portada_url")
    .eq("id", 1)
    .maybeSingle();

  if (!config.error && config.data) {
    const c = config.data;
    if (c.anuncio) $("anuncio").textContent = c.anuncio;
    if (c.lema && c.lema !== "Tu vibra. Tu estilo. Tu momento.") {
      $("titulo-portada").textContent = c.lema;
    }
    if (imagenValida(c.portada_url)) {
      $("imagen-portada").src = c.portada_url;
    }

    const numero = String(c.whatsapp || "").replace(/\D/g, "");
    if (/^\d{10,15}$/.test(numero)) numeroWhatsApp = numero;
  }

  configurarEnlaceWhatsApp(
    $("contacto-whatsapp"),
    `\u00A1Hola! ${EMOJI.corazon} Vi Nelida FEM y quisiera informacion sobre sus prendas.`
  );

  limpiarCarritoDesactualizado();
  actualizarContadorFavoritos();
  renderizarProductos();
  renderizarCarrito();
}

/* 10. INICIAR LA TIENDA */

window.addEventListener("DOMContentLoaded", () => {
  $("abrir-carrito").addEventListener("click", abrirCarrito);
  $("carrito-inferior").addEventListener("click", abrirCarrito);
  $("cerrar-carrito").addEventListener("click", () => $("ventana-carrito").close());

  $("ventana-carrito").addEventListener("click", (evento) => {
    if (evento.target === $("ventana-carrito")) {
      $("ventana-carrito").close();
    }
  });

  $("finalizar-pedido").addEventListener("click", (evento) => {
    if (!carrito.length) evento.preventDefault();
  });

  const menu = $("menu");
  const botonMenu = $("abrir-menu");

  botonMenu.addEventListener("click", () => {
    const abierto = menu.classList.toggle("abierto");
    botonMenu.setAttribute("aria-expanded", String(abierto));
    botonMenu.setAttribute("aria-label", abierto ? "Cerrar menu" : "Abrir menu");
  });

  menu.querySelectorAll("a").forEach((enlace) => {
    enlace.addEventListener("click", () => {
      menu.classList.remove("abierto");
      botonMenu.setAttribute("aria-expanded", "false");
    });
  });

  function cambiarFiltro(filtro) {
    filtroActivo = filtro;
    document.querySelectorAll(".filtro").forEach((boton) => {
      const activo = boton.dataset.filtro === filtro;
      boton.classList.toggle("activo", activo);
      boton.setAttribute("aria-pressed", String(activo));
    });
    renderizarProductos();
  }

  $("abrir-favoritos").addEventListener("click", () => {
    cambiarFiltro("favoritos");
    $("productos").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("volver-catalogo").addEventListener("click", () => {
    cambiarFiltro("todos");
  });

  document.querySelectorAll(".filtro").forEach((boton) => {
    boton.addEventListener("click", () => cambiarFiltro(boton.dataset.filtro));
  });
  menu.querySelectorAll("[data-filtro]").forEach((enlace) => {
    enlace.addEventListener("click", () => cambiarFiltro(enlace.dataset.filtro));
  });

  cargarTienda().catch((error) => {
    $("estado-productos").hidden = false;
    $("estado-productos").textContent =
      "No se pudieron cargar los productos. Revisa Supabase. " + error.message;
    $("cantidad-productos").textContent = "Sin conexion";
    console.error("Nelida FEM:", error);
  });
});
