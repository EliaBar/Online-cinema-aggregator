const https = require('https');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const app = express();

const router = require('./routes/router'); 

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: '/dwev#egomom0sfjvno1!ldfnosdfvoindo/#@dergrwweggfbsroiyfdcvbnjytrdcvbhytresxcvbhytre', 
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, 
        maxAge: 1000 * 60 * 60 * 24 
    }
}));

app.use((req, res, next) => {
    if (req.session && req.session.user) {
        res.locals.isAuthenticated = true;
        res.locals.user = req.session.user;
    } else {
        res.locals.isAuthenticated = false;
    }
    next();
});

app.use(router);

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