const postToServer = async (route, content, successMessage, onSuccess, routeAfter = "./login.html", postJSON = true) => {
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

const handleSignup = async (event) => {
    event.preventDefault();
    const accountType = document.getElementById("select_acc_type").value;

    let accountData = {
        "type": accountType,
        "username": document.getElementById("input_username").value,
        "password": document.getElementById("input_password").value,
    };

    if(accountType === "bus") {
        accountData.busName = document.getElementById("input_bus_name").value,
        accountData.busStreetAddress = document.getElementById("input_bus_street_address").value
    }

    accountData.city = document.getElementById(`input_${accountType}_city`).value;
    accountData.state = document.getElementById(`select_${accountType}_state`).value;
    accountData.zip = document.getElementById(`input_${accountType}_zip`).value;
    accountData.phoneNumber = document.getElementById(`input_${accountType}_phone`).value;
    accountData.contactFirstName = document.getElementById(`input_${accountType}_contact_first_name`).value;
    accountData.contactLastName = document.getElementById(`input_${accountType}_contact_last_name`).value;

    const formData = new FormData();

    formData.append("accountData", JSON.stringify(accountData));
    formData.append("image", document.getElementById(`input_${accountType}_img`).files[0]);

    //username and password will be encrypted as connection type is https
    await postToServer("/signup", formData, "Account Created", () => {}, "./login.html", false);
};

const handleLogin = async (event) => {
    event.preventDefault();

    const type = document.getElementById("select_acc_type").value;
    const username = document.getElementById("input_username").value;
    const password = document.getElementById("input_password").value;

    //username and password will be encrypted as connection type is https
    await postToServer("/login", {type, username, password}, "", () => {}, "/dashboard");
};

const displaySignupInfo = () => {
    const accountType = document.getElementById("select_acc_type").value;
    const formSignup = document.getElementById("form_signup");
    let divTypeInfo = document.getElementById("div_type_info");

    if(!divTypeInfo) {
        divTypeInfo = document.createElement("div");
        divTypeInfo.id = "div_type_info";
        divTypeInfo.className = "flex-vert-center";
    }else divTypeInfo.innerHTML = "";

    let fullTypeStr;

    divTypeInfo.innerHTML += `
        <label for="input_username">Username (email): </label>
        <input id="input_username" type="email" required/>

        <label for="input_password">Password: </label>
        <input id="input_password" type="password" required/>
    `;

    if(accountType === "bus") {
        divTypeInfo.innerHTML += `
            <label for="input_bus_name">Business Name: </label>
            <input id="input_bus_name" type="text" required/>

            <label for="input_bus_street_address">Business Street Address: </label>
            <input id="input_bus_street_address" type="text" required/>
        `;
        fullTypeStr = "Business";
    }else if(accountType === "driv") {
        fullTypeStr = "Driver";
    }

    divTypeInfo.innerHTML += `
        <label for="input_${accountType}_city">${fullTypeStr} City: </label>
        <input id="input_${accountType}_city" type="text" required/>

        <label for="select_${accountType}_state">${fullTypeStr} State: </label>
        <select id="select_${accountType}_state">
            <option value="OK">Oklahoma</option>
            <option value="AR">Arkansas</option>
            <option value="TX">Texas</option>
            <option value="NM">New Mexico</option>
            <option value="CO">Colorado</option>
            <option value="KS">Kansas</option>
            <option value="MO">Missouri</option>
        </select>

        <label for="input_${accountType}_zip">${fullTypeStr} Zip Code: </label>
        <input id="input_${accountType}_zip" type="number" required/>

        <label for="input_${accountType}_phone">${fullTypeStr} Phone Number: </label>
        <input id="input_${accountType}_phone" type="text" required/>

        <label for="input_${accountType}_contact_first_name">${fullTypeStr} Contact First Name: </label>
        <input id="input_${accountType}_contact_first_name" type="text" required/>

        <label for="input_${accountType}_contact_last_name">${fullTypeStr} Contact Last Name: </label>
        <input id="input_${accountType}_contact_last_name" type="text" required/>

        <label for="input_${accountType}_img">${fullTypeStr} Image: </label>
        <input id="input_${accountType}_img" type="file" accept="image/*" name="image">

        <button type="submit">Sign Up</button>
        `;
    formSignup.appendChild(divTypeInfo);
};