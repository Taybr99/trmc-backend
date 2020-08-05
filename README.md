
TRMC - Nodejs Backend
=======================================

TRMC Webcam is WebRTC JavaScript application that uses Jitsi Videobridge to provide high quality, secure and scalable video conferences.

This code is for Backend of TRMC video client used to get the tools on all client screen by using Socket.io library.

Installation
-----------------------

It has two folders 
1. socket is for socketIO  used for tools and payment related stuff.

```javascript
cd socket
npm i
pm2 server.js (pm2 to run it on background)
```
2. secure-websocket is for websocket to connect the TRMC desktop application to control it from outside the system.
```javascript
cd secure-websocket
npm i
pm2 index.js (pm2 to run it on background)
```
