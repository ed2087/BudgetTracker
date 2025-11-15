let analyticsData = null;

document.addEventListener('DOMContentLoaded', () => {
  loadAnalyticsData();
  setupDownloadButtons();
});

async function loadAnalyticsData() {
  try {
    const response = await fetchAPI('/analytics/overview');
    
    if (response.success) {
      analyticsData = response;
      displayAnalytics(response);
    }
  } catch (error) {
    showError('Failed to load analytics data');
  }
}

function displayAnalytics(data) {
  displayRealityCheck(data.currentMonth);
  displayTrendChart(data.lastSixMonths);
  displayCategoryBreakdown(data.categoryBreakdown);
  displayCategoryTrends(data.trends);
  displayMoneyLeaks(data.moneyLeaks);
  displaySavingsRate(data.savingsRate);
}

function displayRealityCheck(data) {
  document.getElementById('currentBalance').textContent = formatCurrency(data.currentBalance);
  document.getElementById('monthlyIncome').textContent = formatCurrency(data.income);
  document.getElementById('monthlyExpenses').textContent = formatCurrency(data.expenses);
  
  const diffElement = document.getElementById('difference');
  diffElement.textContent = formatCurrency(data.difference);
  diffElement.className = 'reality-value amount ' + (data.difference >= 0 ? 'text-success' : 'text-danger');

  const card = document.getElementById('realityCard');
  const statusMessage = document.getElementById('statusMessage');
  
  card.className = 'card reality-card status-' + data.status.status;
  statusMessage.textContent = getStatusMessage(data.status, data.income, data.expenses);
}

function getStatusMessage(status, income, expenses) {
  const percentage = Math.round(status.percentage);
  const saving = income - expenses;
  
  switch(status.status) {
    case 'healthy':
      return `You're spending ${percentage}% of your income. You're saving ${formatCurrency(saving)} this month. Keep it up.`;
    case 'warning':
      return `You're spending ${percentage}% of your income. You're barely saving anything. One emergency and you're fucked.`;
    case 'danger':
      return `⚠️ You're spending ${percentage}% of your income. You're losing ${formatCurrency(Math.abs(saving))} this month. This cannot continue.`;
    case 'critical':
      return `🔥 YOU'RE BLEEDING MONEY. You're spending ${percentage}% of your income. Cut expenses NOW or you'll be in serious debt.`;
    default:
      return 'Check your spending.';
  }
}

function displayTrendChart(data) {
  const ctx = document.getElementById('trendChart');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.month),
      datasets: [
        {
          label: 'Income',
          data: data.map(d => d.income),
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          tension: 0.3
        },
        {
          label: 'Expenses',
          data: data.map(d => d.expenses),
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });

  const overspending = data.filter(d => d.expenses > d.income).length;
  const messageEl = document.getElementById('trendMessage');
  
  if (overspending > 0) {
    messageEl.innerHTML = `<strong>${overspending} out of last ${data.length} months you spent more than you made.</strong>`;
    messageEl.style.color = '#dc3545';
  } else {
    messageEl.innerHTML = `<strong>Good job! You stayed under budget all ${data.length} months.</strong>`;
    messageEl.style.color = '#28a745';
  }
}

function displayCategoryBreakdown(data) {
  const ctx = document.getElementById('categoryChart');
  
  const categories = Object.keys(data.byCategory);
  const amounts = Object.values(data.byCategory);
  const total = amounts.reduce((sum, val) => sum + val, 0);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [{
        label: 'Amount Spent',
        data: amounts,
        backgroundColor: categories.map(cat => getCategoryColor(cat))
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });

  const breakdownEl = document.getElementById('categoryBreakdown');
  breakdownEl.innerHTML = categories.map(category => {
    const amount = data.byCategory[category];
    const percentage = ((amount / total) * 100).toFixed(1);
    
    return `
      <div class="breakdown-item">
        <div class="breakdown-info">
          <span class="breakdown-category">${category}</span>
          <span class="breakdown-bar" style="width: ${percentage}%; background-color: ${getCategoryColor(category)}"></span>
        </div>
        <div class="breakdown-stats">
          <span class="breakdown-amount amount">${formatCurrency(amount)}</span>
          <span class="breakdown-percent">${percentage}%</span>
        </div>
      </div>
    `;
  }).join('');

  const luxuries = ['Entertainment', 'Dining Out', 'Hobbies', 'Shopping'];
  const luxuryTotal = categories
    .filter(cat => luxuries.includes(cat))
    .reduce((sum, cat) => sum + data.byCategory[cat], 0);

  if (luxuryTotal > 0) {
    const luxuryPercent = ((luxuryTotal / total) * 100).toFixed(1);
    const halfSavings = (luxuryTotal / 2) * 12;
    
    document.getElementById('brutalMessage').innerHTML = `
      <p><strong>You spent ${formatCurrency(luxuryTotal)} on non-essential shit this month.</strong></p>
      <p>That's ${luxuryPercent}% of your income on stuff you didn't need.</p>
      <p>If you cut that in half, you'd save ${formatCurrency(luxuryTotal / 2)}/month = ${formatCurrency(halfSavings)}/year.</p>
    `;
  }
}

