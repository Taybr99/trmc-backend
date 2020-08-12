const { version } = require('../package.json');

const development = {
  PORT: 7997,
  HOST: 'http://mastersoftwaretechnologies.com:',
  VERSION: process.env.version || version,
  DB_CONNECTION_STRING: process.env.DB_CONNECTION_STRING || 'mongodb://taybr99:TRMC2360@ds117946-a0.mlab.com:17946,ds117946-a1.mlab.com:17946/trmcie?replicaSet=rs-ds117946',
  SENDER_EMAIL: 'customerservice@taylorrobinsonmusic.com',
  // 'http://mastersoftwaretechnologies.com:8045',
};

const production = {
  PORT: 3000,
  HOST: 'http://mastersoftwaretechnologies.com:',
  VERSION: process.env.version || version,
  DB_CONNECTION_STRING: process.env.DB_CONNECTION_STRING || 'mongodb://taybr99:TRMC2360@ds117946-a0.mlab.com:17946,ds117946-a1.mlab.com:17946/trmcie?replicaSet=rs-ds117946',
  SENDER_EMAIL: 'customerservice@taylorrobinsonmusic.com',
};

module.exports = process.env.NODE_ENV === 'prod' ? production : development;
