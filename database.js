const models = require("./models.js");
const {randomBytes, scryptSync, timingSafeEqual} = require("crypto");

const getUserModel = (type) => {
    let Model = null;
    if(type === "bus") {
        Model = models.BusUser;
    }else if(type === "driv") {
        Model = models.DrivUser;
    }else if(type === "admin") {
        Model = models.AdminUser;
    }
    return Model;
};

const addUserToDB =  async (userData) => {
    const Model = getUserModel(userData.type);
    const adminModel = getUserModel("admin");
    const sameAsAdmin = await adminModel.findOne({username: userData.username}, "username").exec();
    if(!Model || sameAsAdmin) return new Promise((resolve, reject) => {reject(new Error("Invalid user account type"))});
    const sameUser = await Model.findOne({username: userData.username}, "username").exec();
    if(sameUser) return new Promise((resolve, reject) => {reject(new Error("User already exists"))});
    

    if(userData.type === "driv") {
        userData.available = false;
    }
    delete userData.type;

    const newUser = new Model(userData);

    return newUser.save();
};

//Tutorial followed for hashing + salting passwords https://www.youtube.com/watch?v=NuyzuNBFWxQ

const verifyLogin = async (type, username, password) => {
    //maybe doesn't make sense to return promises in this function
    const Model = getUserModel(type);
    if(!Model) return new Promise((resolve, reject) => {reject(new Error("Invalid account type"))});
    const user = (await Model.findOne({username: username}, "password").exec());
    if(!user) return new Promise((resolve, reject) => {reject(new Error("User account does not exist"))});

    const storedPassword = user.password;
    const [salt, key] = storedPassword.split(":");
    const hashedBuffer = scryptSync(password, salt, 64);

    const keyBuffer = Buffer.from(key, "hex");
    const match = timingSafeEqual(hashedBuffer, keyBuffer);
    if(match) {
        if(type === "driv") {
            Model.updateOne({username: username}, {available: true}).exec().catch((error) => {
                return new Promise((resolve, reject) => {reject(error)});
            });
        }
        return new Promise((resolve, reject) => {resolve("Login succeeded")});
    }else {
        return new Promise((resolve, reject) => {reject(new Error("Incorrect password"))});
    }
}

const addItemsToDB = async (items, busData) => {
    const ItemModel = models.ItemModel;
    const BusModel = models.BusUser;
    let promise;

    const busID = (await BusModel.findOne({username: busData.username}, "_id").exec())._id;
    //if(!busID) return new Promise((resolve, reject) => {reject(new Error("Unable to find Business ID"))});

    items.map((itemData) => {
        if(!itemData.name || !itemData.price) {
            //promise = new Promise((resolve, reject) => {reject(new Error("Item is malformed"))});
            return;
        }
        const item = new ItemModel({busID: busID, name: itemData.name, price: itemData.price});
        item.save()
        .then(() => {
            promise = new Promise((resolve, reject) => {resolve()});
        })
        .catch((error) => {
            console.error("Error: ", error);
            promise = new Promise((resolve, reject) => {reject(new Error("Error saving item"))});
            return;
        });
    });
    return promise;
};

const logout = async (accountData) => {
    if(accountData.type === "driv") {
        DrivModel = models.DrivUser;
        DrivModel.updateOne({username: accountData.username}, {available: false}).exec().catch((error) => {
            return new Promise((resolve, reject) => {reject(error)});
        });
    }
}

const deleteAccount = async (accountData) => {
    const Model = getUserModel(accountData.type);
    return Model.deleteOne({username: accountData.username});
}

const getAccountInfo = async (accountSessionData) => {
    const Model = getUserModel(accountSessionData.type);
    let user = await Model.findOne({username: accountSessionData.username}, "-password").exec();
    //if(!user) return new Promise((resolve, reject) => {reject(new Error("User not found"))});
    user = user.toObject();

    if(accountSessionData.type === "bus") {
        const ItemModel = models.ItemModel;

        const items = await ItemModel.find({busID: user._id}).exec();

        user.items = items;
    }
    return new Promise((resolve, reject) => {resolve(user)});
};

const updateAccountInfo = async (newAccountInfo, accountSessionData) => {
    const Model = getUserModel(accountSessionData.type);

    
    for(const field in newAccountInfo) {
        if(!newAccountInfo[field]) continue;

        if(field == "password") {
            const salt = randomBytes(16).toString("hex");
            const hashedPassword = scryptSync(newAccountInfo.password, salt, 64).toString("hex");

            newAccountInfo.password = `${salt}:${hashedPassword}`;
        }
        
        await Model.findOne({username: accountSessionData.username, [field]: {$exists: true}})
            .then(async () => {
                await Model.updateOne({username: accountSessionData.username}, {[field]: newAccountInfo[field]});
            }); 
    }
}

