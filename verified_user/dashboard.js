let newOrder = [];
let orders = [];

const getFromServer = async (route) => {
    try {
        const response = await fetch(route);
        if(response.ok){
            const responseJSON = response.clone();
            const responseBlob = response.clone();
            const responseText = response.clone();
            try {
                return await responseJSON.json();
            }catch {
                try {
                    return await responseBlob.blob();
                }catch {
                    return await responseText.text();
                }
            }
        }
        const message = await response.text();
        console.error("Error Status: ", response.status, "\n", message);
        alert("Error Status: " + response.status + "\n" + message);
    }catch (error) {
        console.error("Error: ", error);
    }
    //return new Promise((resolve, reject) => {reject(new Error(`GET request on ${route} route failed.`))});
};

const postToServer = async (route, content, successMessage, onSuccess, routeAfter = "/dashboard", postJSON = true) => {
    try {
        const response = await fetch(
            route, 
            postJSON ? 
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(content)
            }: 
            {
                method: "POST",
                body: content
            }
        );
        if(response.ok){
            if(successMessage) alert(successMessage);
            if(onSuccess) onSuccess();
            window.location.assign(routeAfter);
            const responseJSON = response.clone();
            const responseBlob = response.clone();
            const responseText = response.clone();
            try {
                return await responseJSON.json();
            }catch {
                try {
                    return await responseBlob.blob();
                }catch {
                    return await responseText.text();
                }
            }
        }else {
            const message = await response.text();
            console.error("Error Status: ", response.status, "\n", message);
            alert("Error Status: " + response.status + "\n" + message);
            if(response.status === 303) window.location.assign(routeAfter);
        }
    }catch (error) {
        console.error("Error: ", error);
    }    
};

const displayAccInfo = async () => {
    const userInfo = await getFromServer("/get_acc_info");

    if(!userInfo) return;

    let name = userInfo.busName ?? userInfo.contactFirstName + " " + userInfo.contactLastName;

    const h1Name = document.getElementById("h1_name");
    const imgAcc = document.getElementById("img_acc");

    h1Name.innerHTML = name;
    imgAcc.src = `data:image/jpg;base64,${userInfo.image}`;
    imgAcc.width = 200;
    imgAcc.height = 200;

    const divAccInfo = document.getElementById("div_acc_info");

    if(!divAccInfo) return;

    if(userInfo.busStreetAddress) {
        const h3BusStreetAddress = document.createElement("h3");
        h3BusStreetAddress.innerHTML = `Business Street Address: ${userInfo.busStreetAddress}`;

        divAccInfo.appendChild(h3BusStreetAddress);
    }

    divAccInfo.innerHTML += `
        <h4>Username: ${userInfo.username}</h4>
        <h4>City: ${userInfo.city}</h4>
        <h4>State: ${userInfo.state}</h4>
        <h4>Zip Code: ${userInfo.zip}</h4>
        <h4>Phone Number: ${userInfo.phoneNumber}</h4>
        <h4>Contact First Name: ${userInfo.contactFirstName}</h4>
        <h4>Contact Last Name: ${userInfo.contactLastName}</h4>
    `;
};

const displayUpdateAccInfo = (accountType) => {
    const formUpdateAccInfo = document.getElementById("form_update_acc_info");

    let fullTypeStr;

    formUpdateAccInfo.innerHTML += `
        <label for="input_username">Username (email): </label>
        <input id="input_username" type="email"/>

        <label for="input_password">Password: </label>
        <input id="input_password" type="password"/>
    `;

    if(accountType === "bus") {
        formUpdateAccInfo.innerHTML += `
            <label for="input_bus_name">Business Name: </label>
            <input id="input_bus_name" type="text"/>

            <label for="input_bus_street_address">Business Street Address: </label>
            <input id="input_bus_street_address" type="text"/>
        `;
        fullTypeStr = "Business";
    }else if(accountType === "driv") {
        fullTypeStr = "Driver";
    }

    formUpdateAccInfo.innerHTML += `
        <label for="input_city">${fullTypeStr} City: </label>
        <input id="input_city" type="text"/>

        <label for="select_state">${fullTypeStr} State: </label>
        <select id="select_state">
            <option value="" hidden>Select a State</option>
            <option value="OK">Oklahoma</option>
            <option value="AR">Arkansas</option>
            <option value="TX">Texas</option>
            <option value="NM">New Mexico</option>
            <option value="CO">Colorado</option>
            <option value="KS">Kansas</option>
            <option value="MO">Missouri</option>
        </select>

        <label for="input_zip">${fullTypeStr} Zip Code: </label>
        <input id="input_zip" type="number"/>

        <label for="input_phone">${fullTypeStr} Phone Number: </label>
        <input id="input_phone" type="text"/>

        <label for="input_contact_first_name">${fullTypeStr} Contact First Name: </label>
        <input id="input_contact_first_name" type="text"/>

        <label for="input_contact_last_name">${fullTypeStr} Contact Last Name: </label>
        <input id="input_contact_last_name" type="text"/>

        <label for="input_img">${fullTypeStr} Image: </label>
        <input id="input_img" type="file" accept="image/*" name="image">

        <button type="submit">Update</button>
        `;
};

