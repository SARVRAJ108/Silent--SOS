// =====================================================
// SILENT SOS - DASHBOARD.JS
// PERSISTENT SOS STATE + 3 SECOND HOLD
// SERVER-VERIFIED SOS RESTORATION
// =====================================================


// =====================================================
// LOGIN CHECK
// =====================================================

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


// =====================================================
// ELEMENTS
// =====================================================

const sosButton = document.getElementById("sosButton");
const sosMessage = document.getElementById("sosMessage");
const emergencyStatus = document.getElementById("emergencyStatus");
const statusDescription = document.getElementById("statusDescription");
const locationStatus = document.getElementById("locationStatus");
const welcomeUser = document.getElementById("welcomeUser");
const logoutBtn = document.getElementById("logoutBtn");
const safeButton = document.getElementById("safeButton");
const sosCountdown = document.getElementById("sosCountdown");


// =====================================================
// SOS STORAGE KEYS
// =====================================================

const ACTIVE_SOS_KEY = "activeSOSId";
const OLD_ACTIVE_SOS_KEY = "activeSOSAlertId";


// =====================================================
// SOS VARIABLES
// =====================================================

let sosTimer = null;
let sosCountdownTimer = null;
let sosActivated = false;
let currentAlertId = null;
let restoringSOS = false;
let resolvingSOS = false;



// =====================================================
// GET STORED ACTIVE SOS ID
// =====================================================

function getStoredActiveSOSId() {
    let alertId = localStorage.getItem(ACTIVE_SOS_KEY);

    if (!alertId) {
        alertId = localStorage.getItem(OLD_ACTIVE_SOS_KEY);
    }

    if (
        !alertId ||
        alertId === "null" ||
        alertId === "undefined" ||
        alertId === "0"
    ) {
        return null;
    }

    const id = Number(alertId);

    return Number.isInteger(id) && id > 0 ? id : null;
}


// =====================================================
// SAVE ACTIVE SOS ID
// =====================================================

function saveActiveSOSId(alertId) {
    const id = Number(alertId);

    if (!Number.isInteger(id) || id <= 0) {
        console.error("Invalid SOS alert ID:", alertId);
        return;
    }

    localStorage.setItem(ACTIVE_SOS_KEY, String(id));
    localStorage.setItem(OLD_ACTIVE_SOS_KEY, String(id));

    currentAlertId = id;

    console.log("Active SOS ID saved:", currentAlertId);
}


// =====================================================
// REMOVE ACTIVE SOS ID
// =====================================================

function removeActiveSOSId() {
    localStorage.removeItem(ACTIVE_SOS_KEY);
    localStorage.removeItem(OLD_ACTIVE_SOS_KEY);

    currentAlertId = null;

    console.log("Active SOS ID removed.");
}


// =====================================================
// WELCOME USER
// =====================================================

if (welcomeUser) {
    welcomeUser.textContent = `Stay Safe, ${user.name}`;
}


// =====================================================
// LOGOUT
// =====================================================

if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        // Logout se active SOS resolve nahi hoga.
        // SOS ID localStorage mein rahegi.

        localStorage.removeItem("silentSOSUser");

        window.location.href = "/login.html";
    });
}


// =====================================================
// SHOW ACTIVE SOS STATE
// =====================================================

function showActiveSOSState() {
    sosActivated = true;

    if (sosMessage) {
        sosMessage.textContent = "SOS is currently active.";
    }

    if (emergencyStatus) {
        emergencyStatus.textContent = "Active Emergency";
    }

    if (statusDescription) {
        statusDescription.textContent =
            "Emergency alert is currently active.";
    }

    if (locationStatus) {
        locationStatus.textContent = "Location Sharing Active";
    }

    if (sosButton) {
        sosButton.disabled = true;

        sosButton.classList.add("sos-active");
        sosButton.classList.remove("sos-holding");
    }

    if (sosCountdown) {
        sosCountdown.textContent = "✓";
    }

    document.body.classList.add("sos-active");

    localStorage.setItem("trackingActive", "true");
    localStorage.removeItem("trackingStopped");

    console.log("Dashboard showing ACTIVE SOS state.");
}

