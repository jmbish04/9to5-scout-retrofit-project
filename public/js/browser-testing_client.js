let ws = null;
let currentTest = null;
let testSteps = [];

// Initialize test steps
const stepDefinitions = [
  { step: 1, name: "Initialize Test" },
  { step: 2, name: "Validate Configuration" },
  { step: 3, name: "Test Browser Rendering API Connection" },
  { step: 4, name: "Execute Screenshot Capture" },
  { step: 5, name: "Execute Content Extraction" },
  { step: 6, name: "Execute Markdown Extraction" },
  { step: 7, name: "Execute JSON Extraction" },
  { step: 8, name: "Execute Link Extraction" },
  { step: 9, name: "Execute Element Scraping" },
  { step: 10, name: "Execute PDF Generation" },
  { step: 11, name: "Upload Assets to R2" },
  { step: 12, name: "Update D1 Database" },
  { step: 13, name: "Generate Test Report" },
];

// Initialize UI
document.addEventListener("DOMContentLoaded", function () {
  initializeSteps();
  setupEventListeners();
});

function initializeSteps() {
  const stepsList = document.getElementById("stepsList");
  stepsList.innerHTML = "";

  stepDefinitions.forEach((step) => {
    const stepElement = document.createElement("div");
    stepElement.className = "step pending";
    stepElement.id = `step-${step.step}`;
    stepElement.innerHTML = `
              <div class="step-number">${step.step}</div>
              <div class="step-content">
                  <div class="step-name">${step.name}</div>
                  <div class="step-details">Waiting...</div>
              </div>
              <div class="step-duration"></div>
          `;
    stepsList.appendChild(stepElement);
  });
}

function setupEventListeners() {
  document
    .getElementById("testType")
    .addEventListener("change", function () {
      const authFields = document.getElementById("authFields");
      if (this.value === "auth" || this.value === "linkedin") {
        authFields.classList.remove("hidden");
      } else {
        authFields.classList.add("hidden");
      }
    });

  document
    .getElementById("testMode")
    .addEventListener("change", function () {
      if (this.value === "websocket") {
        connectWebSocket();
      } else {
        disconnectWebSocket();
      }
    });
}

function connectWebSocket() {
  if (ws) {
    ws.close();
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/api/browser-test/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = function () {
    updateWebSocketStatus(true);
    console.log("WebSocket connected");
  };

  ws.onmessage = function (event) {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(message);
  };

  ws.onclose = function () {
    updateWebSocketStatus(false);
    console.log("WebSocket disconnected");
  };

  ws.onerror = function (error) {
    console.error("WebSocket error:", error);
    updateWebSocketStatus(false);
  };
}

function disconnectWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
    updateWebSocketStatus(false);
  }
}

function updateWebSocketStatus(connected) {
  const status = document.getElementById("wsStatus");
  if (connected) {
    status.textContent = "WebSocket: Connected";
    status.className = "websocket-status connected";
  } else {
    status.textContent = "WebSocket: Disconnected";
    status.className = "websocket-status disconnected";
  }
}

function handleWebSocketMessage(message) {
  console.log("WebSocket message:", message);

  switch (message.type) {
    case "test_update":
      updateTestStep(message.data);
      break;
    case "test_complete":
      completeTest(message.data.result);
      break;
    case "test_error":
      showError(message.data.message, message.data.error);
      break;
  }
}

async function startTest() {
  const testMode = document.getElementById("testMode").value;
  const config = getTestConfig();

  if (!config.url) {
    alert("Please enter a URL to test");
    return;
  }

  // Reset UI
  document.getElementById("testResults").style.display = "block";
  document.getElementById("startTest").disabled = true;
  document.getElementById("stopTest").disabled = false;
  document.getElementById("viewResults").disabled = true;

  initializeSteps();
  updateTestStatus("running", "Test is running...");
  updateProgress(0);

  if (
    testMode === "websocket" &&
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {
    // Send test via WebSocket
    ws.send(
      JSON.stringify({
        type: "start_test",
        data: config,
      })
    );
  } else {
    // Send test via REST API
    try {
      const response = await fetch("/api/browser-test/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        currentTest = result.result;
        simulateTestProgress(result.result);
      } else {
        showError("Test failed", result.error);
      }
    } catch (error) {
      showError("Test request failed", error.message);
    }
  }
}

function getTestConfig() {
  const testType = document.getElementById("testType").value;
  const config = {
    url: document.getElementById("testUrl").value,
    testName: document.getElementById("testName").value,
    withAuth: false,
    customHeaders: {},
  };

  // Parse custom headers
  const customHeadersText =
    document.getElementById("customHeaders").value;
  if (customHeadersText) {
    try {
      config.customHeaders = JSON.parse(customHeadersText);
    } catch (e) {
      console.warn("Invalid custom headers JSON");
    }
  }

  // Set up authentication based on test type
  if (testType === "auth" || testType === "linkedin") {
    config.withAuth = true;
    config.username = document.getElementById("username").value;
    config.password = document.getElementById("password").value;
  }

  // Set up LinkedIn-specific configuration
  if (testType === "linkedin") {
    config.customHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    };
  }

  return config;
}

