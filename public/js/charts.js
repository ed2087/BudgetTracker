let currentReceiptFile = null;

document.addEventListener('DOMContentLoaded', () => {
  setupReceiptUpload();
});

function setupReceiptUpload() {
  const receiptFile = document.getElementById('receiptFile');
  
  if (!receiptFile) return;

  receiptFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      showError('Only JPG and PNG images are supported');
      receiptFile.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('File size must be less than 5MB');
      receiptFile.value = '';
      return;
    }

    currentReceiptFile = file;
    await processReceiptFile(file);
  });
}

async function processReceiptFile(file) {
  const preview = document.getElementById('receiptPreview');
  const result = document.getElementById('receiptResult');
  
  preview.classList.remove('hidden');
  result.classList.add('hidden');
  result.innerHTML = '';

  const formData = new FormData();
  formData.append('receipt', file);

  try {
    const response = await fetch('/api/receipts/process', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    preview.classList.add('hidden');

    if (data.success) {
      displayReceiptResult(data);
    } else {
      showError(data.message || 'Failed to process receipt');
      result.innerHTML = '<p class="error-message">Failed to process receipt. Please enter manually.</p>';
      result.classList.remove('hidden');
    }
  } catch (error) {
    preview.classList.add('hidden');
    showError('Failed to process receipt');
    result.innerHTML = '<p class="error-message">Failed to process receipt. Please enter manually.</p>';
    result.classList.remove('hidden');
  }
}

function displayReceiptResult(data) {
  const result = document.getElementById('receiptResult');
  
  const { extractedText, parsedData } = data;
  
  let html = '<div class="receipt-result-content">';
  html += '<h4>📄 Receipt Processed</h4>';
  
  if (parsedData.amount || parsedData.date || parsedData.merchant) {
    html += '<div class="parsed-data">';
    
    if (parsedData.amount) {
      html += `<div class="parsed-item">
        <span class="parsed-label">Amount:</span>
        <span class="parsed-value amount">${formatCurrency(parsedData.amount)}</span>
      </div>`;
    }
    
    if (parsedData.date) {
      html += `<div class="parsed-item">
        <span class="parsed-label">Date:</span>
        <span class="parsed-value">${formatDate(parsedData.date)}</span>
      </div>`;
    }
    
    if (parsedData.merchant) {
      html += `<div class="parsed-item">
        <span class="parsed-label">Merchant:</span>
        <span class="parsed-value">${parsedData.merchant}</span>
      </div>`;
    }
    
    html += '</div>';
    html += '<p class="result-question">Does this look right?</p>';
    html += '<div class="result-actions">';
    html += '<button class="btn btn-success" onclick="useReceiptData()">YES - Use This Info</button>';
    html += '<button class="btn btn-primary" onclick="enterManually()">NO - Enter Manually</button>';
    html += '</div>';
  } else {
    html += '<p class="warning-text">Could not extract data from receipt. Please enter manually.</p>';
    html += '<button class="btn btn-primary" onclick="enterManually()">Enter Manually</button>';
  }
  
  if (extractedText) {
    html += '<details class="extracted-text-details">';
    html += '<summary>View Full Extracted Text</summary>';
    html += `<pre class="extracted-text">${extractedText}</pre>`;
    html += '</details>';
  }
  
  html += '</div>';
  
  result.innerHTML = html;
  result.classList.remove('hidden');
}

function useReceiptData() {
  const result = document.getElementById('receiptResult');
  const parsedItems = result.querySelectorAll('.parsed-item');
  
  let amount = null;
  let date = null;
  let merchant = null;
  
  parsedItems.forEach(item => {
    const label = item.querySelector('.parsed-label').textContent;
    const value = item.querySelector('.parsed-value').textContent;
    
    if (label.includes('Amount')) {
      amount = parseFloat(value.replace(/[^0-9.]/g, ''));
    } else if (label.includes('Date')) {
      date = value;
    } else if (label.includes('Merchant')) {
      merchant = value;
    }
  });

  if (amount) {
    const amountInput = document.getElementById('expenseAmount');
    if (amountInput) amountInput.value = amount;
  }
  
  if (date) {
    const dateInput = document.getElementById('expenseDate');
    if (dateInput) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        dateInput.valueAsDate = parsedDate;
      }
    }
  }
  
  if (merchant) {
    const nameInput = document.getElementById('expenseName');
    if (nameInput && !nameInput.value) {
      nameInput.value = merchant;
    }
  }

  closeReceiptModal();
  showSuccess('Receipt data loaded into form');
}

function enterManually() {
  closeReceiptModal();
}

function closeReceiptModal() {
  const modal = document.getElementById('receiptModal');
  if (modal) {
    modal.classList.add('hidden');
    
    const receiptFile = document.getElementById('receiptFile');
    if (receiptFile) receiptFile.value = '';
    
    const preview = document.getElementById('receiptPreview');
    const result = document.getElementById('receiptResult');
    if (preview) preview.classList.add('hidden');
    if (result) {
      result.classList.add('hidden');
      result.innerHTML = '';
    }
    
    currentReceiptFile = null;
  }
}