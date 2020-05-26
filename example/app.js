const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const debug = require('debug')('express:server');
const http = require('http');
const fs = require('fs');

const svelte = require('rollup-plugin-svelte');
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const rollup = require('rollup');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const production = !process.env.ROLLUP_WATCH;

readRoutes().then(() => finish());

async function readRoutes() {
  if (!fs.existsSync(`jungle`)) fs.mkdirSync(`jungle`);
  if (!fs.existsSync(`jungle/build`)) fs.mkdirSync(`jungle/build`);

  await asyncForEach(fs.readdirSync('src/routes'), async (file) => {
    const fileParts = file.split('.');
    const isSvelteFile = fileParts[fileParts.length - 1] === 'svelte' && fileParts.length == 2;
    
    if (isSvelteFile) {
      const filename = fileParts[0].toLowerCase();
        
      if (!fs.existsSync(`jungle/build/${filename}`)) fs.mkdirSync(`jungle/build/${filename}`);

      const mainJs = `import ${fileParts[0]} from '${path.join(__dirname, `src/routes/${file}`)}'; export default new ${fileParts[0]}({target: document.body});`;

      fs.writeFileSync(`jungle/build/${filename}/main.js`, mainJs, (err) => {
        if (err) throw err;
  
        // success case, the file was saved
        console.log('File saved!');
      });
  
      const indexHtml = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width,initial-scale=1'>
      
        <title>Svelte app</title>
      
        <link rel='icon' type='image/png' href='./favicon.png'>
        <link rel='stylesheet' href='./global.css'>
        <link rel='stylesheet' href='./bundle.css'>
      
        <script defer src='./bundle.js'></script>
      </head>
      
      <body>
      </body>
      </html>
      `;
  
      fs.writeFileSync(`jungle/build/${filename}/index.html`, indexHtml, (err) => {
        if (err) throw err;
  
        // success case, the file was saved
        console.log('File saved!');
      });

      const globalCss = `html, body {
        position: relative;
        width: 100%;
        height: 100%;
      }
      
      body {
        color: #333;
        margin: 0;
        padding: 8px;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      }
      
      a {
        color: rgb(0,100,200);
        text-decoration: none;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      a:visited {
        color: rgb(0,80,160);
      }
      
      label {
        display: block;
      }
      
      input, button, select, textarea {
        font-family: inherit;
        font-size: inherit;
        padding: 0.4em;
        margin: 0 0 0.5em 0;
        box-sizing: border-box;
        border: 1px solid #ccc;
        border-radius: 2px;
      }
      
      input:disabled {
        color: #ccc;
      }
      
      input[type="range"] {
        height: 0;
      }
      
      button {
        color: #333;
        background-color: #f4f4f4;
        outline: none;
      }
      
      button:disabled {
        color: #999;
      }
      
      button:not(:disabled):active {
        background-color: #ddd;
      }
      
      button:focus {
        border-color: #666;
      }      
      `;
  
      fs.writeFileSync(`jungle/build/${filename}/global.css`, globalCss, (err) => {
        if (err) throw err;
  
        // success case, the file was saved
        console.log('File saved!');
      });
  
      const inputOptions = {
        input: `jungle/build/${filename}/main.js`,
        plugins: [
          svelte({
            dev: !production,
            css: css => {
              css.write(`jungle/build/${filename}/bundle.css`);
            }
          }),
      
          resolve(),
          commonjs(),
        ],
      };
      const outputOptions = {
        sourcemap: true,
        format: 'iife',
        name: 'app',
        file: `jungle/build/${filename}/bundle.js`
      };
      
      const bundle = await rollup.rollup(inputOptions);
    
      await bundle.write(outputOptions);
  
      app.use(`/${filename}`, express.static(path.join(__dirname, `jungle/build/${filename}`)));
    }
  });
}

function finish() {
  const port = normalizePort(process.env.PORT || '3000');

  app.set('port', port);
  
  const server = http.createServer(app);
  
  server.listen(port);
  server.on('error', onError);
  server.on('listening', () => onListening(server));
}

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening(server) {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
  console.log('Server listening on ' + bind + '\n');
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}