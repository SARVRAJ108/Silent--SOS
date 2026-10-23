let mediaRecorder = null;
let recordedChunks = [];
let currentStream = null;
let currentEvidence = null;


/* =========================
   ELEMENTS
========================= */

const audioButton = document.getElementById("audioButton");
const videoButton = document.getElementById("videoButton");
const photoButton = document.getElementById("photoButton");

const audioUploadButton =
    document.getElementById("audioUploadButton");

const videoUploadButton =
    document.getElementById("videoUploadButton");

const photoUploadButton =
    document.getElementById("photoUploadButton");

const audioUpload =
    document.getElementById("audioUpload");

const videoUpload =
    document.getElementById("videoUpload");

const photoUpload =
    document.getElementById("photoUpload");


const audioStatus =
    document.getElementById("audioStatus");

const videoStatus =
    document.getElementById("videoStatus");

const photoStatus =
    document.getElementById("photoStatus");


const cameraPreview =
    document.getElementById("cameraPreview");

const photoPreview =
    document.getElementById("photoPreview");

const audioPreview =
    document.getElementById("audioPreview");

const emptyPreview =
    document.getElementById("emptyPreview");

const previewStatus =
    document.getElementById("previewStatus");


const contactList =
    document.getElementById("contactList");

const selectedCount =
    document.getElementById("selectedCount");


const sendEvidenceButton =
    document.getElementById("sendEvidenceButton");

const sendStatus =
    document.getElementById("sendStatus");


const savedEvidenceList =
    document.getElementById("savedEvidenceList");

const evidenceCount =
    document.getElementById("evidenceCount");


/* =========================
   LOAD CONTACTS FROM MYSQL
========================= */

async function loadContacts() {

    const savedUser =
        localStorage.getItem("silentSOSUser");

    if (!savedUser) {

        window.location.href = "/login.html";

        return;
    }

    const user =
        JSON.parse(savedUser);

    try {

        console.log(
            "Loading contacts for evidence page:",
            user.id
        );

        const response =
            await fetch(
                `/api/contacts/${user.id}`
            );

        const data =
            await response.json();

        console.log(
            "Evidence contacts response:",
            data
        );

        if (!response.ok || !data.success) {

            console.error(
                data.message ||
                "Unable to load contacts."
            );

            contactList.innerHTML = `
                <div class="contact-empty">

                    <span>⚠️</span>

                    <p>
                        Unable to load emergency contacts.
                    </p>

                    <a href="contacts.html">
                        Manage Contacts
                    </a>

                </div>
            `;

            return;
        }


        const contacts =
            data.contacts || [];



        /* =========================
   HTML SECURITY
========================= */

function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


        /* =========================
           NO CONTACTS
        ========================= */

        if (contacts.length === 0) {

            contactList.innerHTML = `

                <div class="contact-empty">

                    <span>👥</span>

                    <p>
                        No emergency contacts available.
                    </p>

                    <a href="contacts.html">
                        Add Emergency Contacts
                    </a>

                </div>

            `;

            updateSelectedCount();

            return;
        }


        /* =========================
           DISPLAY CONTACTS
        ========================= */

        contactList.innerHTML = "";


        contacts.forEach(function(contact) {

            const item =
                document.createElement("div");

            item.className =
                "contact-item";


            item.innerHTML = `

                <input
                    type="checkbox"
                    class="contact-checkbox"
                    value="${contact.id}"
                >

                <div class="contact-info">

                    <div class="contact-name">
                        ${escapeHTML(contact.name)}
                    </div>

                    <div class="contact-number">
                        ${escapeHTML(contact.mobile)}
                    </div>

                </div>

            `;


            contactList.appendChild(item);

        });


        updateSelectedCount();


    } catch (error) {

        console.error(
            "Loading evidence contacts failed:",
            error
        );

        contactList.innerHTML = `

            <div class="contact-empty">

                <span>⚠️</span>

                <p>
                    Unable to connect to server.
                </p>

            </div>

        `;

    }

}



/* =========================
   SELECTED CONTACT COUNT
========================= */

function updateSelectedCount() {

    const checkboxes =
        document.querySelectorAll(
            ".contact-checkbox:checked"
        );


    selectedCount.textContent =
        `${checkboxes.length} Selected`;

}



