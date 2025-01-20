// DOM Elements
const addPurchaseBtn = document.getElementById('addPurchaseBtn');
const purchaseModal = document.getElementById('purchaseModal');
const purchaseForm = document.getElementById('purchaseForm');
const purchasesList = document.getElementById('purchasesList');
const timeframeFilter = document.getElementById('timeframeFilter');
const customDateRange = document.getElementById('customDateRange');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const applyCustomRange = document.getElementById('applyCustomRange');

// Calendar Variables
let currentDate = new Date();
let selectedDate = null;

// Additional DOM Elements
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.sidebar nav a');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const currentMonthElement = document.getElementById('currentMonth');
const calendarDays = document.getElementById('calendarDays');
const dayDetailsModal = document.getElementById('dayDetailsModal');
const editPurchaseModal = document.getElementById('editPurchaseModal');
const editPurchaseForm = document.getElementById('editPurchaseForm');
const purchasesTableBody = document.getElementById('purchasesTableBody');

// Charts
let categoryChart = null;
let trendChart = null;

// State
let purchases = JSON.parse(localStorage.getItem('purchases')) || [];
let monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 2000.00;
let currentTimeframe = {
    start: null,
    end: null
};

// Colors for categories
const categoryColors = {
    food: '#FF6384',
    transportation: '#36A2EB',
    utilities: '#FFCE56',
    entertainment: '#4BC0C0',
    shopping: '#9966FF',
    health: '#FF9F40',
    housing: '#8AC926',
    other: '#95A5A6'
};

// Event Listeners
addPurchaseBtn.addEventListener('click', () => {
    purchaseModal.style.display = 'block';
    document.getElementById('date').valueAsDate = new Date();
});

window.addEventListener('click', (e) => {
    if (e.target === purchaseModal) {
        closeModal();
    }
});

purchaseForm.addEventListener('submit', handlePurchaseSubmit);

timeframeFilter.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        customDateRange.style.display = 'flex';
    } else {
        customDateRange.style.display = 'none';
        updateTimeframe(e.target.value);
    }
});

applyCustomRange.addEventListener('click', () => {
    if (startDateInput.value && endDateInput.value) {
        currentTimeframe = {
            start: new Date(startDateInput.value),
            end: new Date(endDateInput.value)
        };
        updateUI();
    }
});

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').substring(1);
        showSection(targetId);
    });
});

prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

editPurchaseForm.addEventListener('submit', handleEditPurchaseSubmit);

// Functions
function closeModal() {
    purchaseModal.style.display = 'none';
    purchaseForm.reset();
}

function handlePurchaseSubmit(e) {
    e.preventDefault();

    const purchase = {
        id: Date.now(),
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
    };

    purchases.push(purchase);
    localStorage.setItem('purchases', JSON.stringify(purchases));
    
    updateUI();
    renderCalendar();
    renderPurchasesTable();
    closeModal();
}

function updateTimeframe(value) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    switch (value) {
        case 'this-month':
            currentTimeframe = {
                start: firstDayOfMonth,
                end: lastDayOfMonth
            };
            break;
        case 'last-month':
            currentTimeframe = {
                start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                end: new Date(now.getFullYear(), now.getMonth(), 0)
            };
            break;
    }
    
    updateUI();
}

