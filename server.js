const db = require("./database.js");
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const https = require("https");
const fs = require("fs");
const multer = require("multer");
const {scryptSync, randomBytes} = require("crypto");
const portHTTP = 3000;
const portHTTPS = 3443;

mongoose.connect("mongodb://127.0.0.1/Delivery_Service", {
    //these are commented as mongodb driver warns that these options are deprecated and have no effect
    //useNewUrlParser: true,
    //useUnifiedTopology: true,
});

const appHTTP = express();
const appHTTPS = express();
const upload = multer();

appHTTP.listen(portHTTP, () => { //listen for http connections on port 3000
    console.log(`HTTP Server Running at http://localhost:${portHTTP}`);
});

appHTTP.use((request, response) => { //redirect all http requests to https
    response.redirect(`https://localhost:${portHTTPS}${request.originalUrl}`);
});

appHTTPS.use(express.json()); //automatically parse JSON in post requests
appHTTPS.use(express.static("public")); //make the public folder available to the client?
appHTTPS.use(session({
    secret: randomBytes(32).toString("hex"),
    resave: true,
    saveUninitialized: false,
}));
appHTTPS.use(bodyParser.urlencoded({extended: true}));

//Tutorial followed to create https server with ssl https://www.youtube.com/watch?v=USrMdBF0zcg
const sslServer = https.createServer({
    key: fs.readFileSync(path.join(__dirname, "cert", "key.pem")), 
    cert: fs.readFileSync(path.join(__dirname, "cert", "cert.pem"))}
    , appHTTPS);
sslServer.listen(portHTTPS, () => { //listen for https connections on port 3443
    console.log(`HTTPS Server Running at https://localhost:${portHTTPS}`)
});

appHTTPS.get("/", (request, response) => { //default route gets sent the login page
    response.sendFile(path.join(__dirname, "public", "login.html"));
});

//Tutorial followed for hashing + salting passwords https://www.youtube.com/watch?v=NuyzuNBFWxQ

appHTTPS.post("/login", async (request, response) => {
    if(request.session.user) {
        response.status(303).send("You are already logged in");
        return;
    }
    const loginData = request.body;
    const type = loginData.type;
    const username = loginData.username;
    const password = loginData.password;

    try {
        await db.verifyLogin(type, username, password);
        //if user login is valid store session info
        //so the server will know the user is logged in
        request.session.user = {"type": type, "username": username};
        response.sendStatus(200);
    }catch(error) {
        console.error("Error: ", error);
        response.status(401).send("Invalid login\nAccount does not exist or password is incorrect");
    }
});

appHTTPS.post("/signup", upload.single("image"), async (request, response) => {
    const image = request.file;
    const accountData = JSON.parse(request.body.accountData);

    if(!accountData || !accountData.password) {
        response.status(500).send("Error signing up user");
        return;
    }

    const salt = randomBytes(16).toString("hex");
    const hashedPassword = scryptSync(accountData.password, salt, 64).toString("hex");

    accountData.password = `${salt}:${hashedPassword}`;
    if(image) accountData.image = image.buffer;
    
    try {
        await db.addUserToDB(accountData);
        response.sendStatus(200);
    }catch (error) {
        console.error("Error: ", error);
        response.status(500).send("Error signing up user (user may already exist)");
    };
});

appHTTPS.get("/dashboard", (request, response) => { //protected route
    const sessionData = request.session.user;
    if(sessionData) {
        response.sendFile(path.join(__dirname, "verified_user", sessionData.type, "dashboard.html"));
    }else {
        response.status(401).send("You do not have permission to access this page");
    }
});

appHTTPS.get("/dashboard.js", (request, response) => { //protected route
    const sessionData = request.session.user;
    if(sessionData) {
        response.setHeader("Content-Type", "application-javascript");
        response.sendFile(path.join(__dirname, "verified_user", "dashboard.js"));
    }else {
        response.status(401).send("You do not have permission to access this file");
    }
});

appHTTPS.get("/dashboard:file", (request, response) => { //protected route
    const sessionData = request.session.user;
    if(sessionData) {
        const file = request.params.file;
        if(fs.existsSync(path.join(__dirname, "verified_user", sessionData.type, `${file}.html`))) {
            response.sendFile(path.join(__dirname, "verified_user", sessionData.type, `${file}.html`));
        }else {
            response.status(404).send("File not found");
        }
    }else {
        response.status(401).send("You do not have permission to access this page");
    }
});