function simulateTestProgress(testResult) {
  // Simulate step-by-step progress for REST API results
  let currentStep = 0;
  const totalSteps = stepDefinitions.length;

  const interval = setInterval(() => {
    if (currentStep < totalSteps) {
      updateTestStep({
        step: currentStep + 1,
        stepName: stepDefinitions[currentStep].name,
        status: "running",
        progress: `${currentStep + 1}/${totalSteps}`,
      });

      setTimeout(() => {
        updateTestStep({
          step: currentStep + 1,
          stepName: stepDefinitions[currentStep].name,
          status: "success",
          progress: `${currentStep + 1}/${totalSteps}`,
        });
        currentStep++;
      }, 1000);
    } else {
      clearInterval(interval);
      completeTest(testResult);
    }
  }, 1500);
}

function updateTestStep(data) {
  const stepElement = document.getElementById(`step-${data.step}`);
  if (stepElement) {
    stepElement.className = `step ${data.status}`;

    const stepDetails = stepElement.querySelector(".step-details");
    stepDetails.textContent = data.message || `${data.status}...`;

    if (data.duration) {
      const durationElement = stepElement.querySelector(".step-duration");
      durationElement.textContent = `${data.duration}ms`;
    }
  }

  // Update progress
  if (data.progress) {
    const [current, total] = data.progress.split("/");
    const progress = (parseInt(current) / parseInt(total)) * 100;
    updateProgress(progress);
  }
}

function completeTest(result) {
  currentTest = result;

  updateTestStatus("success", "Test completed successfully!");
  updateProgress(100);

  document.getElementById("startTest").disabled = false;
  document.getElementById("stopTest").disabled = true;
  document.getElementById("viewResults").disabled = false;

  // Show assets if any were generated
  if (result.assets && Object.keys(result.assets).length > 0) {
    showAssets(result.assets);
  }

  // Show any errors
  if (result.errors && result.errors.length > 0) {
    showError("Test completed with errors", result.errors.join(", "));
  }
}

function updateTestStatus(status, message) {
  const statusElement = document.getElementById("testStatus");
  statusElement.className = `test-status ${status}`;
  statusElement.textContent = `Test Status: ${message}`;
}

function updateProgress(percentage) {
  const progressFill = document.getElementById("progressFill");
  progressFill.style.width = `${percentage}%`;
}

function showAssets(assets) {
  const assetsContainer = document.getElementById("assetsContainer");
  const assetGrid = document.getElementById("assetGrid");

  assetGrid.innerHTML = "";

  Object.entries(assets).forEach(([type, url]) => {
    if (url) {
      const assetCard = document.createElement("div");
      assetCard.className = "asset-card";
      assetCard.innerHTML = `
                  <div class="asset-icon">${getAssetIcon(type)}</div>
                  <div class="asset-name">${
                    type.charAt(0).toUpperCase() + type.slice(1)
                  }</div>
                  <div class="asset-status success">Generated</div>
                  <a href="${url}" target="_blank" style="display: block; margin-top: 10px; color: #4f46e5; text-decoration: none;">View →</a>
              `;
      assetGrid.appendChild(assetCard);
    }
  });

  assetsContainer.style.display = "block";
}

function getAssetIcon(type) {
  const icons = {
    screenshot: "📸",
    content: "📄",
    markdown: "📝",
    json: "📋",
    links: "🔗",
    scraped: "🔍",
    pdf: "📑",
  };
  return icons[type] || "📄";
}

function showError(message, details) {
  const errorDetails = document.getElementById("errorDetails");
  errorDetails.innerHTML = `
            <strong>Error:</strong> ${message}<br>
            <strong>Details:</strong> ${details}
        `;
  errorDetails.classList.remove("hidden");

  updateTestStatus("failed", message);
}

function stopTest() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }

  document.getElementById("startTest").disabled = false;
  document.getElementById("stopTest").disabled = true;

  updateTestStatus("failed", "Test stopped by user");
}

function viewResults() {
  if (currentTest) {
    console.log("Test Results:", currentTest);
    alert(
      "Test results logged to console. Check the browser developer tools."
    );
  }
}

// Auto-connect WebSocket if that mode is selected
document
  .getElementById("testMode")
  .addEventListener("change", function () {
    if (this.value === "websocket") {
      connectWebSocket();
    }
  });
