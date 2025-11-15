let currentCategory = 'all';
let searchTimeout;

document.addEventListener('DOMContentLoaded', () => {
  setupFilters();
  setupSearch();
  setupAccordions();
});

function setupFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      
      // Update active button
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Filter categories
      currentCategory = category;
      filterCategories(category);
      
      // Clear search
      document.getElementById('faqSearch').value = '';
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById('faqSearch');
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.toLowerCase().trim();
      searchFAQ(query);
    }, 300);
  });
}

function setupAccordions() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.closest('.faq-item');
      const isActive = faqItem.classList.contains('active');
      
      // Close all other items
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Toggle current item
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });
}

function filterCategories(category) {
  const categories = document.querySelectorAll('.faq-category');
  const noResults = document.getElementById('noResults');
  
  if (category === 'all') {
    categories.forEach(cat => cat.classList.remove('hidden'));
    noResults.classList.add('hidden');
  } else {
    let hasVisible = false;
    
    categories.forEach(cat => {
      if (cat.dataset.category === category) {
        cat.classList.remove('hidden');
        hasVisible = true;
      } else {
        cat.classList.add('hidden');
      }
    });
    
    if (hasVisible) {
      noResults.classList.add('hidden');
    } else {
      noResults.classList.remove('hidden');
    }
  }
}

function searchFAQ(query) {
  const faqItems = document.querySelectorAll('.faq-item');
  const categories = document.querySelectorAll('.faq-category');
  const noResults = document.getElementById('noResults');
  let hasResults = false;
  
  if (!query) {
    // Reset to current filter
    filterCategories(currentCategory);
    return;
  }
  
  // Show all categories first
  categories.forEach(cat => cat.classList.remove('hidden'));
  
  // Filter individual items
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question span').textContent.toLowerCase();
    const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
    
    if (question.includes(query) || answer.includes(query)) {
      item.classList.remove('hidden');
      hasResults = true;
      
      // Highlight matched item
      item.style.borderColor = 'var(--primary)';
      item.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
    } else {
      item.classList.add('hidden');
      item.style.borderColor = '';
      item.style.backgroundColor = '';
    }
  });
  
  // Hide empty categories
  categories.forEach(cat => {
    const visibleItems = cat.querySelectorAll('.faq-item:not(.hidden)');
    if (visibleItems.length === 0) {
      cat.classList.add('hidden');
    }
  });
  
  // Show/hide no results message
  if (hasResults) {
    noResults.classList.add('hidden');
  } else {
    noResults.classList.remove('hidden');
  }
}