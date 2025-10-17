document.addEventListener('DOMContentLoaded', async () => {
    const conveyorBelt = document.getElementById('conveyor-belt');

    const stages = [
        { id: 'job-discovery', name: 'Job Discovery', description: 'Initiates scraping runs and identifies new jobs.', status: 'pending', icon: '🔍' },
        { id: 'browser-rendering', name: 'Browser Rendering', description: 'Fetches and renders job page content (HTML, PDF, Screenshot).', status: 'pending', icon: '🌐' },
        { id: 'ai-analysis', name: 'AI Analysis', description: 'Extracts structured data and performs job fit analysis.', status: 'pending', icon: '🧠' },
        { id: 'd1-storage', name: 'D1 Database Storage', description: 'Stores structured job data and metadata.', status: 'pending', icon: '🗄️' },
        { id: 'r2-storage', name: 'R2 Asset Storage', description: 'Stores raw HTML, PDFs, and screenshots.', status: 'pending', icon: '💾' },
        { id: 'email-integration', name: 'Email Integration', description: 'Processes incoming job alerts and sends insights.', status: 'pending', icon: '📧' },
        { id: 'python-fallback', name: 'Python Scraper Fallback', description: 'Local Python script for complex or failed scraping tasks.', status: 'pending', icon: '🐍' },
    ];

    function renderStages() {
        conveyorBelt.innerHTML = stages.map(stage => `
            <div id="${stage.id}" class="stage p-6 rounded-lg shadow-md w-72 text-center transition-all duration-300
                ${stage.status === 'success' ? 'bg-green-100 border-green-500' : ''}
                ${stage.status === 'failed' ? 'bg-red-100 border-red-500' : ''}
                ${stage.status === 'running' ? 'bg-blue-100 border-blue-500' : ''}
                ${stage.status === 'pending' ? 'bg-gray-100 border-gray-300' : ''}
                border-l-4">
                <div class="text-4xl mb-2">${stage.icon}</div>
                <h3 class="text-xl font-semibold mb-2">${stage.name}</h3>
                <p class="text-gray-600 text-sm mb-4">${stage.description}</p>
                <div class="status-indicator text-sm font-medium
                    ${stage.status === 'success' ? 'text-green-700' : ''}
                    ${stage.status === 'failed' ? 'text-red-700' : ''}
                    ${stage.status === 'running' ? 'text-blue-700' : ''}
                    ${stage.status === 'pending' ? 'text-gray-700' : ''}">
                    Status: <span class="capitalize">${stage.status}</span>
                </div>
                <div class="test-results-summary text-xs text-gray-500 mt-2">
                    <!-- Summary of test results will go here -->
                </div>
            </div>
        `).join('');
    }

    async function fetchStageStatus() {
        // Placeholder for API calls to get actual status and test results
        // For now, simulate some statuses
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call delay

        // Example of updating a stage status
        const jobDiscoveryStage = stages.find(s => s.id === 'job-discovery');
        if (jobDiscoveryStage) {
            jobDiscoveryStage.status = 'success';
            // jobDiscoveryStage.testResults = 'Last run: 10 new jobs found.';
        }

        const browserRenderingStage = stages.find(s => s.id === 'browser-rendering');
        if (browserRenderingStage) {
            browserRenderingStage.status = 'running';
            // browserRenderingStage.testResults = 'Running browser test...';
        }

        const aiAnalysisStage = stages.find(s => s.id === 'ai-analysis');
        if (aiAnalysisStage) {
            aiAnalysisStage.status = 'pending';
        }

        const pythonFallbackStage = stages.find(s => s.id === 'python-fallback');
        if (pythonFallbackStage) {
            pythonFallbackStage.status = 'failed';
            // pythonFallbackStage.testResults = 'Last fallback failed: Connection refused.';
        }

        renderStages();
    }

    renderStages(); // Initial render
    fetchStageStatus(); // Fetch and update statuses
    // setInterval(fetchStageStatus, 30000); // Poll every 30 seconds
});