const updateAccInfo = async (event) => {
    event.preventDefault();

    let accountData = {};
    const elements = [
        ["username", "input_username"], 
        ["password", "input_password"],
        ["busName", "input_bus_name"],
        ["busStreetAddress", "input_bus_street_address"],
        ["city", "input_city"],
        ["state", "select_state"],
        ["zip", "input_zip"],
        ["phoneNumber", "input_phone"],
        ["contactFirstName", "input_contact_first_name"],
        ["contactLastName", "input_contact_last_name"],
    ];

    for(const element of elements) {
        const elementHTML = document.getElementById(element[1]);
        if(elementHTML) {
            const elementValue = elementHTML.value;
            if(elementValue) {
                accountData[element[0]] = elementValue;
            }
        }
    }

    const formData = new FormData();
    formData.append("accountData", JSON.stringify(accountData));
    formData.append("image", document.getElementById(`input_img`).files[0]);

    await postToServer("/update_acc_info", formData, "Account Updated", () => {}, "/dashboard", false);
}

const addInput = () => {
    const divBusItems = document.getElementById("div_bus_items");
    const divNewItem = document.createElement("div");

    divNewItem.innerHTML += `
        <br />
        <label for="input_item_name">Item Name: </label>
        <input id="input_item_name" name="input_item_name"/>
        <label for="input_item_price">Item Price: </label>
        <input id="input_item_price" name="input_item_price" type="number" min="0" max="10000" step="0.01"/>
    `;
    divBusItems.appendChild(divNewItem);
};

const addBusItems = async (event) => {
    event.preventDefault();
    const itemNames = document.getElementsByName("input_item_name");
    const itemPrices = document.getElementsByName("input_item_price");

    const items = Array.from(itemNames).map((nameInput, index) => ({
        name: nameInput.value,
        price: itemPrices[index].value,
    }));

    await postToServer("/add_items", items, "Items added");
};

const logout = async () => {
    await getFromServer("/logout");
    window.location.assign("./login.html");
};

const deleteAccount = async () => {
    await getFromServer("/delete_account");
    window.location.assign("./login.html");
};

