# Para Nancy · Un universo en amarillo

Página estática personalizada a partir de https://cdn.dedicacodes.com/t/galaxia-nebulosa-flores-amarillas/1.0.0/index.html. La escena original usa Three.js; se conserva la referencia en `reference.html`. Las imágenes y el audio provienen de esa plantilla. No se atribuye autoría propia sobre esos recursos ni se incluye una licencia de redistribución no verificada.

## Prueba local

Con Node.js instalado, desde esta carpeta:

```sh
node server.cjs
```

Abre http://localhost:5500. No necesita npm install, backend ni claves. Música al pulsar «Abrir tu universo». Arrastra para girar, usa la rueda o pellizca para acercar. Puedes pausar el movimiento y abrir la carta. Respeta la preferencia de movimiento reducido.

## Personalización

- `config.js`: título, frases, imágenes y música.
- `index.html`: bienvenida y carta.
- `style.css`: diseño adaptable a móvil y escritorio.
- `galaxy.js`: escena interactiva adaptada de la referencia.

## GitHub Pages

Sube `index.html`, `style.css`, `config.js`, `galaxy.js`, `assets/` y `vendor/` a la raíz del repositorio. En Settings → Pages, selecciona Deploy from a branch → main → /(root). Todas las rutas son relativas y funcionan en un subdirectorio. `server.cjs`, `build-local.cjs` y `reference.html` son auxiliares y no hacen falta en producción.

`node build-local.cjs` vuelve a generar la adaptación de la escena desde `reference.html`; no es necesario para ejecutar ni publicar.
