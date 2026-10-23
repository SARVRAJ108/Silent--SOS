/* Settings Page */


/* Profile */

const saveProfileButton =
    document.getElementById("saveProfileButton");

const profileStatus =
    document.getElementById("profileStatus");


saveProfileButton.addEventListener(
    "click",
    function() {

        const name =
            document.getElementById("userName").value.trim();

        const email =
            document.getElementById("userEmail").value.trim();

        const mobile =
            document.getElementById("userMobile").value.trim();


        if (!name || !email || !mobile) {

            profileStatus.textContent =
                "Please fill all profile fields.";

            return;
        }


        profileStatus.textContent =
            "Profile changes are ready to be saved. Backend connection will be added next.";

    }
);


/* SOS Settings */

const sosHoldSetting =
    document.getElementById("sosHoldSetting");

const autoEvidenceSetting =
    document.getElementById("autoEvidenceSetting");

const locationSetting =
    document.getElementById("locationSetting");

const notificationSetting =
    document.getElementById("notificationSetting");

const checkInSetting =
    document.getElementById("checkInSetting");


sosHoldSetting.addEventListener(
    "change",
    function() {

        console.log(
            "3-second SOS hold:",
            this.checked
        );

    }
);


autoEvidenceSetting.addEventListener(
    "change",
    function() {

        console.log(
            "Automatic evidence sharing:",
            this.checked
        );

    }
);


locationSetting.addEventListener(
    "change",
    function() {

        console.log(
            "Location sharing:",
            this.checked
        );

    }
);


notificationSetting.addEventListener(
    "change",
    function() {

        console.log(
            "Emergency notifications:",
            this.checked
        );

    }
);


checkInSetting.addEventListener(
    "change",
    function() {

        console.log(
            "Safety check-in:",
            this.checked
        );

    }
);


/* Browser Notifications */

const notificationButton =
    document.getElementById("notificationButton");

const notificationStatus =
    document.getElementById("notificationStatus");


notificationButton.addEventListener(
    "click",
    async function() {

        if (!("Notification" in window)) {

            notificationStatus.textContent =
                "This browser does not support notifications.";

            return;

        }


        const permission =
            await Notification.requestPermission();


        if (permission === "granted") {

            notificationStatus.textContent =
                "Browser notifications enabled.";

            new Notification("Silent SOS", {
                body: "Emergency notifications are enabled."
            });

        } else {

            notificationStatus.textContent =
                "Notification permission was not granted.";

        }

    }
);


/* Logout */

const logoutButton =
    document.getElementById("logoutButton");


logoutButton.addEventListener(
    "click",
    function() {

        const confirmLogout =
            confirm("Are you sure you want to logout?");


        if (confirmLogout) {

            window.location.href =
                "index.html";

        }

    }
);


console.log("Settings page loaded successfully.");