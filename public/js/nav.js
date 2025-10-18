document.addEventListener("DOMContentLoaded", () => {
  const navbarPlaceholder = document.getElementById("navbar-placeholder");
  if (navbarPlaceholder) {
    navbarPlaceholder.innerHTML = `
            <nav class="bg-white border-gray-200 dark:bg-gray-900 sticky top-0 z-50 shadow-sm">
                <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                    <a href="/" class="flex items-center space-x-3 rtl:space-x-reverse">
                        <img src="/assets/icon.png" class="h-8" alt="9to5-Scout Logo" />
                        <span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">9to5-Scout</span>
                    </a>
                    <button data-collapse-toggle="navbar-default" type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600" aria-controls="navbar-default" aria-expanded="false">
                        <span class="sr-only">Open main menu</span>
                        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
                        </svg>
                    </button>
                    <div class="hidden w-full md:block md:w-auto" id="navbar-default">
                        <ul class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
                            <li>
                                <a href="/" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Home</a>
                            </li>
                            <li>
                                <button type="button" id="dropdownNavbarLink" data-dropdown-toggle="dropdownNavbar" class="flex items-center justify-between w-full py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 md:w-auto dark:text-white md:dark:hover:text-blue-500 dark:focus:text-white dark:hover:bg-gray-700 md:dark:hover:bg-transparent">
                                    Documentation 
                                    <svg class="w-2.5 h-2.5 ms-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
                                    </svg>
                                </button>
                                <div id="dropdownNavbar" class="z-10 hidden font-normal bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700 dark:divide-gray-600">
                                    <ul class="py-2 text-sm text-gray-700 dark:text-gray-400" aria-labelledby="dropdownLargeButton">
                                        <li>
                                            <a href="/getting-started.html" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Getting Started</a>
                                        </li>
                                        <li>
                                            <a href="/api-reference.html" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">API Reference</a>
                                        </li>
                                        <li>
                                            <a href="/openapi.json" target="_blank" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">OpenAPI Spec</a>
                                        </li>
                                        <li>
                                            <a href="/frontend-mocks.html" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Frontend Vision</a>
                                        </li>
                                        <li>
                                            <a href="/user-manual.html" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">User Manual</a>
                                        </li>                                        
                                    </ul>
                                </div>
                            </li>
                            <li>
                                <button type="button" id="dropdownFeaturesLink" data-dropdown-toggle="dropdownFeatures" class="flex items-center justify-between w-full py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 md:w-auto dark:text-white md:dark:hover:text-blue-500 dark:focus:text-white dark:hover:bg-gray-700 md:dark:hover:bg-transparent">
                                    Features
                                    <svg class="w-2.5 h-2.5 ms-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
                                    </svg>
                                </button>
                                <div id="dropdownFeatures" class="z-10 hidden font-normal bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700 dark:divide-gray-600">
                                    <ul class="py-2 text-sm text-gray-700 dark:text-gray-400" aria-labelledby="dropdownLargeButton">
                                        <li>
                                            <a href="/email-integration.html" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Email Integration</a>
                                        </li>
                                        <li>
                                            <a href="/job-history-management.html" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Job History</a>
                                        </li>
                                        <li>
                                            <a href="/agent-workflow-config.html" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">AI Agents</a>
                                        </li>
                                        <li>
                                            <a href="/browser-testing.html" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Browser Testing</a>
                                        </li>
                                        <li>
                                            <a href="/full-transparency.html" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">End-to-End Transparency</a>
                                        </li>
                                        <li>
                                            <a href="/inbox.html" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Inbox</a>
                                        </li>
                                    </ul>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        `;

    // Initialize custom dropdown functionality
    initializeDropdowns();
  }
});

// Custom dropdown functionality
function initializeDropdowns() {
  // Handle mobile menu toggle
  const mobileMenuButton = document.querySelector(
    '[data-collapse-toggle="navbar-default"]'
  );
  const mobileMenu = document.getElementById("navbar-default");

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener("click", () => {
      const isExpanded =
        mobileMenuButton.getAttribute("aria-expanded") === "true";
      mobileMenuButton.setAttribute("aria-expanded", !isExpanded);
      mobileMenu.classList.toggle("hidden");
    });
  }

  // Handle dropdown toggles
  const dropdownButtons = document.querySelectorAll("[data-dropdown-toggle]");
  dropdownButtons.forEach((button) => {
    const dropdownId = button.getAttribute("data-dropdown-toggle");
    const dropdown = document.getElementById(dropdownId);

    if (dropdown) {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Close other dropdowns
        dropdownButtons.forEach((otherButton) => {
          if (otherButton !== button) {
            const otherDropdownId = otherButton.getAttribute(
              "data-dropdown-toggle"
            );
            const otherDropdown = document.getElementById(otherDropdownId);
            if (otherDropdown) {
              otherDropdown.classList.add("hidden");
            }
          }
        });

        // Toggle current dropdown
        dropdown.classList.toggle("hidden");
      });
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("[data-dropdown-toggle]") &&
      !e.target.closest('[id^="dropdown"]')
    ) {
      dropdownButtons.forEach((button) => {
        const dropdownId = button.getAttribute("data-dropdown-toggle");
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
          dropdown.classList.add("hidden");
        }
      });
    }
  });

  // Close dropdowns on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dropdownButtons.forEach((button) => {
        const dropdownId = button.getAttribute("data-dropdown-toggle");
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
          dropdown.classList.add("hidden");
        }
      });
    }
  });
}

(function () {
  const groups = document.querySelectorAll(".nav-group");
  groups.forEach((g) => {
    const btn = g.querySelector(".nav-group__label");
    const sub = g.querySelector(".nav-sub");
    if (!btn || !sub) return;
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") btn.setAttribute("aria-expanded", "false");
    });
  });
})();
