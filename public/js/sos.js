// =====================================================
// SILENT SOS - SOS.JS
// 3 SECOND HOLD + LOCATION + LIVE TRACKING
// =====================================================

const safeButton = document.getElementById("safeButton");

let holdTimer = null;
let countdownTimer = null;

let sosActive = false;
let currentAlertId = null;
let watchId = null;


// =====================================================
// GET LOGGED-IN USER
// =====================================================

function getLoggedInUser() {

    const savedUser =
        localStorage.getItem("silentSOSUser");

    if (!savedUser) {

        alert("Please login first.");

        window.location.href = "/login.html";

        return null;
    }

    try {

        return JSON.parse(savedUser);

    } catch (error) {

        console.error("Invalid user data:", error);

        localStorage.removeItem("silentSOSUser");

        window.location.href = "/login.html";

        return null;
    }
}


// =====================================================
// GET CURRENT LOCATION
// =====================================================

function getCurrentLocation() {

    return new Promise(function(resolve, reject) {

        if (!navigator.geolocation) {

            reject(
                new Error("Geolocation is not supported.")
            );

            return;
        }

        navigator.geolocation.getCurrentPosition(

            function(position) {

                resolve({

                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude,

                    accuracy:
                        position.coords.accuracy

                });

            },

            function(error) {

                reject(error);

            },

            {

                enableHighAccuracy: true,

                timeout: 10000,

                maximumAge: 0

            }

        );

    });
}


// =====================================================
// ACTIVATE SOS
// =====================================================

async function activateSOS() {

    if (sosActive) {
        return;
    }

    const user = getLoggedInUser();

    if (!user) {
        return;
    }


    console.log("Getting current location...");


    let location = {

        latitude: null,
        longitude: null,
        accuracy: null

    };


    try {

        location = await getCurrentLocation();

        console.log(
            "Location received:",
            location
        );

    } catch (error) {

        console.warn(
            "Location unavailable:",
            error.message
        );


        const continueWithoutLocation =
            confirm(
                "Location permission was not available.\n\nDo you still want to activate SOS?"
            );


        if (!continueWithoutLocation) {

            return;
        }
    }


    // =================================================
    // SEND SOS TO SERVER
    // =================================================

    try {

        const response = await fetch(
            "/api/sos/activate",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    user_Id:
                        user.id,

                    
                    latitude:
                        location.latitude,

                    longitude:
                        location.longitude,

                    accuracy:
                        location.accuracy

                })

            }
        );


        const data = await response.json();


        console.log(
            "SOS server response:",
            data
        );


        if (!data.success) {

            alert(
                data.message ||
                "Unable to activate SOS."
            );

            return;
        }


        // =================================================
        // SAVE ACTIVE SOS
        // =================================================

        sosActive = true;

        currentAlertId =
            data.alertId;


        localStorage.setItem(
            "activeSOSAlertId",
            String(currentAlertId)
        );


        // =================================================
        // START LIVE LOCATION
        // =================================================

        startLiveLocation();


        // =================================================
        // UI
        // =================================================

        document.body.classList.add(
            "sos-active"
        );


        alert(
            "🚨 SOS ACTIVATED!\n\n" +
            "Emergency contacts have been notified."
        );


        console.log(
            "SOS ACTIVE. Alert ID:",
            currentAlertId
        );


    } catch (error) {

        console.error(
            "SOS activation error:",
            error
        );


        alert(
            "Unable to activate SOS. Please try again."
        );
    }
}


// =====================================================
// START LIVE LOCATION
// =====================================================

