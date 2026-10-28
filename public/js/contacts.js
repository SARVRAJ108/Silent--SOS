console.log("CONTACTS JS LOADED");

// =========================
// CHECK LOGGED-IN USER
// =========================

const savedUser = localStorage.getItem("silentSOSUser");

if (!savedUser) {
    window.location.href = "/login.html";
    throw new Error("User is not logged in.");
}

let user;

try {
    user = JSON.parse(savedUser);
} catch (error) {
    console.error("Invalid saved user:", error);

    localStorage.removeItem("silentSOSUser");

    window.location.href = "/login.html";

    throw new Error("Invalid user session.");
}

const loggedInUserId = Number(user.id || user.userId);

if (!Number.isInteger(loggedInUserId) || loggedInUserId <= 0) {
    console.error("Invalid user object:", user);
    alert("User ID nahi mili. Logout karke dobara login karo.");
    throw new Error("Valid user ID is required.");
}


// =========================
// START CONTACTS PAGE
// =========================

startContactsPage();


// =====================================================
// START CONTACTS PAGE
// =====================================================

function startContactsPage() {

    // =========================
    // ELEMENTS
    // =========================

    const manualAddButton =
        document.getElementById("manualAddButton");

    const phoneContactButton =
        document.getElementById("phoneContactButton");

    const contactPickerMessage =
        document.getElementById("contactPickerMessage");

    const contactModal =
        document.getElementById("contactModal");

    const closeModal =
        document.getElementById("closeModal");

    const cancelModal =
        document.getElementById("cancelModal");

    const contactForm =
        document.getElementById("contactForm");

    const contactName =
        document.getElementById("contactName");

    const contactPhone =
        document.getElementById("contactPhone");

    const contactEmail =
        document.getElementById("contactEmail");

    const contactRelation =
        document.getElementById("contactRelation");

    const contactSelected =
        document.getElementById("contactSelected");

    const selectAllButton =
        document.getElementById("selectAllButton");

    const emptyAddButton =
        document.getElementById("emptyAddButton");

    const searchContact =
        document.getElementById("searchContact");


    // =====================================================
    // OPEN ADD CONTACT MODAL
    // =====================================================

    if (manualAddButton) {

        manualAddButton.addEventListener(
            "click",
            function () {

                if (contactForm) {
                    contactForm.reset();
                }

                if (contactSelected) {
                    contactSelected.checked = true;
                }

                if (contactModal) {
                    contactModal.classList.add("show");
                }

            }
        );

    }


    // =====================================================
    // EMPTY STATE ADD BUTTON
    // =====================================================

    if (emptyAddButton) {

        emptyAddButton.addEventListener(
            "click",
            function () {

                if (manualAddButton) {
                    manualAddButton.click();
                }

            }
        );

    }


    // =====================================================
    // CLOSE MODAL
    // =====================================================

    if (closeModal) {

        closeModal.addEventListener(
            "click",
            function () {

                if (contactModal) {
                    contactModal.classList.remove("show");
                }

            }
        );

    }


    if (cancelModal) {

        cancelModal.addEventListener(
            "click",
            function () {

                if (contactModal) {
                    contactModal.classList.remove("show");
                }

            }
        );

    }


    // =====================================================
    // SAVE MANUAL CONTACT
    // =====================================================

    if (contactForm) {

        contactForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const name =
                    contactName
                        ? contactName.value.trim()
                        : "";

                const mobile =
                    contactPhone
                        ? contactPhone.value.trim()
                        : "";

                const email =
                    contactEmail
                        ? contactEmail.value.trim()
                        : "";

                const relationship =
                    contactRelation
                        ? contactRelation.value.trim()
                        : "";

                const includeInSOS =
                    contactSelected
                        ? contactSelected.checked
                        : true;


                // =========================
                // VALIDATION
                // =========================

                if (!name || !mobile) {

                    alert(
                        "Name and mobile number are required."
                    );

                    return;

                }


                try {

                    console.log(
                        "Saving contact for user:",
                        user.id
                    );


                    const response =
                        await fetch(
                            "/api/contacts",
                            {

                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
body: JSON.stringify({
    user_id: Number(user.id || user.userId),
    name: name,
    mobile: mobile,
    email: email,
    relationship: relationship,
    include_in_sos: includeInSOS
})
                            }
                        );


                    const data =
                        await response.json();


                    console.log(
                        "Save contact response:",
                        data
                    );


                    if (
                        !response.ok ||
                        !data.success
                    ) {

                        alert(
                            data.message ||
                            "Unable to save contact."
                        );

                        return;

                    }


                    // =========================
                    // SUCCESS
                    // =========================

                    alert(
                        "Contact saved successfully!"
                    );


                    if (contactModal) {
                        contactModal.classList.remove(
                            "show"
                        );
                    }


                    contactForm.reset();


                    if (contactSelected) {
                        contactSelected.checked = true;
                    }


                    // Reload directly from MySQL

                    await loadContacts();


                } catch (error) {

                    console.error(
                        "Save contact error:",
                        error
                    );

                    alert(
                        "Server error. Please make sure the server is running."
                    );

                }

            }
        );

    }


    // =====================================================
    // PHONE CONTACTS
    // =====================================================

    if (phoneContactButton) {

        phoneContactButton.addEventListener(
            "click",
            async function () {

                if (contactPickerMessage) {
                    contactPickerMessage.textContent = "";
                }


                // =========================
                // CHECK SUPPORT
                // =========================

                if (
                    !navigator.contacts ||
                    !navigator.contacts.select
                ) {

                    if (contactPickerMessage) {

                        contactPickerMessage.textContent =
                            "Phone Contacts are not supported in this browser. Please use a supported mobile browser.";

                    }

                    return;

                }


                try {

                    if (contactPickerMessage) {

                        contactPickerMessage.textContent =
                            "Opening phone contacts...";

                    }


                    const contacts =
                        await navigator.contacts.select(
                            [
                                "name",
                                "tel",
                                "email"
                            ],
                            {
                                multiple: true
                            }
                        );


                    if (
                        !contacts ||
                        contacts.length === 0
                    ) {

                        if (contactPickerMessage) {

                            contactPickerMessage.textContent =
                                "No contacts selected.";

                        }

                        return;

                    }


                    let savedCount = 0;


                    // =========================
                    // SAVE SELECTED CONTACTS
                    // =========================

                    for (
                        const selectedContact
                        of contacts
                    ) {

                        const name =
                            selectedContact.name &&
                            selectedContact.name.length > 0
                                ? selectedContact.name[0]
                                : "Unknown Contact";


                        const mobile =
                            selectedContact.tel &&
                            selectedContact.tel.length > 0
                                ? selectedContact.tel[0]
                                : "";


                        const email =
                            selectedContact.email &&
                            selectedContact.email.length > 0
                                ? selectedContact.email[0]
                                : "";


                        if (!mobile) {
                            continue;
                        }


                        try {

                            const response =
                                await fetch(
                                    "/api/contacts",
                                    {

                                        method: "POST",

                                        headers: {
                                            "Content-Type":
                                                "application/json"
                                        },

         body: JSON.stringify({
    user_id: Number(user.id || user.userId),
    name: name,
    mobile: mobile,
    email: email,
    relationship: "",
    include_in_sos: true
})
                                    }
                                );


                            const data =
                                await response.json();


                            if (
                                response.ok &&
                                data.success
                            ) {

                                savedCount++;

                            }

                        } catch (error) {

                            console.error(
                                "Phone contact save error:",
                                error
                            );

                        }

                    }


                    // Reload from database

                    await loadContacts();


                    if (contactPickerMessage) {

                        if (savedCount === 1) {

                            contactPickerMessage.textContent =
                                "1 contact added successfully.";

                        } else if (savedCount > 1) {

                            contactPickerMessage.textContent =
                                `${savedCount} contacts added successfully.`;

                        } else {

                            contactPickerMessage.textContent =
                                "No contacts could be added.";

                        }

                    }


                } catch (error) {

                    console.error(
                        "Phone contact picker error:",
                        error
                    );


                    if (contactPickerMessage) {

                        contactPickerMessage.textContent =
                            "Contact selection was cancelled or permission was not granted.";

                    }

                }

            }
        );

    }


    // =====================================================
    // LOAD CONTACTS FROM MYSQL
    // =====================================================

    async function loadContacts() {

        try {

            console.log(
                "Loading contacts for user:",
                user.id
            );


            const response =
                await fetch(
                    `/api/contacts/${user.id}`
                );


            console.log(
                "Contacts API status:",
                response.status
            );


            const data =
                await response.json();


            console.log(
                "Contacts from server:",
                data
            );


            if (
                !response.ok ||
                !data.success
            ) {

                console.error(
                    data.message ||
                    "Unable to load contacts."
                );

                return;

            }


            displayContacts(
                data.contacts || []
            );


        } catch (error) {

            console.error(
                "Load contacts error:",
                error
            );

        }

    }


    // =====================================================
    // DISPLAY CONTACTS
    // =====================================================

    function displayContacts(contacts) {

        const contactList =
            document.getElementById(
                "contactList"
            );

        const emptyContacts =
            document.getElementById(
                "emptyContacts"
            );

        const contactCount =
            document.getElementById(
                "contactCount"
            );

        const selectedCount =
            document.getElementById(
                "selectedCount"
            );


        if (!contactList) {

            console.error(
                "contactList element not found."
            );

            return;

        }


        contactList.innerHTML = "";


        // =========================
        // CONTACT COUNT
        // =========================

        if (contactCount) {

            contactCount.textContent =
                contacts.length;

        }


        // =========================
        // EMPTY
        // =========================

        if (contacts.length === 0) {

            if (emptyContacts) {

                emptyContacts.style.display =
                    "block";

            }

            if (selectedCount) {

                selectedCount.textContent =
                    "0";

            }

            return;

        }


        if (emptyContacts) {

            emptyContacts.style.display =
                "none";

        }


        let selected = 0;


        // =========================
        // CREATE CONTACT CARDS
        // =========================

        contacts.forEach(
            function (contact) {

                if (
                    Number(
                        contact.include_in_sos
                    ) === 1
                ) {

                    selected++;

                }


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "contact-card";


                card.innerHTML = `

                    <div class="contact-info">

                        <h3>
                            ${escapeHTML(
                                contact.name
                            )}
                        </h3>

                        <p>
                            📱
                            ${escapeHTML(
                                contact.mobile
                            )}
                        </p>

                        ${
                            contact.email
                            ?
                            `
                            <p>
                                ✉️
                                ${escapeHTML(
                                    contact.email
                                )}
                            </p>
                            `
                            :
                            ""
                        }

                        ${
                            contact.relationship
                            ?
                            `
                            <p>
                                Relationship:
                                ${escapeHTML(
                                    contact.relationship
                                )}
                            </p>
                            `
                            :
                            ""
                        }

                    </div>


                    <div class="contact-actions">

                        <label>

                            <input
                                type="checkbox"
                                class="sos-checkbox"
                                data-id="${contact.id}"

                                ${
                                    Number(
                                        contact.include_in_sos
                                    ) === 1
                                        ? "checked"
                                        : ""
                                }
                            >

                            SOS

                        </label>


                        <button
                            type="button"
                            class="delete-btn"
                            data-id="${contact.id}"
                        >
                            Delete
                        </button>

                    </div>

                `;


                contactList.appendChild(card);

            }
        );


        // =========================
        // SELECTED COUNT
        // =========================

        if (selectedCount) {

            selectedCount.textContent =
                selected;

        }


        // =========================
        // SOS CHECKBOX
        // =========================

        document
            .querySelectorAll(
                ".sos-checkbox"
            )
            .forEach(
                function (checkbox) {

                    checkbox.addEventListener(
                        "change",
                        async function () {

                            await updateSOSStatus(
                                this.dataset.id,
                                this.checked
                            );

                        }
                    );

                }
            );


        // =========================
        // DELETE BUTTON
        // =========================

        document
            .querySelectorAll(
                ".delete-btn"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        async function () {

                            await deleteContact(
                                this.dataset.id
                            );

                        }
                    );

                }
            );

    }


    // =====================================================
    // SELECT ALL
    // =====================================================

    if (selectAllButton) {

        selectAllButton.addEventListener(
            "click",
            async function () {

                const checkboxes =
                    document.querySelectorAll(
                        ".sos-checkbox"
                    );


                if (!checkboxes.length) {
                    return;
                }


                let shouldSelectAll = false;


                checkboxes.forEach(
                    function (checkbox) {

                        if (!checkbox.checked) {

                            shouldSelectAll = true;

                        }

                    }
                );


                for (
                    const checkbox
                    of checkboxes
                ) {

                    if (
                        checkbox.checked !==
                        shouldSelectAll
                    ) {

                        checkbox.checked =
                            shouldSelectAll;


                        await updateSOSStatus(
                            checkbox.dataset.id,
                            shouldSelectAll
                        );

                    }

                }


                await loadContacts();


                selectAllButton.textContent =
                    shouldSelectAll
                        ? "Deselect All"
                        : "Select All";

            }
        );

    }


    // =====================================================
    // SEARCH
    // =====================================================

    if (searchContact) {

        searchContact.addEventListener(
            "input",
            function () {

                const searchText =
                    this.value
                        .toLowerCase()
                        .trim();


                document
                    .querySelectorAll(
                        ".contact-card"
                    )
                    .forEach(
                        function (card) {

                            const text =
                                card.textContent
                                    .toLowerCase();


                            card.style.display =
                                text.includes(searchText)
                                    ? ""
                                    : "none";

                        }
                    );

            }
        );

    }


    // =====================================================
    // DELETE CONTACT
    // =====================================================

    async function deleteContact(
        contactId
    ) {

        const confirmed =
            confirm(
                "Are you sure you want to delete this emergency contact?"
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await fetch(
                    `/api/contacts/${contactId}`,
                    {

                        method: "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                user_id:
                                  loggedInUserId
                            })

                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message || "Contact didn't deleted."
                );
               

                return;

            }


            alert(
                "Contact deleted successfully!"
            );


            await loadContacts();


        } catch (error) {

            console.error(
                "Delete contact error:",
                error
            );


            alert(
                "Unable to delete contact."
            );

        }

    }


    // =====================================================
    // UPDATE SOS STATUS
    // =====================================================

    async function updateSOSStatus(
        contactId,
        includeInSOS
    ) {

        try {

            const getResponse =
                await fetch(
                    `/api/contacts/${user.id}`
                );


            const getData =
                await getResponse.json();


            if (
                !getResponse.ok ||
                !getData.success
            ) {

                alert(
                    "Unable to update SOS status."
                );

                return;

            }


            const contact =
                getData.contacts.find(
                    function (item) {

                        return String(item.id) ===
                            String(contactId);

                    }
                );


            if (!contact) {

                alert(
                    "Contact not found."
                );

                return;

            }


            const response =
                await fetch(
                    `/api/contacts/${contactId}`,
                    {

                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                user_id:
                                    user.id,

                                name:
                                    contact.name,

                                mobile:
                                    contact.mobile,

                                email:
                                    contact.email || "",

                                relationship:
                                    contact.relationship || "",

                                includeInSOS:
                                    includeInSOS

                            })

                    }
                );


            const data =
                await response.json();


            console.log(
                "SOS status response:",
                data
            );


            if (
                !response.ok ||
                !data.success
            ) {

                alert(
                    data.message ||
                    "Unable to update SOS status."
                );

                return;

            }


            await loadContacts();


        } catch (error) {

            console.error(
                "SOS update error:",
                error
            );

        }

    }


    // =====================================================
    // HTML SECURITY
    // =====================================================

    function escapeHTML(value) {

        return String(value)

            .replace(/&/g, "&amp;")

            .replace(/</g, "&lt;")

            .replace(/>/g, "&gt;")

            .replace(/"/g, "&quot;")

            .replace(/'/g, "&#039;");

    }


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    loadContacts();

}