let incomeSources = [];

document.addEventListener('DOMContentLoaded', () => {
  loadIncomeSources();
  setupForms();
  setupFrequencyListener();
  setupEditModal();
});

async function loadIncomeSources() {
  try {
    const response = await fetchAPI('/income');
    
    if (response.success) {
      incomeSources = response.incomeSources;
      displayIncomeSources(response.incomeSources);
      displayTotalIncome(response.totalMonthly, response.incomeSources);
    }
  } catch (error) {
    showError('Failed to load income sources');
  }
}

function displayTotalIncome(total, sources) {
  document.getElementById('totalMonthlyIncome').textContent = formatCurrency(total);
  
  const activeCount = sources.filter(s => s.active).length;
  document.getElementById('totalBreakdown').textContent = `Based on ${activeCount} active income source${activeCount !== 1 ? 's' : ''}`;
}

function displayIncomeSources(sources) {
  const container = document.getElementById('incomeSourcesList');
  
  if (sources.length === 0) {
    container.innerHTML = '<p class="empty-state">No income sources yet. Add one above to get started.</p>';
    return;
  }

  container.innerHTML = sources.map(source => `
    <div class="source-item ${!source.active ? 'inactive' : ''}">
      <div class="source-header">
        <div class="source-info">
          <div class="source-name">${source.sourceName}</div>
          <div class="source-details">
            <span class="source-amount amount">${formatCurrency(source.amount)}</span>
            <span class="badge badge-${getFrequencyColor(source.frequency)}">${source.frequency}</span>
            ${source.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge">Inactive</span>'}
          </div>
        </div>
      </div>
      
      ${source.nextPayday && source.frequency !== 'irregular' ? `
        <div class="source-payday">
          Next payday: ${formatDate(source.nextPayday)}
        </div>
      ` : ''}
      
      <div class="source-actions">
        <button class="btn btn-primary btn-sm" onclick="editIncome('${source._id}')">Edit</button>
        <button class="btn btn-warning btn-sm" onclick="toggleActive('${source._id}', ${!source.active})">
          ${source.active ? 'Deactivate' : 'Activate'}
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteIncome('${source._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function getFrequencyColor(frequency) {
  const colors = {
    'weekly': 'primary',
    'biweekly': 'success',
    'monthly': 'warning',
    'irregular': 'secondary'
  };
  return colors[frequency] || 'secondary';
}

function setupForms() {
  const addForm = document.getElementById('addIncomeForm');

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const frequency = document.getElementById('frequency').value;
    const nextPayday = document.getElementById('nextPayday').value;

    if (frequency !== 'irregular' && !nextPayday) {
      showError('Next payday is required for regular income');
      return;
    }

    const data = {
      sourceName: document.getElementById('sourceName').value,
      amount: parseFloat(document.getElementById('amount').value),
      frequency: frequency,
      nextPayday: frequency !== 'irregular' ? nextPayday : null,
      active: document.getElementById('active').checked
    };

    try {
      await fetchAPI('/income', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      showSuccess('Income source added successfully');
      addForm.reset();
      document.getElementById('active').checked = true;
      loadIncomeSources();
    } catch (error) {
      showError(error.message);
    }
  });
}

function setupFrequencyListener() {
  const frequencySelect = document.getElementById('frequency');
  const nextPaydayGroup = document.getElementById('nextPaydayGroup');
  const nextPaydayInput = document.getElementById('nextPayday');

  frequencySelect.addEventListener('change', () => {
    if (frequencySelect.value === 'irregular') {
      nextPaydayGroup.style.display = 'none';
      nextPaydayInput.removeAttribute('required');
    } else {
      nextPaydayGroup.style.display = 'block';
      nextPaydayInput.setAttribute('required', 'required');
    }
  });

  const editFrequencySelect = document.getElementById('editFrequency');
  const editNextPaydayGroup = document.getElementById('editNextPaydayGroup');
  const editNextPaydayInput = document.getElementById('editNextPayday');

  editFrequencySelect.addEventListener('change', () => {
    if (editFrequencySelect.value === 'irregular') {
      editNextPaydayGroup.style.display = 'none';
      editNextPaydayInput.removeAttribute('required');
    } else {
      editNextPaydayGroup.style.display = 'block';
      editNextPaydayInput.setAttribute('required', 'required');
    }
  });
}

function setupEditModal() {
  const modal = document.getElementById('editIncomeModal');
  const closeBtn = document.getElementById('closeEditModal');
  const editForm = document.getElementById('editIncomeForm');

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editIncomeId').value;
    const frequency = document.getElementById('editFrequency').value;
    const nextPayday = document.getElementById('editNextPayday').value;

    if (frequency !== 'irregular' && !nextPayday) {
      showError('Next payday is required for regular income');
      return;
    }

    const data = {
      sourceName: document.getElementById('editSourceName').value,
      amount: parseFloat(document.getElementById('editAmount').value),
      frequency: frequency,
      nextPayday: frequency !== 'irregular' ? nextPayday : null,
      active: document.getElementById('editActive').checked
    };

    try {
      await fetchAPI(`/income/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      showSuccess('Income source updated successfully');
      modal.classList.add('hidden');
      loadIncomeSources();
    } catch (error) {
      showError(error.message);
    }
  });
}

function editIncome(id) {
  const source = incomeSources.find(s => s._id === id);
  if (!source) return;

  document.getElementById('editIncomeId').value = source._id;
  document.getElementById('editSourceName').value = source.sourceName;
  document.getElementById('editAmount').value = source.amount;
  document.getElementById('editFrequency').value = source.frequency;
  
  if (source.nextPayday && source.frequency !== 'irregular') {
    const date = new Date(source.nextPayday);
    document.getElementById('editNextPayday').value = date.toISOString().split('T')[0];
    document.getElementById('editNextPaydayGroup').style.display = 'block';
  } else {
    document.getElementById('editNextPayday').value = '';
    document.getElementById('editNextPaydayGroup').style.display = 'none';
  }
  
  document.getElementById('editActive').checked = source.active;

  document.getElementById('editIncomeModal').classList.remove('hidden');
}

async function toggleActive(id, active) {
  try {
    await fetchAPI(`/income/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ active })
    });

    showSuccess(`Income source ${active ? 'activated' : 'deactivated'}`);
    loadIncomeSources();
  } catch (error) {
    showError(error.message);
  }
}

async function deleteIncome(id) {
  if (!confirm('Are you sure you want to delete this income source?')) {
    return;
  }

  try {
    await fetchAPI(`/income/${id}`, {
      method: 'DELETE'
    });

    showSuccess('Income source deleted');
    loadIncomeSources();
  } catch (error) {
    showError(error.message);
  }
}