# Paddock — Mundial F1

Aplicación privada para crear varios campeonatos, añadir jugadores y registrar resultados. La clasificación y las estadísticas se calculan a partir de los resultados de cada carrera.

## Persistencia compartida con Vercel y Neon

La app guarda los campeonatos en PostgreSQL mediante una función de servidor de Vercel. No se necesita login; cualquiera con acceso al enlace podrá ver y modificar los mundiales.

1. Sube este repositorio a GitHub y crea un proyecto en Vercel desde ese repositorio.
2. En Vercel, abre **Storage → Create Database** e instala Neon desde el Marketplace. Asocia la base de datos al proyecto para que Vercel configure `DATABASE_URL`.
3. En la consola de Neon (SQL Editor), ejecuta el contenido de [`schema.sql`](./schema.sql) una vez.
4. Despliega o vuelve a desplegar el proyecto. La interfaz hablará con `/api/championships` y los datos se guardarán en PostgreSQL.

Si tienes campeonatos guardados en el navegador de la versión anterior, la app intenta importar el campeonato activo al primer arranque con la base de datos conectada.

## Desarrollo local

Instala Node.js, configura `DATABASE_URL` con la cadena de conexión de Neon y ejecuta:

```sh
npm install
npx vercel dev
```

Sin `DATABASE_URL`, la app mantiene una copia local en el navegador para poder probar la interfaz. Esa copia no se comparte entre dispositivos y limpiar el almacenamiento del navegador la elimina. No uses datos importantes hasta conectar la base de datos y comprobar el despliegue.
