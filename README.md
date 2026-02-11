# Salas de Voz Online

Aplicación web en tiempo real con:

- **Salas** para unirse por nombre.
- **Notas de voz públicas** dentro de la sala (sin chat de texto público).
- **Mensajes privados por texto** entre usuarios conectados en la misma sala.

## Requisitos

- Node.js 18+

## Instalación

```bash
npm install
```

## Ejecutar

```bash
npm start
```

Luego abre `http://localhost:3000`.

## Cómo usar

1. Escribe tu nombre y el nombre de la sala.
2. Entra y usa **🎙️ Grabar nota** para enviar notas de voz a todos en la sala.
3. Para privado por texto, selecciona un usuario y envía tu mensaje.

## Notas

- La aplicación usa `MediaRecorder`, por lo que necesitas permisos de micrófono en el navegador.
- Los mensajes privados se restringen a usuarios de la misma sala.
