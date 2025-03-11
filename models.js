const mongoose = require("mongoose");

adminSchema = new mongoose.Schema({
    username: String,
    password: String,
});

busSchema = new mongoose.Schema({
    username: String,
    password: String,
    busName: String,
    busStreetAddress: String,
    city: String,
    state: String,
    zip: String,
    phoneNumber: String,
    contactFirstName: String,
    contactLastName: String,
    image: Buffer,
});

itemSchema = new mongoose.Schema({
    busID: String,
    name: String,
    price: String,
});

orderSchema = new mongoose.Schema({
    busID: String,
    busName: String,
    drivID: String,
    drivName: String,
    streetAddress: String,
    city: String,
    state: String,
    zip: String,
    items: String,
    status: String,
    deliveryTime: String
});

drivSchema = new mongoose.Schema({
    username: String,
    password: String,
    city: String,
    state: String,
    zip: String,
    phoneNumber: String,
    contactFirstName: String,
    contactLastName: String,
    image: Buffer,
    available: Boolean,
});

module.exports = {
    AdminUser: mongoose.model("Admin", adminSchema),
    BusUser: mongoose.model("Business", busSchema),
    DrivUser: mongoose.model("Delivery_Driver", drivSchema),
    ItemModel: mongoose.model("Item", itemSchema),
    OrderModel: mongoose.model("Order", orderSchema),
};