const createOrder = async (orderInfo, accountData) => {
    const OrderModel = models.OrderModel;
    const BusModel = models.BusUser;
    const user = await BusModel.findOne({username: accountData.username}, "_id busName city state zip").exec();
    const order = new OrderModel({
        busID: user._id,
        busName: user.busName,
        drivID: "",
        drivName: "",
        streetAddress: orderInfo.streetAddress,
        city: user.city,
        state: user.state,
        zip: user.zip,
        items: JSON.stringify(orderInfo.items),
        status: "available",
        deliveryTime: "",
    });

    return order.save();
}

const acceptOrder = async (orderID, accountData) => {
    const OrderModel = models.OrderModel;
    const DrivModel = models.DrivUser;

    const user = await DrivModel.findOne({username: accountData.username}, "_id contactFirstName contactLastName").exec();
    const order = await OrderModel.findOne({_id: orderID}, "status").exec();

    if(order.status !== "available") return new Promise((resolve, reject) => {reject(new Error("Order is not available to accept"))});
    return OrderModel.updateOne(
        {_id: orderID}, 
        {
            drivID: user._id, 
            drivName: user.contactFirstName + " " + user.contactLastName, 
            status: "assigned",
        }).exec();
};

const getOrders = async (accountData) => {
    const OrderModel = models.OrderModel;
    const UserModel = getUserModel(accountData.type);

    if(accountData.type === "bus") {
        const user = await UserModel.findOne({username: accountData.username}, "_id").exec();
        return OrderModel.find({busID: user._id}).exec();
    }else if(accountData.type === "driv") {
        const user = await UserModel.findOne({username: accountData.username}, "_id").exec();
        return OrderModel.find({drivID: user._id}).exec();
    }else if(accountData.type === "admin") {
        //todo
    }else return new Promise((resolve, reject) => {reject(new Error("Invalid account type"))}); //maybe take this out
};

const getAvailableOrders = async (accountData) => {
    const OrderModel = models.OrderModel;
    const DrivModel = models.DrivUser;

    const drivUser = await DrivModel.findOne({username: accountData.username}, "city state").exec();
    return OrderModel.find({status: "available", city: drivUser.city, state: drivUser.state}).exec();
}

const updateOrderInfo = async (updates) => {
    //todo: fix this horrible mess of Promises
    const OrderModel = models.OrderModel;
    let promise = new Promise((resolve, reject) => {resolve("Success")});

    let {orderID, streetAddress, items} = updates;

    const order = await OrderModel.findOne({_id: orderID}, "status").exec().catch((error) => {
        promise = new Promise((resolve, reject) => {reject(error)});
    });

    if(order.status === "delivered" || order.status === "transit" || order.status === "canceled") {
        return new Promise((resolve, reject) => {reject(new Error("Unable to edit order (status not valid for editing)"))});
    }

    if(streetAddress)
        OrderModel.updateOne({_id: orderID}, {streetAddress: streetAddress}).exec().catch((error) => {
            promise = new Promise((resolve, reject) => {reject(error)});
        });
    if(items.length !== 0) {
        items = JSON.stringify(items);
        OrderModel.updateOne({_id: orderID}, {items: items}).exec().catch((error) => {
            promise = new Promise((resolve, reject) => {reject(error)});
        });
    }
    return promise;
}

const updateOrderStatus = async (updates) => {
    const OrderModel = models.OrderModel;
    let promise = new Promise((resolve, reject) => {resolve("Success")});
    for(const {orderID, status} of updates) {
        const order = await OrderModel.findOne({_id: orderID}, "status").exec();
        if(order.status === "delivered" || order.status === "canceled") continue;

        await OrderModel.updateOne({_id: orderID}, {status: status}).exec().catch((error) => {
            promise = new Promise((resolve, reject) => {reject(error)});
        });
        if(status === "delivered" || status === "canceled") {
            OrderModel.updateOne({_id: orderID}, {deliveryTime: new Date().toLocaleString()}).exec().catch((error) => {
                promise = new Promise((resolve, reject) => {reject(error)});
            });
        }
    }
    return promise;
}

module.exports = {
    addUserToDB,
    verifyLogin,
    addItemsToDB,
    logout,
    deleteAccount,
    getAccountInfo,
    updateAccountInfo,
    createOrder,
    acceptOrder,
    getOrders,
    getAvailableOrders,
    updateOrderInfo,
    updateOrderStatus,
};