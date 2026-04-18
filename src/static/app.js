document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userMenuBtn = document.getElementById("user-menu-btn");
  const authStatus = document.getElementById("auth-status");
  const authModal = document.getElementById("auth-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const teacherGateMsg = document.getElementById("teacher-gate-msg");

  let isTeacher = false;
  let teacherName = "";

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function syncAuthUI() {
    if (isTeacher) {
      authStatus.textContent = `Teacher: ${teacherName}`;
      teacherGateMsg.classList.add("hidden");
      signupForm.classList.remove("hidden");
      logoutBtn.classList.remove("hidden");
    } else {
      authStatus.textContent = "Student view";
      teacherGateMsg.classList.remove("hidden");
      signupForm.classList.add("hidden");
      logoutBtn.classList.add("hidden");
    }
  }

  async function fetchAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const result = await response.json();
      isTeacher = result.authenticated;
      teacherName = result.username || "";
      syncAuthUI();
    } catch (error) {
      isTeacher = false;
      teacherName = "";
      syncAuthUI();
    }
  }

  function openAuthModal() {
    authModal.classList.remove("hidden");
  }

  function closeAuthModal() {
    authModal.classList.add("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isTeacher
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!isTeacher) {
      showMessage("Teacher login required", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isTeacher) {
      showMessage("Teacher login required", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userMenuBtn.addEventListener("click", openAuthModal);
  closeModalBtn.addEventListener("click", closeAuthModal);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      isTeacher = true;
      teacherName = result.username;
      syncAuthUI();
      closeAuthModal();
      showMessage("Logged in successfully", "success");
      fetchActivities();
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        showMessage(result.detail || "Logout failed", "error");
        return;
      }

      isTeacher = false;
      teacherName = "";
      syncAuthUI();
      closeAuthModal();
      showMessage("Logged out successfully", "success");
      fetchActivities();
    } catch (error) {
      showMessage("Logout failed. Please try again.", "error");
      console.error("Error logging out:", error);
    }
  });

  // Initialize app
  fetchAuthStatus().then(fetchActivities);
});