function getCategoryColor(category) {
  const necessities = ['Housing', 'Utilities', 'Transportation', 'Groceries', 'Insurance', 'Debt Payments', 'Healthcare'];
  return necessities.includes(category) ? '#007bff' : '#ffc107';
}

function displayCategoryTrends(trends) {
  const container = document.getElementById('categoryTrends');
  
  const trendsList = Object.entries(trends).map(([category, data]) => {
    let trendIcon = '→';
    let trendClass = 'stable';
    let message = '';

    if (data.trend === 'up') {
      trendIcon = '↑';
      trendClass = 'trending-up';
      message = `${category} is trending UP. Last month: ${formatCurrency(data.lastMonth)}, This month: ${formatCurrency(data.thisMonth)} (+${data.percentChange.toFixed(1)}%). Are you aware of this?`;
    } else if (data.trend === 'down') {
      trendIcon = '↓';
      trendClass = 'trending-down';
      message = `${category} is trending DOWN. Last month: ${formatCurrency(data.lastMonth)}, This month: ${formatCurrency(data.thisMonth)} (${data.percentChange.toFixed(1)}%). Good job!`;
    } else if (data.trend === 'spike') {
      trendIcon = '🔥';
      trendClass = 'spike';
      message = `SPIKE DETECTED in ${category}! This month: ${formatCurrency(data.thisMonth)} vs 3-month average: ${formatCurrency(data.threeMonthAvg)}. One-time thing or new pattern?`;
    } else {
      message = `${category} is stable. This month: ${formatCurrency(data.thisMonth)}, 3-month average: ${formatCurrency(data.threeMonthAvg)}.`;
    }

    return `
      <div class="trend-item ${trendClass}">
        <div class="trend-icon">${trendIcon}</div>
        <div class="trend-message">${message}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = trendsList || '<p class="empty-state">No trend data available</p>';
}

function displayMoneyLeaks(data) {
  const container = document.getElementById('moneyLeaks');
  
  if (data.count === 0) {
    container.innerHTML = '<p class="empty-state">No money leaks detected. Good job!</p>';
    return;
  }

  const leaksList = data.leaks.map(leak => `
    <div class="leak-item">
      <div class="leak-name">${leak.name}</div>
      <div class="leak-amounts">
        <span class="leak-monthly">${formatCurrency(leak.expectedAmount)}/month</span>
        <span class="leak-yearly">${formatCurrency(leak.expectedAmount * 12)}/year</span>
      </div>
    </div>
  `).join('');

  const summary = `
    <div class="leaks-summary">
      <p><strong>Total: ${formatCurrency(data.monthlyTotal)}/month = ${formatCurrency(data.yearlyTotal)}/year</strong></p>
      <p>💡 Do you really need all of this?</p>
      <p>Canceling just 2 of these could save you ${formatCurrency(data.yearlyTotal / data.count * 2)}/year.</p>
      <p>That's a vacation. Or an emergency fund. Think about it.</p>
    </div>
  `;

  container.innerHTML = leaksList + summary;
}

function displaySavingsRate(data) {
  const container = document.getElementById('savingsRate');
  
  const monthsList = data.monthlyData.map(month => `
    <div class="savings-item">
      <div class="savings-month">${month.month}</div>
      <div class="savings-stats">
        <div class="savings-stat">
          <span class="savings-label">Income:</span>
          <span class="amount text-success">${formatCurrency(month.income)}</span>
        </div>
        <div class="savings-stat">
          <span class="savings-label">Expenses:</span>
          <span class="amount text-danger">${formatCurrency(month.expenses)}</span>
        </div>
        <div class="savings-stat">
          <span class="savings-label">Difference:</span>
          <span class="amount ${month.difference >= 0 ? 'text-success' : 'text-danger'}">
            ${month.difference >= 0 ? '+' : ''}${formatCurrency(month.difference)}
          </span>
        </div>
      </div>
    </div>
  `).join('');

  container.innerHTML = monthsList;

  const messageEl = document.getElementById('savingsMessage');
  const total = data.total;
  
  if (total < 0) {
    messageEl.innerHTML = `
      <p class="savings-alert"><strong>⚠️ YOU'RE GOING BACKWARDS.</strong></p>
      <p>You've lost ${formatCurrency(Math.abs(total))} in 3 months.</p>
      <p>You need to either make more or spend less.</p>
      <p>There's no third option.</p>
    `;
    messageEl.className = 'savings-message alert';
  } else {
    messageEl.innerHTML = `
      <p><strong>Good job! You've saved ${formatCurrency(total)} in 3 months.</strong></p>
      <p>Keep this up and you'll have ${formatCurrency(total * 4)} saved by the end of the year.</p>
    `;
    messageEl.className = 'savings-message success';
  }
}

function setupDownloadButtons() {
  document.getElementById('downloadMonthlyBtn').addEventListener('click', () => {
    const now = new Date();
    window.location.href = `/api/reports/monthly-pdf?month=${now.getMonth()}&year=${now.getFullYear()}`;
  });

  document.getElementById('downloadTaxBtn').addEventListener('click', () => {
    const year = new Date().getFullYear();
    window.location.href = `/api/reports/tax-summary-pdf?year=${year}`;
  });

  document.getElementById('downloadCsvBtn').addEventListener('click', () => {
    window.location.href = '/api/reports/transactions-csv';
  });
}