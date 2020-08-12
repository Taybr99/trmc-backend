/* eslint-disable */

const pm2 = require('pm2');

pm2.connect((err) => {
  if (err) {
    console.error(err);
    process.exit(2);
  }

  const appName = process.env.APP_NAME;

  pm2.start({
    script : 'server.js', 
    name: appName,
  }, function(err, apps) {
    console.log(`pm2 is working with app name: ${appName}`)
    pm2.disconnect();   // Disconnects from PM2
    if (err) throw err
  });
});