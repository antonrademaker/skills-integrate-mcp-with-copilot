document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Authentication elements
  const userIcon = document.getElementById("user-icon");
  const userDropdown = document.getElementById("user-dropdown");
  const loginBtn = document.getElementById("login-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const closeModal = document.querySelector(".close");
  const loginSection = document.getElementById("login-section");
  const userInfo = document.getElementById("user-info");
  const usernameDisplay = document.getElementById("username-display");
  const logoutBtn = document.getElementById("logout-btn");
  const authRequiredMessage = document.getElementById("auth-required-message");

  // Authentication state
  let authToken = localStorage.getItem("authToken");
  let currentUser = null;

  // Authentication functions
  async function checkAuthStatus() {
    if (!authToken) {
      updateAuthUI(false);
      return false;
    }

    try {
      const response = await fetch("/auth/verify", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const result = await response.json();
      
      if (result.authenticated) {
        currentUser = result.username;
        updateAuthUI(true);
        return true;
      } else {
        // Token is invalid
        localStorage.removeItem("authToken");
        authToken = null;
        updateAuthUI(false);
        return false;
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      updateAuthUI(false);
      return false;
    }
  }

  function updateAuthUI(isAuthenticated) {
    if (isAuthenticated) {
      loginSection.classList.add("hidden");
      userInfo.classList.remove("hidden");
      usernameDisplay.textContent = currentUser;
      authRequiredMessage.classList.add("hidden");
      signupForm.style.display = "block";
    } else {
      loginSection.classList.remove("hidden");
      userInfo.classList.add("hidden");
      authRequiredMessage.classList.remove("hidden");
      signupForm.style.display = "none";
    }
  }

  // Event listeners for authentication
  userIcon.addEventListener("click", () => {
    userDropdown.classList.toggle("hidden");
  });

  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    userDropdown.classList.add("hidden");
  });

  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    authToken = null;
    currentUser = null;
    updateAuthUI(false);
    userDropdown.classList.add("hidden");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      });

      const result = await response.json();

      if (response.ok) {
        authToken = result.access_token;
        localStorage.setItem("authToken", authToken);
        currentUser = username;
        updateAuthUI(true);
        loginModal.classList.add("hidden");
        loginForm.reset();
        loginMessage.classList.add("hidden");
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (event) => {
    if (!userIcon.contains(event.target) && !userDropdown.contains(event.target)) {
      userDropdown.classList.add("hidden");
    }
  });

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

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
                        currentUser ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ''
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
    if (!authToken) {
      messageDiv.textContent = "You must be logged in to unregister students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
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
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
      messageDiv.textContent = "You must be logged in to register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
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
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  async function initializeApp() {
    await checkAuthStatus();
    fetchActivities();
  }

  initializeApp();
});