// =====================================================
// SHOW INACTIVE SOS STATE
// =====================================================

function showInactiveSOSState() {
    sosActivated = false;
    currentAlertId = null;

    // Cancel any pending SOS hold/countdown
    if (sosTimer) {
        clearTimeout(sosTimer);
        sosTimer = null;
    }

    if (sosCountdownTimer) {
        clearInterval(sosCountdownTimer);
        sosCountdownTimer = null;
    }

    if (sosButton) {
        sosButton.disabled = false;
        sosButton.classList.remove("sos-active", "sos-holding");
    }

    if (sosCountdown) {
        sosCountdown.textContent = "3";
    }

    if (emergencyStatus) {
        emergencyStatus.textContent = "No Active Emergency";
    }

    if (statusDescription) {
        statusDescription.textContent =
            "You are currently safe. SOS alerts are inactive.";
    }

    if (locationStatus) {
        locationStatus.textContent = "Location Not Shared";
    }

    if (sosMessage) {
        sosMessage.textContent =
            "Emergency alert is currently inactive.";
    }

    document.body.classList.remove("sos-active");

    // Clear saved active SOS state
    localStorage.removeItem(ACTIVE_SOS_KEY);
    localStorage.removeItem(OLD_ACTIVE_SOS_KEY);

    localStorage.setItem("trackingActive", "false");
    localStorage.setItem("trackingStopped", "true");

    console.log("Dashboard showing INACTIVE SOS state.");
}


// =====================================================
// RESTORE SOS STATE FROM SERVER
// =====================================================

