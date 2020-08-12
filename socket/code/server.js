/**
 * Declarations of dependencies
 * */
const express = require('express');
const https = require('https');
const fs = require("fs");
const cookieParser = require('cookie-parser');
const config = require('./config');
const logger = require('./config/logger');
// const http = require('http');
const Routes = require('./routes');
const authentication = require('./services/authentication');

const router = new Routes(express.Router(), new Database(config.DB_CONNECTION_STRING), authentication).register();
const app = express();

const dir = './logs';

/**
 * Create Dir if not exist
 */
try {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
} catch (e) {
  logger.log('error', 'create directory error', { detail: e.toString() });
}

/**
 * List of all Middlewares used in project cors, compression, helmet
 * */
try {
  app.use(express.static('public'));
  app.use(cookieParser());
  app.use(function(req, response, next) {
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    response.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
      next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/', router);
  app.set('view engine', 'ejs');
  app.all('/*', (req, res) => res.status(404).json());
} catch (e) {
  logger.log('error', 'middleware error', { detail: e.toString() });
}

/**
 * Start the app by listening <port>
 * */
try {
  const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/web.oneclickwebcam.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/web.oneclickwebcam.com/fullchain.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/web.oneclickwebcam.com/chain.pem')
  }
  const secureServer =  https.createServer(options, app);
  
  secureServer.listen(config.PORT, function () {
      console.log('server up and running at %s port and %s enviourment', config.PORT, process.env.NODE_ENV);
  });

} catch (err) {
  throw new Error('Error while starting server', err);
}

module.exports = app;