const displayCreateOrder = async (orderID, strFormElement = "form_order") => {
    let formOrder = document.getElementById(strFormElement);
    const divSelectItem = document.createElement("div");
    const divInputQuantity = document.createElement("div");
    const divButtonAddSubmit = document.createElement("div");
    const userInfo = await getFromServer("/get_acc_info");
    if(!userInfo) return;

    formOrder.innerHTML = `
        <label for="input${orderID ? "_" + orderID: ""}_street_address">Street Address: </label>
        <input id="input${orderID ? "_" + orderID: ""}_street_address" type="text" />

        <h3 id="h3_city">City: ${userInfo.city}</h3>
        <h3 id="h3_state">State: ${userInfo.state}</h3>
        <h3 id="h3_zip">Zip Code: ${userInfo.zip}</h3>
    `;
    divSelectItem.innerHTML = `
        <label for="select${orderID ? "_" + orderID: ""}_item">Select Item to Add: </label>
        <select id="select${orderID ? "_" + orderID: ""}_item">
           ${userInfo.items.map((item) => {
            return `<option value="${item._id}">${item.name} @ $${Number.parseFloat(item.price).toFixed(2)}</option>`
           }).join('')}
        </select>
    `;
    formOrder.appendChild(divSelectItem);
    divInputQuantity.innerHTML = `
           <label for="input${orderID ? "_" + orderID: ""}_quantity">Quantity: </label>
           <input id="input${orderID ? "_" + orderID: ""}_quantity" type="number" min="1" max="100" step="1" value="1"/>
    `;
    formOrder.appendChild(divInputQuantity);
    divButtonAddSubmit.innerHTML = `
           <button 
           id="button${orderID ? "_" + orderID: ""}_add_item"
           type="button"
           style="zIndex: 1000"
           >
           Add to Order
           </button>

           <button
           id="button_submit"
           type="submit"
           >
           Submit Order
           </button>
    `;
    formOrder.appendChild(divButtonAddSubmit);
    if(!orderID) {
        document.getElementById(`button_add_item`).addEventListener("click", () => {
            const selectedItem = document.getElementById(`select_item`).value;
            const quantity = document.getElementById(`input_quantity`).value;
    
            displayAndAddItems(userInfo.items, selectedItem, quantity);
        });
    }
};

const displayAndAddItems = (items, itemID, quantity, strHTMLElement = "form_order", orderID = "") => {
    const HTMLElement = document.getElementById(strHTMLElement);
    const divItemID = `div_${orderID || itemID}_item`;
    const h3ItemID = `h3_${orderID ? orderID + "_" + itemID: itemID}_item`;
    const h3Item = document.getElementById(h3ItemID);
    const foundItem = items.find(item => item._id === itemID);
    let itemInOrder;

    if(orderID) {
        const order = orders.find(order => order._id === orderID);
        if(order) {
            itemInOrder = order.items.find(item => item._id === itemID);
            if(!itemInOrder) order.items.push({_id: itemID, quantity: Number.parseInt(quantity)});
        }else {
            orders.push({_id: orderID, items: [{_id: itemID, quantity: Number.parseInt(quantity)}]});
        }
    }else {
        itemInOrder = newOrder.find(item => item._id === itemID);
        if(!itemInOrder) newOrder.push({_id: itemID, quantity: Number.parseInt(quantity)});
    }
    
    if(itemInOrder && h3Item) {
        itemInOrder.quantity += Number.parseInt(quantity);
        h3Item.innerHTML = `
            Name: ${foundItem.name}
            @ $${Number.parseFloat(foundItem.price).toFixed(2)}
            x ${itemInOrder.quantity}
        `;
    }else {
        let divItem = document.getElementById(divItemID);
        if(!divItem) {
            divItem = document.createElement("div");
            divItem.id = divItemID;
        }
        HTMLElement.appendChild(divItem);
        divItem.innerHTML += `
            <h3 id="${h3ItemID}">
            Name: ${foundItem.name}
            @ $${Number.parseFloat(foundItem.price).toFixed(2)}
            x ${quantity}
            </h3>
        `;
    }
};

const createOrder = async(event) => {
    event.preventDefault();
    const streetAddress = document.getElementById("input_street_address").value;
    if(newOrder.length === 0) {
        alert("Nothing is in your order");
        return;
    }
    if(!streetAddress) {
        alert("Invalid street address");
        return;
    }
    await postToServer("/create_order", {items: newOrder, streetAddress}, "Order Submitted", () => {newOrder = [];});
};

const putOrders = (HTMLElement, orders) => {
    HTMLElement.innerHTML = `
        ${orders.map((order) => {
            return `
                <div id="div_${order._id}_order">
                <p>
                Order: ${order.busName}, 
                ${order.city}, 
                ${order.state}, 
                ${order.zip}, 
                <strong style="color:red">Deliver to: ${order.streetAddress}</strong>,
                <strong style="color:blue"> Status: ${order.status} </strong>,
                <strong style="color:green">
                Delivery Driver: ${order.drivName || "N/A"}
                ${order.status === "canceled" ? "Cancelation": "Delivery"} Time: ${order.deliveryTime || "N/A"}
                </strong>
                </p>
                </div>
            `;
        }).join("")}
    `;
};

