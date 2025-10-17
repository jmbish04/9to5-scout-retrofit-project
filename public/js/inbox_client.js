document.addEventListener('DOMContentLoaded', async () => {
    const emailList = document.getElementById('email-list');
    const emailCount = document.getElementById('email-count');
    const previewSubject = document.getElementById('preview-subject');
    const previewFrom = document.getElementById('preview-from');
    const previewDate = document.getElementById('preview-date');
    const previewStatus = document.getElementById('preview-status');
    const emailContentPreview = document.getElementById('email-content-preview');

    let emails = []; // This will store the fetched emails

    // Function to fetch emails from the backend
    async function fetchEmails() {
        try {
            // TODO: Replace with actual API call to your Cloudflare Worker backend
            const response = await fetch('/api/emails'); // Example API endpoint
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            emails = await response.json();
            renderEmailList();
        } catch (error) {
            console.error('Error fetching emails:', error);
            emailList.innerHTML = '<p class="p-4 text-red-600">Failed to load emails.</p>';
        }
    }

    // Function to render the list of emails
    function renderEmailList() {
        emailList.innerHTML = '';
        emailCount.textContent = emails.length;

        if (emails.length === 0) {
            emailList.innerHTML = '<p class="p-4 text-gray-500">No emails received yet.</p>';
            return;
        }

        emails.forEach(email => {
            const emailItem = document.createElement('div');
            emailItem.className = 'p-4 hover:bg-gray-100 cursor-pointer';
            emailItem.dataset.emailId = email.id;
            emailItem.innerHTML = `
                <p class="text-sm font-semibold text-gray-800">${email.subject}</p>
                <p class="text-xs text-gray-600">From: ${email.from}</p>
                <p class="text-xs text-gray-500">${new Date(email.date).toLocaleString()}</p>
                <div class="mt-1 text-xs font-medium ${email.jobExtracted ? 'text-green-600' : 'text-red-600'}">
                    Status: ${email.jobExtracted ? 'Jobs Extracted' : 'No Jobs Found'}
                </div>
            `;
            emailItem.addEventListener('click', () => displayEmailPreview(email.id));
            emailList.appendChild(emailItem);
        });
    }

    // Function to display email content in the preview pane
    function displayEmailPreview(emailId) {
        const selectedEmail = emails.find(email => email.id === emailId);

        if (selectedEmail) {
            previewSubject.textContent = selectedEmail.subject;
            previewFrom.textContent = `From: ${selectedEmail.from}`;
            previewDate.textContent = new Date(selectedEmail.date).toLocaleString();
            previewStatus.innerHTML = `Status: <span class="${selectedEmail.jobExtracted ? 'text-green-600' : 'text-red-600'}">${selectedEmail.jobExtracted ? 'Jobs Extracted' : 'No Jobs Found'}</span>`;
            emailContentPreview.innerHTML = selectedEmail.body; // Assuming body is HTML content

            // Highlight selected email in the list
            Array.from(emailList.children).forEach(item => {
                if (item.dataset.emailId === emailId) {
                    item.classList.add('bg-blue-50');
                } else {
                    item.classList.remove('bg-blue-50');
                }
            });
        }
    }

    // Initial fetch of emails
    fetchEmails();
});