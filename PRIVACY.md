# Política de privacidad — Centro de Mando

Centro de Mando es una aplicación personal de uso estrictamente individual, construida y operada por un único usuario (el propietario de este repositorio). No es un producto comercial ni está destinada a terceros usuarios.

## Qué datos trata

- **Notas y tareas (Kanban):** almacenadas en una base de datos privada (Supabase) protegida por autenticación y Row Level Security, accesible únicamente por el propietario.
- **Google Calendar (solo lectura):** la app solicita el scope `https://www.googleapis.com/auth/calendar.readonly` para mostrar eventos del calendario personal del propietario dentro de la app. Los eventos (incluidos datos de asistentes, si los hay) se obtienen de la API de Google en el momento de mostrarse en pantalla y **nunca se almacenan de forma persistente** en ningún servidor ni base de datos.

## Con quién se comparten los datos

Con nadie. No hay servidores de terceros, analítica, publicidad ni venta de datos. Los únicos servicios involucrados son Google (API de Calendario, solo lectura) y Supabase (almacenamiento de notas/tareas del propio usuario).

## Contacto

Para cualquier duda sobre esta política: pablo.federico2804@gmail.com
