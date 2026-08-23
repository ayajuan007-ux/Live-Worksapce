# JARVIS · Project Field

Interfaz futurista tipo Jarvis para gestionar proyectos en un campo 3D interactivo.

## Desarrollo local

```bash
npm install
npm run dev
```

## Funciones actuales

- Interfaz DOM completamente separada del espacio 3D.
- Nodos de proyecto independientes y arrastrables (sin conexiones entre sí).
- Animación de explosión al abrir un nodo: libera paneles suspendidos conectados con toda la ficha (resumen, valor, empresa, nicho, contacto, fechas, acuerdos, fases, seguimientos).
- Fichas adaptadas: proyectos empresariales y personales/estudio (ideas + fases).
- Creación de proyectos con subida de documentos (contratos, PDFs…) y escaneo real del texto (pdf.js) que autocompleta la ficha.
- Dashboard izquierdo retraíble con pestañas separadas: estadísticas, perfil y seguimientos.
- Zoom infinito con la rueda del mouse sobre cualquier punto del campo.
- Reloj superior derecho actualizado a hora colombiana (día/hora).
- Botones Go Back / Go Forward con historial de nodos visitados.
- Edición rápida desde la ficha: progreso (+/-), estado, color y eliminación.
- Persistencia automática en el navegador + exportar/importar respaldo JSON.

## Validacion

```bash
npm run build
npm run lint
```