const displayOrders = async() => {
    const divOrders = document.getElementById("div_orders");

    const orders = await getFromServer("/get_orders");

    if(orders) putOrders(divOrders, orders);
};

const displayAvailableOrders = async() => {
    const divOrders = document.getElementById("div_orders");

    const availableOrders = await getFromServer("/get_available_orders");
    
    putOrders(divOrders, availableOrders);
    for(const order of availableOrders) {
        document.getElementById(`div_${order._id}_order`).addEventListener("click", () => {
            acceptOrder(order._id);
        });
    }
};

const displayUpdateOrderStatus = async () => {
    const divOrders = document.getElementById("div_orders");

    const orders = await getFromServer("/get_orders");

    putOrders(divOrders, orders);
    for(const order of orders) {
        if(order.status === "delivered" || order.status === "canceled") continue;
        const divOrder = document.getElementById(`div_${order._id}_order`);
        divOrder.innerHTML += `
            <label for="select_${order._id}_status">Update Order Status</label>
            <select id="select_${order._id}_status">
                <option value="${order.status}" selected hidden>${order.status}</option>
                <option value="assigned">assigned</option>
                <option value="transit">transit</option>
                <option value="delivered">delivered</option>
                <option value="canceled">canceled</option>
            </select>
        `;
        divOrder.className = "flex-vert-center";
    }
};

const displayUpdateOrderInfo = async () => {
    const divOrders = document.getElementById("div_orders");

    const orders = await getFromServer("/get_orders");
    const userInfo = await getFromServer("/get_acc_info");

    putOrders(divOrders, orders);
    
    for(const order of orders) {
        if(order.status === "delivered" || order.status === "canceled" || order.status === "transit") continue;

        const divOrder = document.getElementById(`div_${order._id}_order`);
        divOrder.className = "flex-vert-center";
        const formOrder = document.createElement("form");
        const formOrderID = `form_${order._id}_order`;
        formOrder.id = formOrderID;
        formOrder.className = "flex-vert-center";
        divOrder.appendChild(formOrder);

        await displayCreateOrder(order._id, formOrderID);
        const buttonCancelOrder = document.createElement("button");
        buttonCancelOrder.id = `button_${order._id}_cancel_order`;
        buttonCancelOrder.type = "button";
        buttonCancelOrder.innerHTML = "Cancel Order";
        formOrder.appendChild(buttonCancelOrder);
        for(const item of JSON.parse(order.items)) {
            displayAndAddItems(userInfo.items, item._id, item.quantity, formOrderID, order._id);
        }

        document.getElementById(formOrderID).addEventListener("submit", (event) => {
            updateOrderInfo(event, order._id);
        });
        document.getElementById(`button_${order._id}_add_item`).addEventListener("click", () => {
            const selectedItem = document.getElementById(`select_${order._id}_item`).value;
            const quantity = document.getElementById(`input_${order._id}_quantity`).value;
    
            displayAndAddItems(userInfo.items, selectedItem, quantity, formOrderID, order._id);
        });
        buttonCancelOrder.addEventListener("click", () => {
            updateOrderStatus([{orderID: order._id, status: "canceled"}]);
        });
    }
}

const updateOrderStatus = async (updates = []) => {
    const orders = await getFromServer("/get_orders");

    if(!orders) return;

    if(updates.length === 0) 
        for(const order of orders) {
            if(order.status === "delivered") continue;
            const selectOrderStatus = document.getElementById(`select_${order._id}_status`);
            if(selectOrderStatus) updates.push({orderID: order._id, status: selectOrderStatus.value});
        }

    await postToServer("/update_order", {updates, updateType: "status"}, "Order(s) Updated");
};

const updateOrderInfo = async (event, orderID) => {
    event.preventDefault();
    const inputStreetAddress = document.getElementById(`input_${orderID}_street_address`);
    let streetAddress = "";
    if(inputStreetAddress) streetAddress = inputStreetAddress.value;
    
    await postToServer("/update_order", 
        {
            updates: 
            {
                orderID, streetAddress, items: orders.find(order => order._id === orderID).items
            }, 
            updateType: "info"
        }, 
        "Order Updated");
};

const acceptOrder = async (orderID) => {
    await postToServer("/accept_order", {orderID}, "Order Accepted");
};