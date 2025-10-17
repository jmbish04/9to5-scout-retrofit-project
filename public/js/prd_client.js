document.addEventListener('DOMContentLoaded', () => {
    // Horizontal Tabs functionality
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = document.getElementById(tab.dataset.tabTarget);
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            target.classList.add('active');
        });
    });

    // Modal functionality
    const featureCards = document.querySelectorAll('.feature-card[data-modal-target]');

    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            const modalId = card.dataset.modalTarget;
            const initialTabId = card.dataset.initialTab;
            const modal = document.getElementById(modalId);
            
            if (!modal) return;

            const closeButton = modal.querySelector('.close-button');
            const navLinks = modal.querySelectorAll('.modal-nav-link');
            const panes = modal.querySelectorAll('.modal-pane');

            // Set initial active tab
            navLinks.forEach(link => link.classList.remove('active'));
            panes.forEach(pane => pane.classList.remove('active'));

            const initialLink = modal.querySelector(`.modal-nav-link[data-pane-target="${initialTabId}"]`);
            const initialPane = document.getElementById(initialTabId);

            if (initialLink) initialLink.classList.add('active');
            if (initialPane) initialPane.classList.add('active');
            
            modal.classList.add('flex');

            const closeModal = () => {
                modal.classList.remove('flex');
            }

            closeButton.onclick = closeModal;

            window.onclick = (event) => {
                if (event.target == modal) {
                    closeModal();
                }
            }

            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    const targetPaneId = link.dataset.paneTarget;
                    navLinks.forEach(l => l.classList.remove('active'));
                    panes.forEach(p => p.classList.remove('active'));
                    link.classList.add('active');
                    document.getElementById(targetPaneId).classList.add('active');
                });
            });
        });
    });
});