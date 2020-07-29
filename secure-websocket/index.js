// Minimal amount of secure websocket server
var fs = require('fs');

// read ssl certificate
var privateKey = fs.readFileSync('/etc/letsencrypt/live/web.oneclickwebcam.com/privkey.pem', 'utf8');
var certificate = fs.readFileSync('/etc/letsencrypt/live/web.oneclickwebcam.com/fullchain.pem', 'utf8');

var credentials = { key: privateKey, cert: certificate };
var https = require('https');

//pass in your credentials to create an https server
var httpsServer = https.createServer(credentials);
httpsServer.listen(8443);

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({
    server: httpsServer
});

function createMessage(content, isBroadcast = false, sender = 'NS', action = null) {
    return JSON.stringify(new Message(content, isBroadcast, sender, action));
}
class Message {
    constructor(content, isBroadcast = false, sender, action) {
        this.content = content;
        this.isBroadcast = isBroadcast;
        this.sender = sender;
        this.action = action;
    }
}
exports.Message = Message;
wss.on('connection', (ws) => {
    const extWs = ws;
    extWs.isAlive = true;
    ws.on('pong', () => {
        extWs.isAlive = true;
    });
    //connection is up, let's add a simple simple event
    ws.on('message', (msg) => {
        try {
            const message = JSON.parse(msg);
            setTimeout(() => {
                if (message.isBroadcast) {
                    //send back the message to the other clients
                    wss.clients
                        .forEach(client => {
                        if (client != ws) {
                            client.send(createMessage(message.content, true, message.sender, message.action));
                        }
                    });
                }
            }, 1000);
        }
        catch (error) {
            console.error(error);
            // expected output: ReferenceError: nonExistentFunction is not defined
            // Note - error messages will vary depending on browser
        }
    });
    ws.on('error', (err) => {
        console.warn(`Client disconnected - reason: ${err}`);
    });
});
setInterval(() => {
    wss.clients.forEach((ws) => {
        const extWs = ws;
        if (!extWs.isAlive)
            return ws.terminate();
        extWs.isAlive = false;
        ws.ping(null, undefined);
    });
}, 10000);
