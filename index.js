//Ip adresini ayarla
//S3 BaseUrl ayarla.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
var databaseUri = 'Your-mongodb-connection-uri';



var api = new ParseServer({
allowClientClassCreation:false,
databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
appId: process.env.APP_ID || 'YOUS_APP_ID',
masterKey: process.env.MASTER_KEY || 'YOUR_MASTER_KEY', //Add your master key here. Keep it secret!
maxUploadSize: "100mb",
databaseOptions: { poolSize: 25 },
directAccess: true,
enableAnonymousUsers: false,
enableSingleSchemaCache: true,
serverURL: process.env.SERVER_URL || 'http://127.0.0.1:1337/parse',
appName: 'YOUR_APP_NAME',
liveQuery: {
    classNames: ['Message'],
    redisURL: 'YOUR_REDIS_CONNECTION_URI'
  },

});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();


// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));





// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  console.log(req);
  res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});
ParseServer.createLiveQueryServer(httpServer,{
  redisURL: "YOUR_REDIS_CONNECTION_URI"
});

