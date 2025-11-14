let recurringTemplates = {
  active: [],
  inactive: []
};

document.addEventListener('DOMContentLoaded', () => {
  loadRecurringTemplates();
  setupForms();
  setupModals();
});

async function loadRecurringTemplates() {
  try {
    const response = await fetchAPI('/recurring');
    
    if (response.success) {
      recurringTemplates.active = response.active;
      recurringTemplates.inactive = response.inactive;
      
      displayRecurringTemplates(response.active, 'activeList');
      displayRecurringTemplates(response.inactive, 'inactiveList');
    }
  } catch (error) {
    showError('Failed to load recurring payments');
  }
}

function displayRecurringTemplates(templates, containerId) {
  const container = document.getElementById(containerId);
  
  if (templates.length === 0) {
    container.innerHTML = '<p class="empty-state">No templates found</p>';
    return;
  }

  container.innerHTML = templates.map(template => `
    <div class="recurring-item">
      <div class="recurring-header">
        <div class="recurring-info">
          <div class="recurring-name">${template.name}</div>
          <div class="recurring-details">
            <span class="badge">${template.category}</span>
            <span class="recurring-amount amount">${formatCurrency(template.expectedAmount)}</span>
            <span class="recurring-due">Due: ${getDueDayText(template.dueDay)}</span>
            <span class="badge badge-${getFrequencyColor(template.frequency)}">${template.frequency}</span>
          </div>
        </div>
        <div class="recurring-status">
          ${template.autoPrompt ? '<span class="badge badge-success">Auto-Prompt</span>' : '<span class="badge">Manual</span>'}
        </div>
      </div>
      
      <div class="recurring-actions">
        <button class="btn btn-sm btn-primary" onclick="editRecurring('${template._id}')">Edit</button>
        <button class="btn btn-sm btn-warning" onclick="toggleActive('${template._id}', ${!template.active})">
          ${template.active ? 'Deactivate' : 'Activate'}
        </button>
        <button class="btn btn-sm btn-primary" onclick="viewHistory('${template._id}')">History</button>
        <button class="btn btn-sm btn-danger" onclick="deleteRecurring('${template._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function getDueDayText(day) {
  if (day === 1) return '1st of month';
  if (day === 2) return '2nd of month';
  if (day === 3) return '3rd of month';
  return `${day}th of month`;
}

function getFrequencyColor(frequency) {
  const colors = {
    'weekly': 'primary',
    'biweekly': 'success',
    'monthly': 'warning',
    'yearly': 'danger'
  };
  return colors[frequency] || 'secondary';
}

function setupForms() {
  const addForm = document.getElementById('addRecurringForm');

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dueDay = parseInt(document.getElementById('dueDay').value);
    
    if (dueDay < 1 || dueDay > 31) {
      showError('Due day must be between 1 and 31');
      return;
    }

    if (dueDay > 28) {
      if (!confirm('Warning: Not all months have this many days. Continue anyway?')) {
        return;
      }
    }

    const data = {
      name: document.getElementById('name').value,
      category: document.getElementById('category').value,
      expectedAmount: parseFloat(document.getElementById('expectedAmount').value),
      dueDay: dueDay,
      frequency: document.getElementById('frequency').value,
      autoPrompt: document.getElementById('autoPrompt').checked,
      active: document.getElementById('active').checked
    };

    try {
      await fetchAPI('/recurring', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      showSuccess('Recurring payment added successfully');
      addForm.reset();
      document.getElementById('autoPrompt').checked = true;
      document.getElementById('active').checked = true;
      loadRecurringTemplates();
    } catch (error) {
      showError(error.message);
    }
  });

  const editForm = document.getElementById('editRecurringForm');

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editRecurringId').value;
    const dueDay = parseInt(document.getElementById('editDueDay').value);

    if (dueDay < 1 || dueDay > 31) {
      showError('Due day must be between 1 and 31');
      return;
    }

    const data = {
      name: document.getElementById('editName').value,
      category: document.getElementById('editCategory').value,
      expectedAmount: parseFloat(document.getElementById('editExpectedAmount').value),
      dueDay: dueDay,
      frequency: document.getElementById('editFrequency').value,
      autoPrompt: document.getElementById('editAutoPrompt').checked,
      active: document.getElementById('editActive').checked
    };

    try {
      await fetchAPI(`/recurring/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      showSuccess('Recurring payment updated successfully');
      document.getElementById('editRecurringModal').classList.add('hidden');
      loadRecurringTemplates();
    } catch (error) {
      showError(error.message);
    }
  });
}

function setupModals() {
  const editModal = document.getElementById('editRecurringModal');
  const historyModal = document.getElementById('historyModal');
  const closeEditBtn = document.getElementById('closeEditModal');
  const closeHistoryBtn = document.getElementById('closeHistoryModal');

  closeEditBtn.addEventListener('click', () => {
    editModal.classList.add('hidden');
  });

  closeHistoryBtn.addEventListener('click', () => {
    historyModal.classList.add('hidden');
  });

  window.addEventListener('click', (e) => {
    if (e.target === editModal) {
      editModal.classList.add('hidden');
    }
    if (e.target === historyModal) {
      historyModal.classList.add('hidden');
    }
  });
}

function editRecurring(id) {
  const allTemplates = [...recurringTemplates.active, ...recurringTemplates.inactive];
  const template = allTemplates.find(t => t._id === id);
  
  if (!template) return;

  document.getElementById('editRecurringId').value = template._id;
  document.getElementById('editName').value = template.name;
  document.getElementById('editCategory').value = template.category;
  document.getElementById('editExpectedAmount').value = template.expectedAmount;
  document.getElementById('editDueDay').value = template.dueDay;
  document.getElementById('editFrequency').value = template.frequency;
  document.getElementById('editAutoPrompt').checked = template.autoPrompt;
  document.getElementById('editActive').checked = template.active;

  document.getElementById('editRecurringModal').classList.remove('hidden');
}

async function toggleActive(id, active) {
  try {
    await fetchAPI(`/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ active })
    });

    showSuccess(`Recurring payment ${active ? 'activated' : 'deactivated'}`);
    loadRecurringTemplates();
  } catch (error) {
    showError(error.message);
  }
}

async function viewHistory(id) {
  try {
    const response = await fetchAPI(`/recurring/${id}/history`);
    
    if (response.success) {
      displayHistory(response.payments);
    }
  } catch (error) {
    showError('Failed to load payment history');
  }
}

function displayHistory(payments) {
  const container = document.getElementById('historyList');
  
  if (payments.length === 0) {
    container.innerHTML = '<p class="empty-state">No payment history yet</p>';
  } else {
    container.innerHTML = payments.map(payment => `
      <div class="history-item">
        <div class="history-date">${formatDate(payment.paidDate)}</div>
        <div class="history-amount amount">${formatCurrency(payment.amount)}</div>
        <div class="history-status">
          <span class="badge badge-${payment.status === 'paid' ? 'success' : 'danger'}">${payment.status}</span>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('historyModal').classList.remove('hidden');
}

async function deleteRecurring(id) {
  if (!confirm('Are you sure you want to delete this recurring payment?')) {
    return;
  }

  try {
    await fetchAPI(`/recurring/${id}`, {
      method: 'DELETE'
    });

    showSuccess('Recurring payment deleted');
    loadRecurringTemplates();
  } catch (error) {
    showError(error.message);
  }
}