/* =========================
   CONTACT SELECTION
========================= */

contactList.addEventListener(
    "change",
    function() {

        updateSelectedCount();

    }
);



/* =========================
   START AUDIO
========================= */

audioButton.addEventListener(
    "click",
    async function() {

        if (
            mediaRecorder &&
            mediaRecorder.state === "recording"
        ) {

            stopRecording();

            return;

        }


        try {

            stopCurrentStream();


            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true
                });


            currentStream =
                stream;


            recordedChunks = [];


            mediaRecorder =
                new MediaRecorder(stream);


            mediaRecorder.ondataavailable =
                function(event) {

                    if (event.data.size > 0) {

                        recordedChunks.push(
                            event.data
                        );

                    }

                };


            mediaRecorder.onstop =
                function() {

                    const blob =
                        new Blob(
                            recordedChunks,
                            {
                                type: "audio/webm"
                            }
                        );


                    const audioURL =
                        URL.createObjectURL(blob);


                    audioPreview.src =
                        audioURL;


                    showPreview("audio");


                    currentEvidence = {

                        type: "audio",

                        blob: blob

                    };

                };


            mediaRecorder.start();


            audioButton.textContent =
                "Stop Audio";


            audioStatus.textContent =
                "Recording audio...";


        } catch (error) {

            audioStatus.textContent =
                "Microphone permission denied.";

            console.error(error);

        }

    }
);



/* =========================
   START VIDEO
========================= */

videoButton.addEventListener(
    "click",
    async function() {

        if (
            mediaRecorder &&
            mediaRecorder.state === "recording"
        ) {

            stopRecording();

            return;

        }


        try {

            stopCurrentStream();


            const stream =
                await navigator.mediaDevices.getUserMedia({

                    video: true,

                    audio: true

                });


            currentStream =
                stream;


            cameraPreview.srcObject =
                stream;


            showPreview("camera");


            recordedChunks = [];


            mediaRecorder =
                new MediaRecorder(stream);


            mediaRecorder.ondataavailable =
                function(event) {

                    if (event.data.size > 0) {

                        recordedChunks.push(
                            event.data
                        );

                    }

                };


            mediaRecorder.onstop =
                function() {

                    const blob =
                        new Blob(
                            recordedChunks,
                            {
                                type: "video/webm"
                            }
                        );


                    const videoURL =
                        URL.createObjectURL(blob);


                    cameraPreview.srcObject =
                        null;


                    cameraPreview.src =
                        videoURL;


                    cameraPreview.controls =
                        true;


                    currentEvidence = {

                        type: "video",

                        blob: blob

                    };


                    showPreview("video");

                };


            mediaRecorder.start();


            videoButton.textContent =
                "Stop Video";


            videoStatus.textContent =
                "Recording video...";


        } catch (error) {

            videoStatus.textContent =
                "Camera or microphone permission denied.";

            console.error(error);

        }

    }
);



/* =========================
   STOP RECORDING
========================= */

function stopRecording() {

    if (
        mediaRecorder &&
        mediaRecorder.state === "recording"
    ) {

        mediaRecorder.stop();

    }


    stopCurrentStream();


    audioButton.textContent =
        "Start Audio";


    videoButton.textContent =
        "Start Video";


    audioStatus.textContent =
        "Recording stopped";


    videoStatus.textContent =
        "Recording stopped";

}



/* =========================
   STOP CAMERA / MICROPHONE
========================= */

function stopCurrentStream() {

    if (currentStream) {

        currentStream
            .getTracks()
            .forEach(function(track) {

                track.stop();

            });


        currentStream =
            null;

    }

}



/* =========================
   PHOTO CAMERA
========================= */

photoButton.addEventListener(
    "click",
    openPhotoCamera
);



/* =========================
   OPEN PHOTO CAMERA
========================= */

async function openPhotoCamera() {

    try {

        stopCurrentStream();


        const stream =
            await navigator.mediaDevices.getUserMedia({

                video: true

            });


        currentStream =
            stream;


        cameraPreview.srcObject =
            stream;


        showPreview("camera");


        photoButton.textContent =
            "Capture Photo";


        photoStatus.textContent =
            "Camera is ready.";


        photoButton.onclick =
            function() {

                capturePhoto(stream);

            };


    } catch (error) {

        photoStatus.textContent =
            "Camera permission denied.";

        console.error(error);

    }

}



