// =========================
// AUDIO EVIDENCE
// =========================

const startRecordingButton =
    document.getElementById("startRecording");

const stopRecordingButton =
    document.getElementById("stopRecording");

const recordingStatus =
    document.getElementById("recordingStatus");

const audioPreview =
    document.getElementById("audioPreview");

const saveEvidenceButton =
    document.getElementById("saveEvidence");


// =========================
// VARIABLES
// =========================

let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;


// =========================
// START RECORDING
// =========================

if (startRecordingButton) {

    startRecordingButton.addEventListener(
        "click",
        async function () {

            try {

                const stream =
                    await navigator.mediaDevices.getUserMedia({
                        audio: true
                    });


                audioChunks = [];


                mediaRecorder =
                    new MediaRecorder(stream);


                mediaRecorder.addEventListener(
                    "dataavailable",
                    function (event) {

                        if (event.data.size > 0) {

                            audioChunks.push(event.data);

                        }

                    }
                );


                mediaRecorder.addEventListener(
                    "stop",
                    function () {

                        audioBlob =
                            new Blob(
                                audioChunks,
                                {
                                    type: "audio/webm"
                                }
                            );


                        const audioURL =
                            URL.createObjectURL(
                                audioBlob
                            );


                        if (audioPreview) {

                            audioPreview.src =
                                audioURL;

                            audioPreview.style.display =
                                "block";

                        }


                        if (saveEvidenceButton) {

                            saveEvidenceButton.disabled =
                                false;

                        }


                        if (recordingStatus) {

                            recordingStatus.textContent =
                                "Recording completed. You can preview the audio.";

                        }

                    }
                );


                mediaRecorder.start();


                if (recordingStatus) {

                    recordingStatus.textContent =
                        "🔴 Recording in progress...";

                }


                startRecordingButton.disabled =
                    true;


                stopRecordingButton.disabled =
                    false;


                console.log(
                    "Audio recording started."
                );

            } catch (error) {

                console.error(
                    "Microphone error:",
                    error
                );


                alert(
                    "Microphone permission is required to record audio."
                );

            }

        }
    );

}


// =========================
// STOP RECORDING
// =========================

if (stopRecordingButton) {

    stopRecordingButton.addEventListener(
        "click",
        function () {

            if (
                mediaRecorder &&
                mediaRecorder.state !== "inactive"
            ) {

                mediaRecorder.stop();


                if (mediaRecorder.stream) {

                    mediaRecorder.stream
                        .getTracks()
                        .forEach(
                            function (track) {
                                track.stop();
                            }
                        );

                }

            }


            startRecordingButton.disabled =
                false;

            stopRecordingButton.disabled =
                true;


            console.log(
                "Audio recording stopped."
            );

        }
    );

}


// =========================
// SAVE EVIDENCE
// =========================

// =========================
// SAVE AUDIO EVIDENCE
// =========================

if (saveEvidenceButton) {

    saveEvidenceButton.addEventListener(
        "click",
        async function () {

            if (!audioBlob) {

                alert(
                    "Please record audio first."
                );

                return;

            }


            const savedUser =
                localStorage.getItem(
                    "silentSOSUser"
                );


            if (!savedUser) {

                alert(
                    "Please login first."
                );

                window.location.href =
                    "/login.html";

                return;

            }


            const user =
                JSON.parse(savedUser);


            const activeSOSId =
                localStorage.getItem(
                    "activeSOSId"
                );


            const formData =
                new FormData();


            formData.append(
                "audio",
                audioBlob,
                "audio-evidence.webm"
            );


            formData.append(
                "userId",
                user.id
            );


            if (activeSOSId) {

                formData.append(
                    "alertId",
                    activeSOSId
                );

            }


            try {

                saveEvidenceButton.disabled =
                    true;


                saveEvidenceButton.textContent =
                    "Saving...";


                const response =
                    await fetch(
                        "/api/evidence/audio",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                const data =
                    await response.json();


                console.log(
                    "Evidence server response:",
                    data
                );


                if (data.success) {

                    alert(
                        "Audio evidence saved successfully!"
                    );


                    if (recordingStatus) {

                        recordingStatus.textContent =
                            "Audio evidence saved to Silent SOS.";

                    }


                    console.log(
                        "Evidence ID:",
                        data.evidenceId
                    );

                } else {

                    alert(
                        data.message ||
                        "Unable to save evidence."
                    );

                }


            } catch (error) {

                console.error(
                    "Saving evidence failed:",
                    error
                );


                alert(
                    "Unable to connect to the server."
                );


            } finally {

                saveEvidenceButton.disabled =
                    false;


                saveEvidenceButton.textContent =
                    "💾 Save Evidence";

            }

        }
    );

}