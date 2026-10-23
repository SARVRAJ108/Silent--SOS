// =========================
// REGISTER
// =========================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function(event) {

        event.preventDefault();


        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const mobile = document.getElementById("registerMobile").value.trim();
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;


        if (!name || !email || !mobile || !password || !confirmPassword) {

            alert("Please fill all fields.");

            return;
        }


        if (password !== confirmPassword) {

            alert("Passwords do not match.");

            return;
        }


        if (password.length < 6) {

            alert("Password must be at least 6 characters.");

            return;
        }


        try {

            const response = await fetch("/api/register", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    mobile: mobile,
                    password: password
                })

            });


            const data = await response.json();


            if (data.success) {

                alert("Registration successful!");

                window.location.href = "/login.html";

            } else {

                alert(data.message);

            }


        } catch (error) {

            console.error(error);

            alert("Server error. Please try again.");

        }

    });

}


// =========================
// LOGIN
// =========================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function(event) {

        event.preventDefault();


        const email = document.getElementById("loginEmail").value.trim();

        const password = document.getElementById("loginPassword").value;


        if (!email || !password) {

            alert("Please enter email and password.");

            return;
        }


        try {

            console.log("Sending login request...");


            const response = await fetch("/api/login", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    email: email,
                    password: password

                })

            });


            const data = await response.json();


            console.log("Login response:", data);


            if (data.success) {

                // Save logged-in user

                localStorage.setItem(
                    "silentSOSUser",
                    JSON.stringify(data.user)
                );


                alert("Login successful!");


                window.location.href = "/dashboard.html";


            } else {

                alert(data.message);

            }


        } catch (error) {

            console.error("Login error:", error);

            alert(
                "Server error. Please make sure the server is running."
            );

        }

    });

}