/* =========================
   CAPTURE PHOTO
========================= */

function capturePhoto(stream) {

    const canvas =
        document.createElement("canvas");


    canvas.width =
        cameraPreview.videoWidth;


    canvas.height =
        cameraPreview.videoHeight;


    const context =
        canvas.getContext("2d");


    context.drawImage(

        cameraPreview,

        0,

        0,

        canvas.width,

        canvas.height

    );


    canvas.toBlob(
        function(blob) {

            const photoURL =
                URL.createObjectURL(blob);


            photoPreview.src =
                photoURL;


            currentEvidence = {

                type: "photo",

                blob: blob

            };


            showPreview("photo");


            photoStatus.textContent =
                "Photo captured successfully.";


            photoButton.textContent =
                "Open Camera";


            stopCurrentStream();


            photoButton.onclick =
                openPhotoCamera;

        },
        "image/jpeg"
    );

}



/* =========================
   PREVIEW CONTROLLER
========================= */

function showPreview(type) {

    cameraPreview.style.display =
        "none";

    photoPreview.style.display =
        "none";

    audioPreview.style.display =
        "none";

    emptyPreview.style.display =
        "none";


    /* Camera */

    if (type === "camera") {

        cameraPreview.style.display =
            "block";

        previewStatus.textContent =
            "Camera active";

    }


    /* Photo */

    if (type === "photo") {

        photoPreview.style.display =
            "block";

        previewStatus.textContent =
            "Photo captured";

    }


    /* Audio */

    if (type === "audio") {

        audioPreview.style.display =
            "block";

        previewStatus.textContent =
            "Audio recorded";

    }


    /* Video */

    if (type === "video") {

        cameraPreview.style.display =
            "block";

        previewStatus.textContent =
            "Video ready";

    }

}



/* =========================
   SEND EVIDENCE
========================= */

sendEvidenceButton.addEventListener(
    "click",
    async function() {


        const selected =
            document.querySelectorAll(
                ".contact-checkbox:checked"
            );


        /* Check Evidence */

        if (!currentEvidence) {

            sendStatus.textContent =
                "Please capture audio, video or photo first.";

            return;

        }


        /* Check Contacts */

        if (selected.length === 0) {

            sendStatus.textContent =
                "Please select at least one contact.";

            return;

        }


        /* Get Logged-in User */

        const savedUser =
            localStorage.getItem(
                "silentSOSUser"
            );


        if (!savedUser) {

            sendStatus.textContent =
                "Please login first.";

            return;

        }


        const user =
            JSON.parse(savedUser);


        /* Get Active SOS */

        const alertId =
            localStorage.getItem(
                "activeSOSId"
            );


        try {

            sendEvidenceButton.disabled =
                true;


            sendStatus.textContent =
                "Uploading evidence...";


            /* =========================
               FORM DATA
            ========================= */

            const formData =
                new FormData();


            formData.append(

                "evidence",

                currentEvidence.blob,

                getEvidenceFileName(
                    currentEvidence.type
                )

            );


            formData.append(

                "userId",

                user.id

            );


            formData.append(

                "evidenceType",

                currentEvidence.type

            );


            /* =========================
               SELECTED CONTACT IDs
            ========================= */

            const selectedContactIds =
                Array.from(selected)
                    .map(
                        checkbox =>
                            Number(
                                checkbox.value
                            )
                    );


            formData.append(

                "contactIds",

                JSON.stringify(
                    selectedContactIds
                )

            );


            /* =========================
               ALERT ID
            ========================= */

            if (alertId) {

                formData.append(

                    "alertId",

                    alertId

                );

            }


            /* =========================
               SEND TO SERVER
            ========================= */

            const response =
                await fetch(

                    "/api/evidence/upload",

                    {

                        method: "POST",

                        body: formData

                    }

                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(

                    data.message ||
                    "Evidence upload failed."

                );

            }


            console.log(
                "Evidence upload response:",
                data
            );


            sendStatus.textContent =

                `Evidence saved successfully. Evidence ID: ${data.evidenceId}`;


            console.log(

                "Selected contacts:",

                selectedContactIds

            );


            /* Refresh Saved Evidence */

            loadSavedEvidence();


        } catch (error) {

            console.error(

                "Evidence upload failed:",

                error

            );


            sendStatus.textContent =
                "Unable to upload evidence.";


        } finally {

            sendEvidenceButton.disabled =
                false;

        }

    }
);



