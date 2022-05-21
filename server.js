const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const session = require("express-session");

const app = express();

const config = require("./config");
const utils = require("./utils");

app.listen(9999, () => {
    console.log("the server is create 9999");
})


app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Methods", config.methods);
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Headers", config.headers);
    req.method === "OPTIONS" ? res.send() : next();
});

app.use(session({
    secret: "sdx",
    cookie: {
        maxAge: 1000 * 120 * 24
    },
    saveUninitialized: false,
    resave: false,
}))

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use("/home", require("./route/home.js"));
app.use("/classify", require("./route/classify.js"));
app.use("/user", require("./route/user.js"));
app.use("/cart", require("./route/shopCart.js"));
app.use("/shopInfo", require("./route/shopInfo.js"));

app.use(express.static('./static'));

app.use((req, res) => {
    res.status(404).send({
        code: 1,
        codeText: "not found"
    });
})