function startLiveLocation() {

    if (!navigator.geolocation) {

        console.warn(
            "Geolocation is unavailable."
        );

        return;
    }


    if (watchId !== null) {

        navigator.geolocation.clearWatch(
            watchId
        );
    }


    watchId =
        navigator.geolocation.watchPosition(

            async function(position) {

                if (
                    !sosActive ||
                    !currentAlertId
                ) {

                    return;
                }


                const location = {

                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude,

                    accuracy:
                        position.coords.accuracy

                };


                console.log(
                    "Live location:",
                    location
                );


                const user =
                    getLoggedInUser();


                if (!user) {
                    return;
                }


                try {

                    const response =
                        await fetch(

                            `/api/sos/${currentAlertId}/location`,

                            {

                                method: "PUT",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({

                                        userId:
                                            user.id,

                                        latitude:
                                            location.latitude,

                                        longitude:
                                            location.longitude,

                                        accuracy:
                                            location.accuracy

                                    })

                            }

                        );


                    const data =
                        await response.json();


                    console.log(
                        "Location update response:",
                        data
                    );


                } catch (error) {

                    console.error(
                        "Live location update failed:",
                        error
                    );
                }

            },

            function(error) {

                console.error(
                    "Live location error:",
                    error
                );

            },

            {

                enableHighAccuracy: true,

                maximumAge: 5000,

                timeout: 10000

            }

        );
}


// =====================================================
// RESOLVE / I'M SAFE
// =====================================================

async function resolveSOS() {

    if (!currentAlertId) {

        currentAlertId =
            Number(
                localStorage.getItem(
                    "activeSOSAlertId"
                )
            );
    }


    if (!currentAlertId) {

        alert(
            "No active SOS found."
        );

        return;
    }


    const user =
        getLoggedInUser();


    if (!user) {
        return;
    }


    const confirmed =
        confirm(
            "Are you safe now?\n\nThis will close the active SOS."
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(

                `/api/sos/${currentAlertId}/resolve`,

                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            userId:
                                user.id

                        })

                }

            );


        const data =
            await response.json();


        console.log(
            "Resolve response:",
            data
        );


        if (!data.success) {

            alert(
                data.message ||
                "Unable to resolve SOS."
            );

            return;
        }


        // =================================================
        // STOP LIVE LOCATION
        // =================================================

        if (watchId !== null) {

            navigator.geolocation.clearWatch(
                watchId
            );

            watchId = null;
        }


        sosActive = false;

        currentAlertId = null;


        localStorage.removeItem(
            "activeSOSAlertId"
        );


        document.body.classList.remove(
            "sos-active"
        );


        alert(
            "✅ SOS resolved successfully."
        );


    } catch (error) {

        console.error(
            "Resolve SOS error:",
            error
        );


        alert(
            "Unable to resolve SOS."
        );
    }
}


// =====================================================
// START 3 SECOND SOS HOLD
// =====================================================

function startSOSHold() {

    if (sosActive) {
        return;
    }


    console.log(
        "SOS hold started."
    );


    let seconds = 0;


    countdownTimer =
        setInterval(function() {

            seconds++;


            console.log(
                "SOS hold:",
                seconds,
                "seconds"
            );


            if (seconds >= 3) {

                clearInterval(
                    countdownTimer
                );

                countdownTimer = null;
            }

        }, 1000);


    holdTimer =
        setTimeout(function() {

            clearInterval(
                countdownTimer
            );

            countdownTimer = null;


            activateSOS();

        }, 3000);
}


// =====================================================
// CANCEL SOS HOLD
// =====================================================

function cancelSOSHold() {

    if (holdTimer) {

        clearTimeout(
            holdTimer
        );

        holdTimer = null;
    }


    if (countdownTimer) {

        clearInterval(
            countdownTimer
        );

        countdownTimer = null;
    }


    console.log(
        "SOS hold cancelled."
    );
}


// =====================================================
// SOS BUTTON EVENTS
// =====================================================

if (safeButton) {

    safeButton.addEventListener(
        "mousedown",
        startSOSHold
    );


    safeButton.addEventListener(
        "touchstart",
        startSOSHold,
        {
            passive: true
        }
    );


    safeButton.addEventListener(
        "mouseup",
        cancelSOSHold
    );


    safeButton.addEventListener(
        "mouseleave",
        cancelSOSHold
    );


    safeButton.addEventListener(
        "touchend",
        cancelSOSHold
    );


    safeButton.addEventListener(
        "touchcancel",
        cancelSOSHold
    );

}


// =====================================================
// I'M SAFE BUTTON
// =====================================================

const resolveSOSButton =
    document.getElementById(
        "resolveSOSButton"
    );


if (resolveSOSButton) {

    resolveSOSButton.addEventListener(
        "click",
        resolveSOS
    );

}