/* =========================
   EVIDENCE FILE NAME
========================= */

function getEvidenceFileName(type) {

    const time =
        Date.now();


    if (type === "audio") {

        return `audio-${time}.webm`;

    }


    if (type === "video") {

        return `video-${time}.webm`;

    }


    if (type === "photo") {

        return `photo-${time}.jpg`;

    }


    return `evidence-${time}.webm`;

}




/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


/* =========================
   LOAD SAVED EVIDENCE
========================= */

async function loadSavedEvidence() {

    const savedUser =
        localStorage.getItem(
            "silentSOSUser"
        );


    if (!savedUser) {

        window.location.href =
            "/login.html";

        return;

    }


    const user =
        JSON.parse(savedUser);


    try {

        const response =
            await fetch(
                `/api/evidence/${user.id}`
            );


        const data =
            await response.json();


        console.log(
            "Saved evidence response:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            console.error(

                data.message ||
                "Unable to load evidence."

            );

            return;

        }


        const evidenceList =
            data.evidence || [];


        /* Evidence Count */

        if (evidenceCount) {

            evidenceCount.textContent =
                `${evidenceList.length} Evidence`;

        }


        /* Check List */

        if (!savedEvidenceList) {

            console.error(
                "savedEvidenceList element not found."
            );

            return;

        }


        savedEvidenceList.innerHTML =
            "";


        /* No Evidence */

        if (evidenceList.length === 0) {

            savedEvidenceList.innerHTML = `

                <div class="evidence-empty">

                    <div class="preview-icon">
                        📁
                    </div>

                    <p>
                        No saved evidence yet.
                    </p>

                </div>

            `;

            return;

        }


        /* Display Evidence */

        evidenceList.forEach(
            function(item) {

                const card =
                    document.createElement("div");


                card.className =
                    "saved-evidence-card";


                /* Date */

                const date =
                    item.created_at

                        ? new Date(
                            item.created_at
                        ).toLocaleString()

                        : "Date unavailable";


                /* Icon */

                let icon =
                    "📁";


                if (
                    item.evidence_type ===
                    "audio"
                ) {

                    icon =
                        "🎙️";

                }


                if (
                    item.evidence_type ===
                    "video"
                ) {

                    icon =
                        "🎥";

                }


                if (
                    item.evidence_type ===
                    "photo"
                ) {

                    icon =
                        "📷";

                }


                /* Title */

                let title =
                    "Evidence";


                if (
                    item.evidence_type ===
                    "audio"
                ) {

                    title =
                        "Audio Evidence";

                }


                if (
                    item.evidence_type ===
                    "video"
                ) {

                    title =
                        "Video Evidence";

                }


                if (
                    item.evidence_type ===
                    "photo"
                ) {

                    title =
                        "Photo Evidence";

                }


                /* Card */

                card.innerHTML = `

                    <div class="saved-evidence-info">

                        <div class="saved-evidence-icon">

                            ${icon}

                        </div>


                        <div>

                            <h3>
                                ${title}
                            </h3>


                            <p>
                                Evidence ID:
                                ${item.id}
                            </p>


                            <p>
                                SOS Alert:
                                ${item.alert_id || "Not linked"}
                            </p>


                            <p>
                                ${date}
                            </p>

                        </div>

                    </div>


                    <div
                        class="saved-evidence-player">
                    </div>

                `;


                const player =
                    card.querySelector(
                        ".saved-evidence-player"
                    );


                /* Audio */

                if (
                    item.evidence_type ===
                    "audio"
                ) {

                    const audio =
                        document.createElement(
                            "audio"
                        );


                    audio.controls =
                        true;


                    audio.src =
                        item.file_path;


                    audio.style.width =
                        "100%";


                    player.appendChild(
                        audio
                    );

                }


                /* Video */

                if (
                    item.evidence_type ===
                    "video"
                ) {

                    const video =
                        document.createElement(
                            "video"
                        );


                    video.controls =
                        true;


                    video.src =
                        item.file_path;


                    video.style.width =
                        "100%";


                    video.style.maxHeight =
                        "350px";


                    player.appendChild(
                        video
                    );

                }


                /* Photo */

                if (
                    item.evidence_type ===
                    "photo"
                ) {

                    const image =
                        document.createElement(
                            "img"
                        );


                    image.src =
                        item.file_path;


                    image.alt =
                        "Saved Evidence Photo";


                    image.style.width =
                        "100%";


                    image.style.maxWidth =
                        "500px";


                    image.style.borderRadius =
                        "12px";


                    player.appendChild(
                        image
                    );

                }


                savedEvidenceList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(

            "Loading saved evidence failed:",

            error

        );

    }

}



/* =====================================================
   FILE UPLOAD BUTTONS - FIXED
===================================================== */

function openFilePicker(input) {

    if (!input) {
        console.error("File input not found.");
        return;
    }

    input.value = "";

    input.click();
}


/* =========================
   AUDIO UPLOAD BUTTON
========================= */

if (audioUploadButton && audioUpload) {

    audioUploadButton.addEventListener("click", function (event) {

        event.preventDefault();

        event.stopPropagation();

        console.log("Audio upload button clicked.");

        openFilePicker(audioUpload);

    });

}


/* =========================
   VIDEO UPLOAD BUTTON
========================= */

if (videoUploadButton && videoUpload) {

    videoUploadButton.addEventListener("click", function (event) {

        event.preventDefault();

        event.stopPropagation();

        console.log("Video upload button clicked.");

        openFilePicker(videoUpload);

    });

}


/* =========================
   PHOTO UPLOAD BUTTON
========================= */

if (photoUploadButton && photoUpload) {

    photoUploadButton.addEventListener("click", function (event) {

        event.preventDefault();

        event.stopPropagation();

        console.log("Photo upload button clicked.");

        openFilePicker(photoUpload);

    });

}


/* =====================================================
   AUDIO FILE SELECTED
===================================================== */

if (audioUpload) {

    audioUpload.addEventListener("change", function () {

        const file = this.files && this.files[0];

        if (!file) {
            return;
        }

        console.log("Audio file selected:", file.name);

        const audioURL =
            URL.createObjectURL(file);

        audioPreview.src = audioURL;

        audioPreview.load();

        currentEvidence = {

            type: "audio",

            blob: file

        };

        showPreview("audio");

        if (audioStatus) {

            audioStatus.textContent =
                `Audio selected: ${file.name}`;

        }

        if (previewStatus) {

            previewStatus.textContent =
                "Audio file ready";

        }

    });

}


/* =====================================================
   VIDEO FILE SELECTED
===================================================== */

if (videoUpload) {

    videoUpload.addEventListener("change", function () {

        const file = this.files && this.files[0];

        if (!file) {
            return;
        }

        console.log("Video file selected:", file.name);

        const videoURL =
            URL.createObjectURL(file);

        cameraPreview.srcObject = null;

        cameraPreview.src = videoURL;

        cameraPreview.controls = true;

        cameraPreview.muted = false;

        cameraPreview.load();

        currentEvidence = {

            type: "video",

            blob: file

        };

        showPreview("video");

        if (videoStatus) {

            videoStatus.textContent =
                `Video selected: ${file.name}`;

        }

        if (previewStatus) {

            previewStatus.textContent =
                "Video file ready";

        }

    });

}


/* =====================================================
   PHOTO FILE SELECTED
===================================================== */

if (photoUpload) {

    photoUpload.addEventListener("change", function () {

        const file = this.files && this.files[0];

        if (!file) {
            return;
        }

        console.log("Photo file selected:", file.name);

        const photoURL =
            URL.createObjectURL(file);

        photoPreview.src = photoURL;

        photoPreview.onload = function () {

            console.log(
                "Photo preview loaded successfully."
            );

        };

        currentEvidence = {

            type: "photo",

            blob: file

        };

        showPreview("photo");

        if (photoStatus) {

            photoStatus.textContent =
                `Photo selected: ${file.name}`;

        }

        if (previewStatus) {

            previewStatus.textContent =
                "Photo file ready";

        }

    });

}

// INITIAL LOAD
loadContacts();
loadSavedEvidence();