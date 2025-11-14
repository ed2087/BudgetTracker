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
});

const showNotification = (message, type = 'info', duration = 5000) => {
  const container = document.getElementById('notificationContainer');
  if (!container) return;

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  notification.innerHTML = `
    <div class="notification-message">${message}</div>
    <button class="notification-close">&times;</button>
  `;

  container.appendChild(notification);

  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    notification.remove();
  });

  if (duration > 0) {
    setTimeout(() => {
      notification.remove();
    }, duration);
  }
};

const loadNotifications = async () => {
  try {
    const response = await fetchAPI('/dashboard/pending');
    if (response.success) {
      const totalPending = response.incomeConfirmations.length + response.expenseConfirmations.length;
      if (totalPending > 0) {
        showNotification(`You have ${totalPending} pending confirmation${totalPending > 1 ? 's' : ''}`, 'confirmation', 0);
      }
    }
  } catch (error) {
    console.error('Failed to load notifications');
  }
};

if (window.location.pathname !== '/login') {
  loadNotifications();
}