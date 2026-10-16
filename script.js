
/* ==========================================================
   NELIDA FEM - TIENDA PUBLICA
   Supabase + Catalogo + Carrito + WhatsApp Web
   ========================================================== */

"use strict";

// 1. CONFIGURACION

const WHATSAPP_POR_DEFECTO = "51972491860";

const CLAVE_CARRITO = "nelida-fem-carrito-supabase-v1";

let productos = [];
let carrito = leerCarrito();
let filtroActivo = "todos";
let numeroWhatsApp = WHATSAPP_POR_DEFECTO;

const $ = (id) => document.getElementById(id);

// EMOJIS UNICODE PARA WHATSAPP

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

// FORMATO DE PRECIOS EN SOLES

function soles(valor) {

  return `S/ ${new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(valor) || 0)}`;

}

/* ==========================================
   2. CARRITO LOCAL
========================================== */

function leerCarrito() {

  try {

    const datos = JSON.parse(
      localStorage.getItem(CLAVE_CARRITO) || "[]"
    );

    if (!Array.isArray(datos)) {
      return [];
    }

    return datos.filter((item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.talla === "string" &&
      Number.isInteger(item.cantidad) &&
      item.cantidad >= 1 &&
      item.cantidad <= 99
    );

  } catch {

    return [];

  }
}

// GUARDAR EL CARRITO

function guardarCarrito() {

  try {

    localStorage.setItem(
      CLAVE_CARRITO,
      JSON.stringify(carrito)
    );

  } catch (error) {

    console.warn(
      "No se pudo guardar el carrito:",
      error
    );

  }

}

/* ==========================================
   3. FUNCIONES AUXILIARES
========================================== */

function categoriaNormalizada(texto) {

  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

}

// VALIDAR RUTAS DE IMAGEN

function imagenValida(ruta) {

  return typeof ruta === "string" && (
    /^https:\/\//i.test(ruta) ||
    /^assets\/[\w./-]+$/i.test(ruta)
  );

}

// CREAR ELEMENTOS HTML

function elemento(etiqueta, clase = "", texto) {

  const nodo = document.createElement(etiqueta);

  if (clase) {
    nodo.className = clase;
  }

  if (texto !== undefined) {
    nodo.textContent = String(texto);
  }

  return nodo;

}

// BUSCAR PRODUCTOS

function productoPorId(id) {

  return productos.find(
    (p) => p.id === id
  );

}

// CANTIDADES DE UN PRODUCTO

function cantidadProducto(id) {

  return carrito.reduce(
    (total, item) =>
      total + (
        item.id === id ? item.cantidad : 0
      ),
    0
  );

}

/* ==========================================
   4. FOTOGRAFIAS DE PRODUCTOS
========================================== */

function crearFoto(ruta, clase, nombre = "Prenda") {

  const caja = elemento("div", clase);

  const sustituto = elemento(
    "span",
    "foto-sustituta",
    EMOJI.prenda
  );

  caja.append(sustituto);

  if (imagenValida(ruta)) {

    const imagen = document.createElement("img");

    imagen.src = ruta;

    imagen.alt = `Fotografia de ${nombre}`;

    imagen.loading = "lazy";

    imagen.onload = () => {
      sustituto.remove();
    };

    imagen.onerror = () => {
      imagen.remove();
    };

    caja.append(imagen);

  }

  return caja;

}

/* ==========================================
   5. ACTUALIZAR STOCK DEL CARRITO
========================================== */

function limpiarCarritoDesactualizado() {

  const nuevo = [];

  const acumulados = new Map();

  for (const item of carrito) {

    const p = productoPorId(item.id);

    if (
      !p ||
      !p.tallas.includes(item.talla)
    ) {
      continue;
    }

    const usado =
      acumulados.get(item.id) || 0;

    const cantidad = Math.min(
      item.cantidad,
      99,
      p.stock - usado
    );

    if (cantidad <= 0) {
      continue;
    }

    const existente = nuevo.find(
      (x) =>
        x.id === item.id &&
        x.talla === item.talla
    );

    if (existente) {

      const adicional = Math.min(
        99 - existente.cantidad,
        cantidad
      );

      existente.cantidad += adicional;

      acumulados.set(
        item.id,
        usado + adicional
      );

    } else {

      nuevo.push({
        id: item.id,
        talla: item.talla,
        cantidad
      });

      acumulados.set(
        item.id,
        usado + cantidad
      );

    }
  }

  carrito = nuevo;

  guardarCarrito();

}

/* ==========================================
   6. CALCULAR TOTAL
========================================== */

function totalPedido() {

  return carrito.reduce((total, item) => {

    const p = productoPorId(item.id);

    return total + (
      p ? p.precio * item.cantidad : 0
    );

  }, 0);

}

/* ==========================================
   7. MENSAJE DE WHATSAPP
========================================== */

function textoPedido() {

  const separador = "\u2501".repeat(16);

  const prendas = carrito.map((item, indice) => {

    const p = productoPorId(item.id);

    if (!p) {
      return null;
    }

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

/* ==========================================
   8. ENLACE DIRECTO DE WHATSAPP WEB
========================================== */

function enlaceWhatsApp(mensaje) {

  const numero = String(
    numeroWhatsApp
  ).replace(/\D/g, "");

  return (
    `https://web.whatsapp.com/send?phone=${numero}&text=` +
    encodeURIComponent(mensaje)
  );

}

/* ==========================================
   9. MOSTRAR PRODUCTOS DE SUPABASE
========================================== */

function renderizarProductos() {

  const catalogo = $("catalogo");

  catalogo.replaceChildren();

  const visibles = productos.filter(
    (p) =>
      filtroActivo === "todos" ||
      categoriaNormalizada(p.categoria) === filtroActivo
  );

  $("cantidad-productos").textContent =
    `${visibles.length} ${
      visibles.length === 1
        ? "producto"
        : "productos"
    }`;

  $("estado-productos").hidden =
    visibles.length > 0;

  if (!visibles.length) {

    $("estado-productos").textContent =
      "No hay publicaciones disponibles en esta categoria.";

  }

  for (const p of visibles) {

    const tarjeta = elemento(
      "article",
      "producto"
    );

    // FOTO

    const foto = crearFoto(
      p.imagen,
      "producto-foto",
      p.nombre
    );

    const disponible =
      p.stock > 0 &&
      p.tallas.length > 0;

    foto.append(
      elemento(
        "span",
        "insignia",
        disponible
          ? "Disponible"
          : "Agotado"
      )
    );

    // INFORMACION

    const detalles = elemento(
      "div",
      "producto-informacion"
    );

    detalles.append(
      elemento(
        "p",
        "categoria-producto",
        p.categoria
      ),

      elemento(
        "h3",
        "",
        p.nombre
      ),

      elemento(
        "p",
        "precio",
        soles(p.precio)
      ),

      elemento(
        "p",
        "descripcion",
        p.descripcion || "Prenda de Nelida FEM"
      )
    );

    // TALLAS

    const label = elemento(
      "label",
      "",
      "Selecciona tu talla"
    );

    const select = elemento("select");

    select.id = `talla-${p.id}`;

    label.htmlFor = select.id;

    for (const talla of p.tallas) {

      const opcion = elemento(
        "option",
        "",
        talla
      );

      opcion.value = talla;

      select.append(opcion);

    }

    select.disabled = !disponible;

    // BOTON AGREGAR

    const boton = elemento(
      "button",
      "boton-principal boton-agregar",
      disponible
        ? "+ Agregar al carrito"
        : "No disponible"
    );

    boton.type = "button";

    boton.disabled = !disponible;

    boton.addEventListener("click", () => {

      agregarAlCarrito(
        p.id,
        select.value
      );

    });

    // STOCK

    detalles.append(
      label,
      select,
      boton,

      elemento(
        "p",
        "stock-producto",
        p.stock > 0
          ? `Stock referencial: ${p.stock} unidades`
          : "Sin stock"
      )
    );

    tarjeta.append(
      foto,
      detalles
    );

    catalogo.append(tarjeta);

  }

}

/* ==========================================
   10. AGREGAR AL CARRITO
========================================== */

function agregarAlCarrito(id, talla) {

  const p = productoPorId(id);

  if (
    !p ||
    !p.tallas.includes(talla)
  ) {
    return;
  }

  if (cantidadProducto(id) >= p.stock) {

    alert(
      "No hay mas unidades disponibles de esta prenda."
    );

    return;
  }

  const item = carrito.find(
    (x) =>
      x.id === id &&
      x.talla === talla
  );

  if (item) {

    if (item.cantidad >= 99) {
      return;
    }

    item.cantidad++;

  } else {

    carrito.push({
      id: id,
      talla: talla,
      cantidad: 1
    });

  }

  guardarCarrito();

  renderizarCarrito();

  abrirCarrito();

}

/* ==========================================
   11. MODIFICAR CANTIDADES
========================================== */

function cambiarCantidad(id, talla, accion) {

  const item = carrito.find(
    (x) =>
      x.id === id &&
      x.talla === talla
  );

  const p = productoPorId(id);

  if (!item || !p) {
    return;
  }

  if (
    accion === "quitar" ||
    (
      accion === "restar" &&
      item.cantidad === 1
    )
  ) {

    carrito = carrito.filter(
      (x) => x !== item
    );

  } else if (accion === "sumar") {

    if (
      cantidadProducto(id) < p.stock &&
      item.cantidad < 99
    ) {

      item.cantidad++;

    }

  } else if (accion === "restar") {

    item.cantidad--;

  }

  guardarCarrito();

  renderizarCarrito();

}

/* ==========================================
   12. CARRITO DETALLADO
========================================== */

function renderizarCarrito() {

  const lista = $("lista-carrito");

  lista.replaceChildren();

  $("carrito-vacio").hidden =
    carrito.length > 0;

  // CONTADOR

  const cantidadTotal = carrito.reduce(
    (suma, item) =>
      suma + item.cantidad,
    0
  );

  $("contador-carrito").textContent =
    String(cantidadTotal);

  // TOTAL

  $("total-carrito").textContent =
    soles(totalPedido());

  // MOSTRAR CADA PRODUCTO

  for (const item of carrito) {

    const p = productoPorId(item.id);

    if (!p) {
      continue;
    }

    const fila = elemento(
      "div",
      "item-carrito"
    );

    // FOTO DEL PRODUCTO

    const foto = crearFoto(
      p.imagen,
      "miniatura-carrito",
      p.nombre
    );

    // INFORMACION

    const datos = elemento(
      "div",
      "detalles-carrito"
    );

    // NOMBRE Y TALLA

    datos.append(
      elemento(
        "h3",
        "",
        p.nombre
      ),

      elemento(
        "p",
        "talla-carrito",
        `Talla: ${item.talla}`
      )
    );

    // PRECIO UNITARIO

    const unitario = elemento(
      "div",
      "precio-unitario"
    );

    unitario.append(
      elemento(
        "span",
        "",
        "Precio unitario"
      ),

      elemento(
        "strong",
        "",
        soles(p.precio)
      )
    );

    datos.append(unitario);

    // CONTROLES DE CANTIDAD

    const controles = elemento(
      "div",
      "controles-cantidad"
    );

    const acciones = [
      ["restar", "-"],
      ["cantidad", String(item.cantidad)],
      ["sumar", "+"],
      ["quitar", "Quitar"]
    ];

    for (const [accion, texto] of acciones) {

      if (accion === "cantidad") {

        controles.append(
          elemento("span", "", texto)
        );

        continue;

      }

      const boton = elemento(
        "button",
        accion === "quitar"
          ? "quitar"
          : "",
        texto
      );

      boton.type = "button";

      boton.setAttribute(
        "aria-label",
        `${accion} ${p.nombre}, talla ${item.talla}`
      );

      if (accion === "sumar") {

        boton.disabled =
          cantidadProducto(p.id) >= p.stock ||
          item.cantidad >= 99;

      }

      boton.addEventListener("click", () => {

        cambiarCantidad(
          item.id,
          item.talla,
          accion
        );

      });

      controles.append(boton);

    }

    datos.append(controles);

    // SUBTOTAL POR PRODUCTO

    const subtotal = elemento(
      "div",
      "subtotal-carrito"
    );

    subtotal.append(
      elemento(
        "span",
        "",
        "Subtotal"
      ),

      elemento(
        "strong",
        "",
        soles(p.precio * item.cantidad)
      )
    );

    datos.append(subtotal);

    fila.append(
      foto,
      datos
    );

    lista.append(fila);

  }

  // PREPARAR EL PEDIDO DE WHATSAPP

  const finalizar = $("finalizar-pedido");

  const hayProductos = carrito.length > 0;

  finalizar.classList.toggle(
    "inactivo",
    !hayProductos
  );

  finalizar.setAttribute(
    "aria-disabled",
    String(!hayProductos)
  );

  finalizar.href = hayProductos
    ? enlaceWhatsApp(textoPedido())
    : "#";

}

/* ==========================================
   13. ABRIR CARRITO
========================================== */

function abrirCarrito() {

  const dialogo = $("ventana-carrito");

  if (!dialogo.open) {

    dialogo.showModal();

  }

}

/* ==========================================
   14. CONECTAR CON SUPABASE
========================================== */

async function cargarTienda() {

  if (
    !window.supabase ||
    !window.NELIDA_SUPABASE
  ) {

    throw new Error(
      "No se cargo la libreria o la configuracion de Supabase."
    );

  }

  const { url, publishableKey } =
    window.NELIDA_SUPABASE;

  if (
    !url?.startsWith("https://") ||
    !publishableKey?.startsWith("sb_publishable_")
  ) {

    throw new Error(
      "Revisa supabase-config.js: faltan la URL o la clave publica."
    );

  }

  const cliente = window.supabase.createClient(
    url,
    publishableKey
  );

  // CARGAR PRODUCTOS

  const respuesta = await cliente
    .from("productos")
    .select(
      "id,nombre,descripcion,categoria,precio,tallas,stock,imagen_url"
    )
    .eq("activo", true)
    .order("creado_en", {
      ascending: false
    });

  if (respuesta.error) {

    throw respuesta.error;

  }

  productos = (respuesta.data || []).map((p) => ({

    id: p.id,

    nombre: String(p.nombre),

    descripcion: String(
      p.descripcion || ""
    ),

    categoria: String(
      p.categoria || "Otros"
    ),

    precio: Number(p.precio),

    tallas: Array.isArray(p.tallas)
      ? p.tallas.map(String)
      : [],

    stock: Math.max(
      0,
      Math.floor(Number(p.stock) || 0)
    ),

    imagen: p.imagen_url || ""

  }));

  // CONFIGURACION DE LA TIENDA

  const config = await cliente
    .from("configuracion")
    .select(
      "anuncio,lema,whatsapp,portada_url"
    )
    .eq("id", 1)
    .maybeSingle();

  if (
    !config.error &&
    config.data
  ) {

    const c = config.data;

    // ANUNCIO

    if (c.anuncio) {

      $("anuncio").textContent =
        c.anuncio;

    }

    // PORTADA

    if (
      c.lema &&
      c.lema !== "Tu vibra. Tu estilo. Tu momento."
    ) {

      $("titulo-portada").textContent =
        c.lema;

    }

    // IMAGEN DE PORTADA

    if (imagenValida(c.portada_url)) {

      $("imagen-portada").src =
        c.portada_url;

    }

    // WHATSAPP

    const numero = String(
      c.whatsapp || ""
    ).replace(/\D/g, "");

    if (/^\d{10,15}$/.test(numero)) {

      numeroWhatsApp = numero;

    }

  }

  // ENLACE PARA CONSULTAS GENERALES

  $("contacto-whatsapp").href =
    enlaceWhatsApp(
      `\u00A1Hola! ${EMOJI.corazon} Vi Nelida FEM y quisiera informacion sobre sus prendas.`
    );

  // MOSTRAR PRODUCTOS Y CARRITO

  limpiarCarritoDesactualizado();

  renderizarProductos();

  renderizarCarrito();

}

/* ==========================================
   15. FUNCIONES AL INICIAR LA PAGINA
========================================== */

window.addEventListener("DOMContentLoaded", () => {

  // ABRIR CARRITO

  $("abrir-carrito").addEventListener(
    "click",
    abrirCarrito
  );

  $("carrito-inferior").addEventListener(
    "click",
    abrirCarrito
  );

  // CERRAR CARRITO

  $("cerrar-carrito").addEventListener(
    "click",
    () => $("ventana-carrito").close()
  );

  // CERRAR AL HACER CLIC FUERA

  $("ventana-carrito").addEventListener(
    "click",
    (evento) => {

      if (
        evento.target === $("ventana-carrito")
      ) {

        $("ventana-carrito").close();

      }

    }
  );

  // EVITAR FINALIZAR CARRITO VACIO

  $("finalizar-pedido").addEventListener(
    "click",
    (evento) => {

      if (!carrito.length) {

        evento.preventDefault();

      }

    }
  );

  // MENU PARA CELULARES

  const menu = $("menu");

  const botonMenu = $("abrir-menu");

  botonMenu.addEventListener("click", () => {

    const abierto = menu.classList.toggle(
      "abierto"
    );

    botonMenu.setAttribute(
      "aria-expanded",
      String(abierto)
    );

    botonMenu.setAttribute(
      "aria-label",
      abierto
        ? "Cerrar menu"
        : "Abrir menu"
    );

  });

  menu.querySelectorAll("a").forEach((enlace) => {

    enlace.addEventListener("click", () => {

      menu.classList.remove("abierto");

      botonMenu.setAttribute(
        "aria-expanded",
        "false"
      );

    });

  });

  // FILTROS DE CATEGORIAS

  function cambiarFiltro(filtro) {

    filtroActivo = filtro;

    document.querySelectorAll(".filtro")
      .forEach((boton) => {

        const activo =
          boton.dataset.filtro === filtro;

        boton.classList.toggle(
          "activo",
          activo
        );

        boton.setAttribute(
          "aria-pressed",
          String(activo)
        );

      });

    renderizarProductos();

  }

  document.querySelectorAll(".filtro")
    .forEach((boton) => {

      boton.addEventListener("click", () => {

        cambiarFiltro(
          boton.dataset.filtro
        );

      });

    });

  menu.querySelectorAll("[data-filtro]")
    .forEach((enlace) => {

      enlace.addEventListener("click", () => {

        cambiarFiltro(
          enlace.dataset.filtro
        );

      });

    });

  // CARGAR SUPABASE

  cargarTienda().catch((error) => {

    $("estado-productos").hidden = false;

    $("estado-productos").textContent =
      "No se pudieron cargar los productos. " +
      "Revisa Supabase. " +
      error.message;

    $("cantidad-productos").textContent =
      "Sin conexion";

    console.error(
      "Nelida FEM:",
      error
    );

  });

});
