document.addEventListener('DOMContentLoaded', () => {
  const navbarToggle = document.getElementById('navbarToggle');
  const navbarMenu = document.getElementById('navbarMenu');
  const logoutBtn = document.getElementById('logoutBtn');

  if (navbarToggle && navbarMenu) {
    navbarToggle.addEventListener('click', () => {
      navbarMenu.classList.toggle('active');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetchAPI('/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      } catch (error) {
        showError('Failed to logout');
      }
    });
  }

  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  // Load confirmations and auto-open modal on dashboard
  if (window.location.pathname === '/dashboard') {
    loadNotifications(true); // Auto-open on dashboard
  } else {
    loadNotifications(false); // Just show banner on other pages
  }
});

const showNotification = (message, type = 'info', duration = 5000, clickable = false) => {
  const container = document.getElementById('notificationContainer');
  if (!container) return;

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  // Make confirmation notifications clickable
  if (clickable) {
    notification.style.cursor = 'pointer';
    notification.title = 'Click to view confirmations';
  }
  
  notification.innerHTML = `
    <div class="notification-message">${message}</div>
    <button class="notification-close">&times;</button>
  `;

  container.appendChild(notification);

  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent opening modal when closing
    notification.remove();
  });

  // Make entire notification clickable for confirmations
  if (clickable) {
    notification.addEventListener('click', () => {
      if (typeof window.openConfirmationsModal === 'function') {
        window.openConfirmationsModal();
      }
    });
  }

  if (duration > 0) {
    setTimeout(() => {
      notification.remove();
    }, duration);
  }
};

const loadNotifications = async (autoOpen = false) => {
  try {
    const response = await fetchAPI('/confirmations');
    if (response.success) {
      const totalPending = (response.pending?.length || 0) + (response.snoozed?.length || 0);
      
      if (totalPending > 0) {
        // Show clickable notification banner
        showNotification(
          `You have ${totalPending} pending confirmation${totalPending > 1 ? 's' : ''}`, 
          'confirmation', 
          0, // Don't auto-dismiss
          true // Make clickable
        );
        
        // Auto-open modal on dashboard if there are pending confirmations
        if (autoOpen && typeof window.openConfirmationsModal === 'function') {
          // Small delay to let the page finish loading
          setTimeout(() => {
            window.openConfirmationsModal();
          }, 500);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load notifications');
  }
};

// Make loadNotifications available globally for reload
window.reloadNotifications = loadNotifications;