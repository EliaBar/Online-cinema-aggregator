const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');     
});
const options = {
    key: fs.readFileSync('./cert/key.pem'),     
    cert: fs.readFileSync('./cert/cert.pem')     
};

const server = https.createServer(options, app);

const port = 3000;
const host = 'localhost';

server.listen(port, host, () => {
    console.log(`Server is running at https://${host}:${port}`);
});