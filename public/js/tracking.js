// =====================================================
// LIVE LOCATION TRACKING - SILENT SOS
// PostgreSQL Connected Version
// =====================================================


// =====================================================
// LOGIN CHECK
// =====================================================

const savedUser = localStorage.getItem("silentSOSUser");

if (!savedUser) {

    window.location.href = "/login.html";

}

const user = JSON.parse(savedUser);


// =====================================================
// ELEMENTS
// =====================================================

const startTrackingButton =
    document.getElementById("startTracking");

const stopTrackingButton =
    document.getElementById("stopTracking");

const trackingStatus =
    document.getElementById("trackingStatus");

const trackingMessage =
    document.getElementById("trackingMessage");

const lastUpdate =
    document.getElementById("lastUpdate");

const latitudeElement =
    document.getElementById("latitude");

const longitudeElement =
    document.getElementById("longitude");

const accuracyElement =
    document.getElementById("accuracy");

const locationTimeElement =
    document.getElementById("locationTime");


// =====================================================
// VARIABLES
// =====================================================

let trackingInterval = null;

let trackingStarted = false;

let map = null;

let locationMarker = null;

let accuracyCircle = null;


// =====================================================
// GET TRACKING STATE
// =====================================================

function isTrackingActive() {

    return (
        localStorage.getItem("trackingActive") === "true"
    );

}


// =====================================================
// GET ACTIVE SOS
// =====================================================

function getActiveSOS() {

    return localStorage.getItem("activeSOSId");

}


// =====================================================
// INITIALIZE MAP
// =====================================================

function initializeMap() {

    const mapElement =
        document.getElementById("map");

    if (!mapElement) {

        console.error("Map element not found.");

        return;

    }

    map = L.map("map").setView(
        [26.9124, 75.7873],
        13
    );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);

}


// =====================================================
// UPDATE MAP
// =====================================================

function updateMap(
    latitude,
    longitude,
    accuracy
) {

    if (!map) {
        return;
    }


    const position = [
        latitude,
        longitude
    ];


    // Remove old marker
    if (locationMarker) {

        map.removeLayer(
            locationMarker
        );

    }


    // Remove old accuracy circle
    if (accuracyCircle) {

        map.removeLayer(
            accuracyCircle
        );

    }


    // New location marker
    locationMarker =
        L.marker(position)
            .addTo(map)
            .bindPopup(
                "📍 Your Current Location"
            )
            .openPopup();


    // Accuracy circle
    accuracyCircle =
        L.circle(
            position,
            {
                radius: accuracy || 0
            }
        ).addTo(map);


    // Center map
    map.setView(
        position,
        17
    );

}


// =====================================================
// UPDATE LOCATION UI
// =====================================================

function updateLocationUI(
    latitude,
    longitude,
    accuracy
) {

    if (latitudeElement) {

        latitudeElement.textContent =
            Number(latitude).toFixed(6);

    }


    if (longitudeElement) {

        longitudeElement.textContent =
            Number(longitude).toFixed(6);

    }


    if (accuracyElement) {

        accuracyElement.textContent =
            `${Math.round(accuracy)} meters`;

    }


    const now =
        new Date();


    if (locationTimeElement) {

        locationTimeElement.textContent =
            now.toLocaleTimeString();

    }


    if (lastUpdate) {

        lastUpdate.textContent =
            `Updated at ${now.toLocaleTimeString()}`;

    }

}


// =====================================================
// SEND CURRENT LOCATION TO SERVER
// =====================================================

async function sendCurrentLocation() {

    const alertId =
        getActiveSOS();


    // -------------------------------------------------
    // No active SOS
    // -------------------------------------------------

    if (!alertId) {

        console.log(
            "No active SOS. Stopping tracking."
        );

        stopTracking();

        return;

    }


    // -------------------------------------------------
    // Check geolocation support
    // -------------------------------------------------

    if (!navigator.geolocation) {

        if (trackingMessage) {

            trackingMessage.textContent =
                "Geolocation is not supported by this browser.";

        }

        return;

    }


    // -------------------------------------------------
    // Get GPS position
    // -------------------------------------------------

    navigator.geolocation.getCurrentPosition(

        async function(position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;

            const accuracy =
                position.coords.accuracy;


            console.log(
                "GPS Location:",
                latitude,
                longitude,
                accuracy
            );


            // -------------------------------------------------
            // Update screen
            // -------------------------------------------------

            updateLocationUI(
                latitude,
                longitude,
                accuracy
            );


            // -------------------------------------------------
            // Update map
            // -------------------------------------------------

            updateMap(
                latitude,
                longitude,
                accuracy
            );


            if (trackingMessage) {

                trackingMessage.textContent =
                    "Your location is being updated every 10 seconds.";

            }


            // -------------------------------------------------
            // Send location to PostgreSQL backend
            // -------------------------------------------------

            try {

                const userId =
                    Number(
                        user.id ||
                        user.userId
                    );


                const response =
                    await fetch(
                        "/api/tracking/location",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    userId:
                                        userId,

                                    alertId:
                                        Number(alertId),

                                    latitude:
                                        latitude,

                                    longitude:
                                        longitude,

                                    accuracy:
                                        accuracy

                                })

                        }
                    );


                const data =
                    await response.json();


                console.log(
                    "Tracking server response:",
                    data
                );


                if (
                    !response.ok ||
                    !data.success
                ) {

                    console.error(
                        data.message ||
                        "Unable to save location."
                    );

                    if (trackingMessage) {

                        trackingMessage.textContent =
                            "Location received but could not be saved.";

                    }

                    return;

                }


                console.log(
                    "✅ Location saved in PostgreSQL."
                );


            } catch (error) {

                console.error(
                    "Sending location failed:",
                    error
                );

            }

        },


        // -------------------------------------------------
        // GPS ERROR
        // -------------------------------------------------

        function(error) {

            console.error(
                "GPS error:",
                error
            );


            if (trackingMessage) {

                trackingMessage.textContent =
                    "Unable to get your location. Please allow location permission.";

            }

        },


        // -------------------------------------------------
        // GPS OPTIONS
        // -------------------------------------------------

        {

            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 5000

        }

    );

}