function getFilteredPurchases() {
    return purchases.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= currentTimeframe.start && purchaseDate <= currentTimeframe.end;
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function updateUI() {
    const filteredPurchases = getFilteredPurchases();
    
    // Update summary cards
    const totalExpenses = filteredPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const remaining = monthlyBudget - totalExpenses;
    const daysInPeriod = Math.ceil((currentTimeframe.end - currentTimeframe.start) / (1000 * 60 * 60 * 24));
    const avgDailySpend = totalExpenses / daysInPeriod;

    // Update cards with amounts and additional info
    document.querySelector('.card:nth-child(1) .amount').textContent = formatCurrency(totalExpenses);
    document.querySelector('.card:nth-child(2) .amount').textContent = formatCurrency(monthlyBudget);
    document.querySelector('.card:nth-child(3) .amount').textContent = formatCurrency(remaining);
    document.querySelector('.card:nth-child(4) .amount').textContent = formatCurrency(avgDailySpend);

    // Update progress and trends
    const budgetProgress = (totalExpenses / monthlyBudget) * 100;
    document.querySelector('.budget-progress').textContent = `${budgetProgress.toFixed(1)}% of budget used`;
    
    const daysLeft = Math.ceil((currentTimeframe.end - new Date()) / (1000 * 60 * 60 * 24));
    document.querySelector('.days-left').textContent = `${daysLeft} days remaining`;

    // Update purchases list
    updatePurchasesList(filteredPurchases);
    
    // Update charts
    updateCategoryChart(filteredPurchases);
    updateTrendChart(filteredPurchases);
}

function updatePurchasesList(filteredPurchases) {
    purchasesList.innerHTML = '';
    const sortedPurchases = [...filteredPurchases].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedPurchases.forEach(purchase => {
        const purchaseElement = document.createElement('div');
        purchaseElement.className = 'purchase-item';
        purchaseElement.innerHTML = `
            <div class="purchase-info">
                <div class="purchase-description">${purchase.description}</div>
                <div class="purchase-details">
                    ${purchase.category} • ${new Date(purchase.date).toLocaleDateString()}
                </div>
            </div>
            <div class="purchase-amount">${formatCurrency(purchase.amount)}</div>
        `;
        purchasesList.appendChild(purchaseElement);
    });
}

function updateCategoryChart(filteredPurchases) {
    const categoryTotals = {};
    filteredPurchases.forEach(purchase => {
        categoryTotals[purchase.category] = (categoryTotals[purchase.category] || 0) + purchase.amount;
    });

    const data = {
        labels: Object.keys(categoryTotals),
        datasets: [{
            data: Object.values(categoryTotals),
            backgroundColor: Object.keys(categoryTotals).map(category => categoryColors[category]),
        }]
    };

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(document.getElementById('categoryChart'), {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

function updateTrendChart(filteredPurchases) {
    const dailyTotals = {};
    filteredPurchases.forEach(purchase => {
        const date = purchase.date;
        dailyTotals[date] = (dailyTotals[date] || 0) + purchase.amount;
    });

    const sortedDates = Object.keys(dailyTotals).sort();
    const data = {
        labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
        datasets: [{
            label: 'Daily Spending',
            data: sortedDates.map(date => dailyTotals[date]),
            borderColor: '#2563eb',
            tension: 0.4,
            fill: false
        }]
    };

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(document.getElementById('trendChart'), {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function showSection(sectionId) {
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    if (sectionId === 'dashboard') {
        document.querySelector('.main-content').style.display = 'block';
    } else {
        document.querySelector(`.${sectionId}-section`).style.display = 'block';
    }

    // Update active nav link
    navLinks.forEach(link => {
        link.parentElement.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.parentElement.classList.add('active');
        }
    });

    // Render calendar if calendar section is shown
    if (sectionId === 'calendar') {
        renderCalendar();
    } else if (sectionId === 'purchases') {
        renderPurchasesTable();
    }
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update month/year display
    currentMonthElement.textContent = new Date(year, month, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Clear calendar
    calendarDays.innerHTML = '';

    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarDays.appendChild(emptyDay);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayPurchases = purchases.filter(p => p.date === dateStr);
        const dayTotal = dayPurchases.reduce((sum, p) => sum + p.amount, 0);

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        if (dayPurchases.length > 0) dayElement.classList.add('has-purchases');
        if (isToday(year, month, day)) dayElement.classList.add('today');

        dayElement.innerHTML = `
            <div class="day-number">${day}</div>
            ${dayPurchases.length > 0 ? `
                <div class="purchase-count">${dayPurchases.length} purchase${dayPurchases.length !== 1 ? 's' : ''}</div>
                <div class="day-total">${formatCurrency(dayTotal)}</div>
            ` : ''}
        `;

        dayElement.addEventListener('click', () => showDayDetails(dateStr));
        calendarDays.appendChild(dayElement);
    }
}

function isToday(year, month, day) {
    const today = new Date();
    return today.getFullYear() === year &&
           today.getMonth() === month &&
           today.getDate() === day;
}

function showDayDetails(dateStr) {
    const date = new Date(dateStr);
    const dayPurchases = purchases.filter(p => p.date === dateStr);
    const dayTotal = dayPurchases.reduce((sum, p) => sum + p.amount, 0);

    document.getElementById('selectedDate').textContent = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('dayTotalPurchases').textContent = dayPurchases.length;
    document.getElementById('dayTotalAmount').textContent = formatCurrency(dayTotal);

    const purchasesList = document.getElementById('dayPurchasesList');
    purchasesList.innerHTML = '';
    dayPurchases.forEach(purchase => {
        const purchaseElement = document.createElement('div');
        purchaseElement.className = 'purchase-item';
        purchaseElement.innerHTML = `
            <div class="purchase-info">
                <div class="purchase-description">${purchase.description}</div>
                <div class="purchase-details">
                    ${purchase.category} • ${formatCurrency(purchase.amount)}
                </div>
            </div>
            <button class="edit-btn" onclick="showEditModal('${purchase.id}')">
                <span class="material-icons">edit</span>
            </button>
        `;
        purchasesList.appendChild(purchaseElement);
    });

    dayDetailsModal.style.display = 'block';
}

function closeDayDetailsModal() {
    dayDetailsModal.style.display = 'none';
}

function renderPurchasesTable() {
    const filteredPurchases = getFilteredPurchases();
    purchasesTableBody.innerHTML = '';

    filteredPurchases.sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(purchase => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(purchase.date).toLocaleDateString()}</td>
                <td>${purchase.description}</td>
                <td>${purchase.category}</td>
                <td>${formatCurrency(purchase.amount)}</td>
                <td>
                    <div class="purchase-actions">
                        <button class="edit-btn" onclick="showEditModal('${purchase.id}')">
                            <span class="material-icons">edit</span>
                        </button>
                    </div>
                </td>
            `;
            purchasesTableBody.appendChild(row);
        });
}

function showEditModal(purchaseId) {
    const purchase = purchases.find(p => p.id === parseInt(purchaseId));
    if (!purchase) return;

    document.getElementById('editPurchaseId').value = purchase.id;
    document.getElementById('editDescription').value = purchase.description;
    document.getElementById('editAmount').value = purchase.amount;
    document.getElementById('editCategory').value = purchase.category;
    document.getElementById('editDate').value = purchase.date;

    editPurchaseModal.style.display = 'block';
}

function closeEditModal() {
    editPurchaseModal.style.display = 'none';
    editPurchaseForm.reset();
}

function handleEditPurchaseSubmit(e) {
    e.preventDefault();

    const purchaseId = parseInt(document.getElementById('editPurchaseId').value);
    const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
    
    if (purchaseIndex === -1) return;

    purchases[purchaseIndex] = {
        id: purchaseId,
        description: document.getElementById('editDescription').value,
        amount: parseFloat(document.getElementById('editAmount').value),
        category: document.getElementById('editCategory').value,
        date: document.getElementById('editDate').value,
    };

    localStorage.setItem('purchases', JSON.stringify(purchases));
    
    updateUI();
    renderCalendar();
    renderPurchasesTable();
    closeEditModal();
}

function deletePurchase() {
    const purchaseId = parseInt(document.getElementById('editPurchaseId').value);
    purchases = purchases.filter(p => p.id !== purchaseId);
    
    localStorage.setItem('purchases', JSON.stringify(purchases));
    
    updateUI();
    renderCalendar();
    renderPurchasesTable();
    closeEditModal();
}

// Initialize dashboard
showSection('dashboard');
updateTimeframe('this-month');
updateUI();