async function restoreSOSState() {
    if (restoringSOS || resolvingSOS) {
        return;
    }

    restoringSOS = true;

    const activeSOSId = getStoredActiveSOSId();
    const userId = Number(user.id || user.userId);

    console.log("Checking stored SOS:", activeSOSId);

    try {
        if (!Number.isInteger(userId) || userId <= 0) {
            console.error("Invalid user ID:", userId);
            return;
        }

        const response = await fetch(
            `/api/sos/user/${userId}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json"
                },
                cache: "no-store"
            }
        );

        const data = await response.json();

        console.log("SOS status from server:", data);

        if (
            !response.ok ||
            !data.success ||
            !Array.isArray(data.alerts)
        ) {
            console.error("Unable to verify SOS status.");
            return;
        }

        // Sirf server ke active alerts ko consider karo.
        const activeAlerts = data.alerts.filter(
            alert =>
                String(alert.status).trim().toLowerCase() === "active"
        );

        let activeAlert = null;

        // Stored ID tabhi restore hogi jab server par active ho.
        if (activeSOSId) {
            activeAlert = activeAlerts.find(
                alert => Number(alert.id) === activeSOSId
            );
        }

        // Stored alert active nahi hai, toh doosra active alert check karo.
        if (!activeAlert && activeAlerts.length > 0) {
            activeAlert = activeAlerts[0];
        }

        if (activeAlert) {
            saveActiveSOSId(activeAlert.id);
            showActiveSOSState();

            console.log(
                "Active SOS restored. Alert ID:",
                activeAlert.id
            );
        } else {
            removeActiveSOSId();

            localStorage.setItem("trackingActive", "false");
            localStorage.setItem("trackingStopped", "true");

            showInactiveSOSState();

            console.log("Server confirms no active SOS.");
        }
    } catch (error) {
        console.error("Unable to restore SOS state:", error);
    } finally {
        restoringSOS = false;
    }
}

// =====================================================
// INITIAL SOS RESTORE
// =====================================================

restoreSOSState();


// =====================================================
// START 3 SECOND SOS HOLD
// =====================================================

function startSOSHold(event) {
    if (event) {
        event.preventDefault();
    }

    if (sosActivated) {
        console.log("SOS is already active.");
        return;
    }

    if (sosTimer) {
        return;
    }

    console.log("SOS button pressed.");

    if (sosButton) {
        sosButton.classList.add("sos-holding");
    }

    let countdown = 3;

    if (sosCountdown) {
        sosCountdown.textContent = countdown;
    }

    sosCountdownTimer = setInterval(function () {
        countdown--;

        if (countdown > 0) {
            if (sosCountdown) {
                sosCountdown.textContent = countdown;
            }
        }
    }, 1000);

    // Actual 3-second hold.
    sosTimer = setTimeout(async function () {
        sosTimer = null;

        if (sosCountdownTimer) {
            clearInterval(sosCountdownTimer);
            sosCountdownTimer = null;
        }

        if (sosCountdown) {
            sosCountdown.textContent = "✓";
        }

        if (sosButton) {
            sosButton.classList.remove("sos-holding");
        }

        await activateSOS();
    }, 3000);
}


// =====================================================
// CANCEL SOS HOLD
// =====================================================

function cancelSOSHold(event) {
    if (event) {
        event.preventDefault();
    }

    if (sosActivated) {
        return;
    }

    if (sosTimer) {
        clearTimeout(sosTimer);
        sosTimer = null;
    }

    if (sosCountdownTimer) {
        clearInterval(sosCountdownTimer);
        sosCountdownTimer = null;
    }

    if (sosButton) {
        sosButton.classList.remove("sos-holding");
    }

    if (sosCountdown) {
        sosCountdown.textContent = "3";
    }

    console.log("SOS hold cancelled.");
}


// =====================================================
// ACTIVATE SOS
// =====================================================

async function activateSOS() {
    if (sosActivated) {
        return;
    }

    console.log("3 seconds completed. Activating SOS...");

    if (sosMessage) {
        sosMessage.textContent =
            "SOS activating! Getting your location...";
    }

    if (emergencyStatus) {
        emergencyStatus.textContent = "Activating Emergency";
    }

    if (statusDescription) {
        statusDescription.textContent =
            "Emergency alert is being created.";
    }

    if (locationStatus) {
        locationStatus.textContent = "Getting Location...";
    }

    if (!navigator.geolocation) {
        await sendSOS(null, null, null);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            console.log("Location received:", {
                latitude,
                longitude,
                accuracy
            });

            if (locationStatus) {
                locationStatus.textContent =
                    "Location Sharing Started";
            }

            await sendSOS(latitude, longitude, accuracy);
        },

        async function (error) {
            console.warn(
                "Location unavailable:",
                error.message
            );

            if (locationStatus) {
                locationStatus.textContent =
                    "Location Unavailable";
            }

            // Backend latitude/longitude required karta hai,
            // isliye location unavailable hone par activation fail ho sakta hai.
            await sendSOS(null, null, null);
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        }
    );
}


// =====================================================
// SEND SOS TO SERVER
// =====================================================

async function sendSOS(latitude, longitude, accuracy) {
    try {
        const response = await fetch("/api/sos/activate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId: user.id || user.userId,
                user_id: user.id || user.userId,
                latitude,
                longitude,
                accuracy
            })
        });

        const data = await response.json();

        console.log("FULL SOS RESPONSE:", data);

        const alertId = data.alertId || data.alert?.id;

        console.log("EXTRACTED ALERT ID:", alertId);

        if (response.ok && data.success && alertId) {
            // Save ID and state before showing success popup.
            saveActiveSOSId(alertId);

            sosActivated = true;

            localStorage.removeItem("trackingStopped");
            localStorage.setItem("trackingActive", "true");

            showActiveSOSState();

            // Same page ke listeners ke liye.
            window.dispatchEvent(new Event("sosActivated"));

            // Other tabs/pages ko localStorage update se pata chalega.
            console.log("SOS ACTIVE. Alert ID:", alertId);

            alert(
                "🚨 SOS ACTIVATED!\n\n");
        } else {
            console.error(
                "SOS activation failed or Alert ID is missing:",
                data
            );

            sosActivated = false;

            if (sosMessage) {
                sosMessage.textContent =
                    "SOS activation failed. Please try again.";
            }

            showInactiveSOSState();

            alert(
                data.message ||
                "SOS activate nahi hua. Please try again."
            );
        }
    } catch (error) {
        console.error("SOS activation error:", error);

        sosActivated = false;

        if (sosMessage) {
            sosMessage.textContent =
                "Unable to connect to the SOS server.";
        }

        showInactiveSOSState();

        alert("Unable to connect to the SOS server.");
    }
}


// =====================================================
// SOS BUTTON EVENTS
// =====================================================

if (sosButton) {
    // Desktop
    sosButton.addEventListener("mousedown", startSOSHold);
    sosButton.addEventListener("mouseup", cancelSOSHold);
    sosButton.addEventListener("mouseleave", cancelSOSHold);

    // Mobile
    sosButton.addEventListener(
        "touchstart",
        startSOSHold,
        { passive: false }
    );

    sosButton.addEventListener(
        "touchend",
        cancelSOSHold,
        { passive: false }
    );

    sosButton.addEventListener(
        "touchcancel",
        cancelSOSHold,
        { passive: false }
    );
}

// =====================================================
// I'M SAFE / RESOLVE SOS
// =====================================================

if (safeButton) {
    safeButton.addEventListener("click", async function () {
        if (resolvingSOS) {
            return;
        }

        const alertId = currentAlertId || getStoredActiveSOSId();
        const userId = Number(user.id || user.userId);

        console.log("I'm Safe clicked.");
        console.log("Resolving Alert ID:", alertId);
        console.log("User ID:", userId);

        if (!alertId) {
            alert("No active SOS alert found.");
            return;
        }

        const confirmSafe = confirm(
            "Are you safe now?\n\n" +
            "This will resolve the active SOS alert."
        );

        if (!confirmSafe) {
            return;
        }

        resolvingSOS = true;
        safeButton.disabled = true;

        try {
            const response = await fetch(
                `/api/sos/${alertId}/resolve`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        user_id: userId
                    })
                }
            );

            const data = await response.json();

            console.log("Resolve HTTP status:", response.status);
            console.log("Resolve response:", data);

            if (!response.ok || !data.success) {
                alert(
                    data.message ||
                    "SOS resolve nahi hua. Console aur server terminal check karo."
                );
                return;
            }

            // Resolve successful: clear local state immediately.
            removeActiveSOSId();

            localStorage.setItem("trackingActive", "false");
            localStorage.setItem("trackingStopped", "true");

            showInactiveSOSState();

            console.log("SOS successfully resolved.");

            alert("SOS resolved successfully. You are marked as safe.");

        } catch (error) {
            console.error("Resolve SOS error:", error);

            alert("Server se connect nahi ho paya. Please try again.");

        } finally {
            resolvingSOS = false;
            safeButton.disabled = false;
        }
    });
}

// =====================================================
// SOS RESOLVED EVENT
// =====================================================

window.addEventListener("sosResolved", function () {
    console.log("SOS resolved event received.");

    removeActiveSOSId();

    localStorage.setItem("trackingStopped", "true");
    localStorage.setItem("trackingActive", "false");

    showInactiveSOSState();
});


// =====================================================
// SOS ACTIVATED EVENT
// =====================================================

window.addEventListener("sosActivated", function () {
    console.log("SOS activated event received.");

    const activeId = getStoredActiveSOSId();

    if (activeId) {
        currentAlertId = activeId;
    }

    showActiveSOSState();
});


// =====================================================
// CROSS-TAB STORAGE CHANGE
// =====================================================

window.addEventListener("storage", function (event) {
    if (
        event.key === ACTIVE_SOS_KEY ||
        event.key === OLD_ACTIVE_SOS_KEY
    ) {
        console.log("SOS storage changed. Restoring state...");

        restoreSOSState();
    }
});


// =====================================================
// PAGE VISIBILITY RESTORE
// =====================================================

document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
        restoreSOSState();
    }
});


// =====================================================
// PAGE FOCUS RESTORE
// =====================================================

window.addEventListener("focus", function () {
    restoreSOSState();
});