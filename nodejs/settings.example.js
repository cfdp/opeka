var fs = require("fs"),
    settings = {};

settings.httpPort = 3000;
settings.databaseConnection = {
  host: 'localhost',
  port: 3306,
  user: 'doejohn',
  password: 'asdfsecret',
  database: 'john_doe'
};


// Uncomment and configure this if you want to run Nowjs via HTTPS. 
//settings.https = {
//  key: fs.readFileSync('certs/server-key.pem'),
//  cert: fs.readFileSync('certs/server-cert.pem')
//};


module.exports = settings;