// =====================================================
// START TRACKING
// =====================================================

function startTracking() {

    const alertId =
        getActiveSOS();


    // -------------------------------------------------
    // SOS required
    // -------------------------------------------------

    if (!alertId) {

        alert(
            "Please activate SOS first."
        );

        return;

    }


    // Already tracking
    if (trackingStarted) {

        return;

    }


    // -------------------------------------------------
    // Save tracking state
    // -------------------------------------------------

    localStorage.setItem(
        "trackingActive",
        "true"
    );

    localStorage.removeItem(
        "trackingStopped"
    );


    trackingStarted =
        true;


    console.log(
        "🚨 Live tracking started."
    );


    // -------------------------------------------------
    // Update UI
    // -------------------------------------------------

    if (trackingStatus) {

        trackingStatus.innerHTML =
            '<span class="status-dot"></span> Tracking Active';

    }


    if (trackingMessage) {

        trackingMessage.textContent =
            "Getting your current location...";

    }


    if (startTrackingButton) {

        startTrackingButton.disabled =
            true;

    }


    if (stopTrackingButton) {

        stopTrackingButton.disabled =
            false;

    }


    // -------------------------------------------------
    // Get first location immediately
    // -------------------------------------------------

    sendCurrentLocation();


    // -------------------------------------------------
    // Get location every 10 seconds
    // -------------------------------------------------

    trackingInterval =
        setInterval(
            sendCurrentLocation,
            10000
        );

}


// =====================================================
// STOP TRACKING
// =====================================================

function stopTracking() {

    if (trackingInterval) {

        clearInterval(
            trackingInterval
        );

        trackingInterval =
            null;

    }


    trackingStarted =
        false;


    localStorage.setItem(
        "trackingActive",
        "false"
    );


    // -------------------------------------------------
    // Update UI
    // -------------------------------------------------

    if (trackingStatus) {

        trackingStatus.innerHTML =
            '<span class="status-dot"></span> Tracking Off';

    }


    if (trackingMessage) {

        trackingMessage.textContent =
            "Location tracking is currently stopped.";

    }


    if (startTrackingButton) {

        startTrackingButton.disabled =
            false;

    }


    if (stopTrackingButton) {

        stopTrackingButton.disabled =
            true;

    }


    console.log(
        "🛑 Live tracking stopped."
    );

}


// =====================================================
// RESTORE TRACKING STATE
// =====================================================

function restoreTrackingState() {

    const activeSOS =
        getActiveSOS();

    const trackingActive =
        isTrackingActive();


    console.log(
        "Tracking restore check:",
        {
            activeSOS,
            trackingActive
        }
    );


    // -------------------------------------------------
    // No active SOS
    // -------------------------------------------------

    if (!activeSOS) {

        localStorage.setItem(
            "trackingActive",
            "false"
        );


        trackingStarted =
            false;


        if (trackingStatus) {

            trackingStatus.innerHTML =
                '<span class="status-dot"></span> Tracking Off';

        }


        if (trackingMessage) {

            trackingMessage.textContent =
                "Location tracking is currently stopped.";

        }


        return;

    }


    // -------------------------------------------------
    // Active SOS + tracking enabled
    // -------------------------------------------------

    if (trackingActive) {

        console.log(
            "🚨 Active SOS found. Starting tracking automatically."
        );


        startTracking();

        return;

    }


    // -------------------------------------------------
    // Active SOS but tracking not started
    // -------------------------------------------------

    if (trackingStatus) {

        trackingStatus.innerHTML =
            '<span class="status-dot"></span> Tracking Off';

    }


    if (trackingMessage) {

        trackingMessage.textContent =
            "Press Start Tracking to share your location.";

    }

}


// =====================================================
// BUTTON EVENTS
// =====================================================

if (startTrackingButton) {

    startTrackingButton.addEventListener(
        "click",
        startTracking
    );

}


if (stopTrackingButton) {

    stopTrackingButton.addEventListener(
        "click",
        stopTracking
    );

}


// =====================================================
// SOS RESOLVED / STORAGE EVENTS
// =====================================================

window.addEventListener(
    "storage",
    function(event) {

        // -------------------------------------------------
        // Tracking stopped
        // -------------------------------------------------

        if (
            event.key === "trackingStopped" &&
            event.newValue === "true"
        ) {

            console.log(
                "SOS tracking stopped."
            );


            stopTracking();

        }


        // -------------------------------------------------
        // Active SOS removed
        // -------------------------------------------------

        if (
            event.key === "activeSOSId" &&
            event.newValue === null
        ) {

            console.log(
                "Active SOS removed."
            );


            stopTracking();

        }

    }
);


// =====================================================
// INITIALIZE
// =====================================================

initializeMap();


setTimeout(
    restoreTrackingState,
    300
);