appHTTPS.post("/add_items", async (request, response) => { //protected route
    const sessionData = request.session.user;
    if(sessionData && (sessionData.type === "bus" || sessionData.type === "admin")) {
        const items = request.body;

        try {
            await db.addItemsToDB(items, sessionData);
            response.sendStatus(200);
        }catch (error) {
            console.error("Error: ", error);
            response.status(500).send("Error adding items to business inventory");
        };
    }else {
        response.status(401).send("You do not have permission to do this");
    }
});

appHTTPS.get("/logout", async (request, response) => { //protected route
    if(request.session.user) {
        try {
            await db.logout(request.session.user);
            request.session.user = null;
            response.sendStatus(200);
        }catch (error) {
            console.error("Error: ", error);
            response.status(500).send("Error logging out");
        };
    }else {
        response.status(401).send("You are not logged in");
    }
});

appHTTPS.get("/delete_account", async (request, response) => { //protected route
    if(request.session.user) {
        try {
            await db.deleteAccount(request.session.user);
            request.session.user = null;
            response.sendStatus(200);
        }catch (error) {
            console.error("Error: ", error);
            response.status(500).send("Error deleting account");
        };
    }else {
        response.status(401).send("You are not logged in");
    }
});

appHTTPS.get("/get_acc_info", async (request, response) => { //protected route
    const sessionData = request.session.user;
    if(sessionData) {
        try {
            const accountInfo = await db.getAccountInfo(sessionData);
            response.json(accountInfo);
        }catch (error) {
            console.error("Error: ", error);
            response.status(500).send("Error getting account info");
        };
    }else {
        response.status(401).send("You do not have permission to do this");
    }
});

appHTTPS.post("/update_acc_info", upload.single("image"), async (request, response) => { //protected route
    const sessionData = request.session.user;
    if(sessionData) {
        const image = request.file;
        const accountData = JSON.parse(request.body.accountData);

        if(!accountData) {
            response.status(500).send("Error updating account");
            return;
        }

        if(image) accountData.image = image.buffer;

        try {
            await db.updateAccountInfo(accountData, sessionData);
            if(accountData.username) request.session.user = {"type": sessionData.type, "username": accountData.username};
            response.sendStatus(200);
        }catch (error) {
            console.error("Error: ", error);
            response.status(500).send("Error updating account");
        };
    }else {
        response.status(401).send("You do not have permission to do this");
    }
});

appHTTPS.post("/create_order", async (request, response) => { //protected route
    const sessionData = request.session.user;
    if(sessionData && (sessionData.type === "bus" || sessionData.type === "admin")) {
        const orderInfo = request.body;

        try {
            await db.createOrder(orderInfo, sessionData);
            response.sendStatus(200);
        }catch (error) {
            console.error("Error: ", error);
            response.status(500).send("Error creating order");
        };
    }else {
        response.status(401).send("You do not have permission to do this");
    }
});

appHTTPS.get("/get_orders", async (request, response) => { //protected route
    const sessionData = request.session.user;
    if(sessionData) {
        try {
            const orders = await db.getOrders(sessionData);
            response.json(orders);
        }catch (error) {
            console.error("Error: ", error);
            response.status(500).send("Error getting orders");
        };
    }else {
        response.status(401).send("You do not have permission to do this");
    }
});

appHTTPS.get("/get_available_orders", async (request, response) => { //protected route
    const sessionData = request.session.user;
    if(sessionData && sessionData.type === "driv") {
        try {
            const orders = await db.getAvailableOrders(sessionData);
            response.json(orders);
        }catch (error) {
            console.error("Error: ", error);
            response.status(500).send("Error getting orders");
        };
    }else {
        response.status(401).send("You do not have permission to do this");
    }
});

appHTTPS.post("/accept_order", async (request, response) => { //protected route
    const sessionData = request.session.user;
    if(sessionData && sessionData.type === "driv") {
        const requestData = request.body;
        try {
            await db.acceptOrder(requestData.orderID, sessionData);
            response.sendStatus(200);
        }catch (error) {
            console.error("Error: ", error);
            response.status(500).send("Error accepting order");
        };
    }else {
        response.status(401).send("You do not have permission to do this");
    }
});

appHTTPS.post("/update_order", async (request, response) => {
    const sessionData = request.session.user;
    if(sessionData) {
        const requestData = request.body;

        if(requestData.updateType === "status") {
            try {
                await db.updateOrderStatus(requestData.updates);
                response.sendStatus(200);
            }catch (error) {
                console.error("Error: ", error);
                response.status(500).send("Error updating order status");
            };
        }else if(requestData.updateType === "info"){
            try {
                await db.updateOrderInfo(requestData.updates);
                response.sendStatus(200);
            }catch (error) {
                console.error("Error: ", error);
                response.status(500).send("Error updating order info");
            };
        }
    }else {
        response.status(401).send("You do not have permission to do this");
    }
}); 