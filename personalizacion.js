/* NELIDA FEM - Contenido editable por administradores */
"use strict";

const TEMAS_NELIDA = {
  rosa: { oscuro:"#362731", rosa:"#f8e9ed", suave:"#fdf6f8", acento:"#9e4d70", gris:"#786e74", borde:"#ebdfe5" },
  beige: { oscuro:"#40332d", rosa:"#f2e7dd", suave:"#fbf7f3", acento:"#97634d", gris:"#716660", borde:"#e6d9cf" },
  minimalista: { oscuro:"#262626", rosa:"#ededed", suave:"#f8f8f8", acento:"#575757", gris:"#656565", borde:"#dedede" }
};

function aplicarTemaNelida(nombre) {
  const tema = TEMAS_NELIDA[nombre] || TEMAS_NELIDA.rosa;
  const raiz = document.documentElement.style;
  raiz.setProperty("--oscuro", tema.oscuro);
  raiz.setProperty("--rosa", tema.rosa);
  raiz.setProperty("--rosa-claro", tema.suave);
  raiz.setProperty("--acento", tema.acento);
  raiz.setProperty("--gris", tema.gris);
  raiz.setProperty("--borde", tema.borde);
}

function enlaceRedValido(valor) {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const ajustes = window.NELIDA_SUPABASE;
    if (!window.supabase || !ajustes?.url || !ajustes?.publishableKey) return;

    const db = window.supabase.createClient(ajustes.url, ajustes.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const { data, error } = await db.from("configuracion")
      .select("descripcion_portada,titulo_catalogo,subtitulo_catalogo,promocion_activa,promocion_texto,instagram_url,tiktok_url,facebook_url,tema")
      .eq("id", 1).maybeSingle();
    if (error) {
      console.warn("Configuración adicional aún no disponible:", error.message);
      return;
    }
    if (!data) return;

    aplicarTemaNelida(data.tema);
    if (data.descripcion_portada) {
      document.getElementById("descripcion-portada").textContent = data.descripcion_portada;
    }
    if (data.titulo_catalogo) {
      document.getElementById("titulo-catalogo").textContent = data.titulo_catalogo;
    }
    if (data.subtitulo_catalogo) {
      document.getElementById("subtitulo-catalogo").textContent = data.subtitulo_catalogo;
    }

    const promo = document.getElementById("promo-catalogo");
    if (data.promocion_activa && data.promocion_texto?.trim()) {
      promo.textContent = data.promocion_texto.trim();
      promo.hidden = false;
    } else {
      promo.hidden = true;
    }

    const redes = document.getElementById("redes-sociales");
    redes.replaceChildren();
    for (const [etiqueta, valor] of [
      ["Instagram", data.instagram_url],
      ["TikTok", data.tiktok_url],
      ["Facebook", data.facebook_url]
    ]) {
      const href = enlaceRedValido(valor);
      if (!href) continue;
      const a = document.createElement("a");
      a.textContent = etiqueta + " ↗";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      redes.append(a);
    }
    redes.hidden = redes.children.length === 0;
  } catch (error) {
    console.warn("No se pudo cargar la personalización:", error.message);
  }
});
