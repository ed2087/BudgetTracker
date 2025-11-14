**README.md**:

```markdown
# Budget Tracker - No-Bullshit Household Budget App

A straightforward household budget tracking application that tells users the truth about their finances. Built for real people who need accountability with their spending.

## Tech Stack

- **Frontend**: EJS templates, CSS3 (Flexbox only), Vanilla JavaScript
- **Backend**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (JSON Web Tokens) stored in httpOnly cookies
- **Charts**: Chart.js
- **Cron Jobs**: node-cron
- **PDF Generation**: PDFKit
- **Receipt Processing**: Multer + Tesseract.js (OCR)

## Features

- Single household login (JWT authentication)
- Income source tracking (weekly, biweekly, monthly, irregular)
- Recurring payment templates with auto-prompts
- One-time expense tracking
- Receipt upload with OCR text extraction (images deleted after processing)
- Pending confirmation system for income/expenses
- Real-time balance tracking with history
- Analytics with brutal honest feedback
- Category trend detection
- Money leak identification
- PDF report generation (monthly reports, tax summaries)
- CSV export for transactions
- Security questions + recovery code password reset

## Project Structure

```
budget-tracker/
│
├── server.js
├── package.json
├── .env
├── .gitignore
│
├── config/
│   ├── database.js
│   └── jwt.js
│
├── models/
│   ├── User.js
│   ├── Income.js
│   ├── RecurringTemplate.js
│   ├── Expense.js
│   ├── PendingConfirmation.js
│   └── Balance.js
│
├── routes/
│   ├── auth.js
│   ├── dashboard.js
│   ├── income.js
│   ├── expenses.js
│   ├── recurring.js
│   ├── analytics.js
│   ├── receipts.js
│   ├── settings.js
│   ├── confirmations.js
│   └── reports.js
│
├── controllers/
│   ├── authController.js
│   ├── incomeController.js
│   ├── expenseController.js
│   ├── recurringController.js
│   ├── analyticsController.js
│   ├── confirmationController.js
│   └── receiptController.js
│
├── services/
│   ├── cronJobs.js
│   ├── calculations.js
│   ├── notifications.js
│   ├── pdfGenerator.js
│   ├── receiptProcessor.js
│   └── tokenService.js
│
├── middleware/
│   ├── auth.js
│   └── upload.js
│
├── utils/
│   └── helpers.js
│
├── public/
│   ├── css/
│   │   ├── global.css
│   │   ├── partials.css
│   │   ├── login.css
│   │   ├── register.css
│   │   ├── forgot-password.css
│   │   ├── dashboard.css
│   │   ├── income.css
│   │   ├── expenses.css
│   │   ├── recurring.css
│   │   ├── analytics.css
│   │   └── settings.css
│   │
│   ├── js/
│   │   ├── global.js
│   │   ├── partials.js
│   │   ├── charts.js
│   │   ├── confirmations.js
│   │   ├── receipt.js
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── forgot-password.js
│   │   ├── dashboard.js
│   │   ├── income.js
│   │   ├── expenses.js
│   │   ├── recurring.js
│   │   ├── analytics.js
│   │   └── settings.js
│   │
│   └── temp/
│
└── views/
    ├── partials/
    │   ├── head.ejs
    │   ├── navbar.ejs
    │   ├── footer.ejs
    │   └── notification.ejs
    │
    ├── login.ejs
    ├── register.ejs
    ├── forgot-password.ejs
    ├── dashboard.ejs
    ├── income.ejs
    ├── expenses.ejs
    ├── recurring.ejs
    ├── analytics.ejs
    └── settings.ejs
```

## File Descriptions

### Backend

**server.js**
- Main Express server
- Route mounting
- EJS view engine setup
- Static file serving
- Error handling middleware

**config/database.js**
- MongoDB connection using Mongoose
- Connection error handling

**config/jwt.js**
- JWT secret and expiry settings
- Cookie options for regular and "remember me" sessions

**models/User.js**
- Username, password (bcrypt hashed), householdName
- Security questions (2 required, answers hashed)
- Recovery code for password reset
- Preferences: reminderFrequency, lowBalanceThreshold

**models/Income.js**
- Income sources with amount, frequency (weekly/biweekly/monthly/irregular)
- nextPayday for regular income
- Active/inactive status

**models/RecurringTemplate.js**
- Recurring bill templates
- Category, expectedAmount, dueDay (1-31)
- autoPrompt flag for cron job notifications

**models/Expense.js**
- Actual paid expenses
- Links to RecurringTemplate via templateId
- receiptText field for OCR extracted text
- Status: paid or late

**models/PendingConfirmation.js**
- Awaiting user confirmation for income/expenses
- Created by cron jobs
- Status: pending, confirmed, skipped, snoozed

**models/Balance.js**
- Current balance tracking
- History array with date, balance, change, reason, type

**routes/auth.js**
- POST /login - authenticate user
- POST /register - create new account
- POST /logout - clear JWT cookie
- POST /verify-username - check if username exists (password reset flow)
- POST /verify-security-answers - validate security question answers
- POST /verify-recovery-code - validate recovery code
- POST /reset-password - set new password with reset token

**routes/dashboard.js**
- GET /stats - current balance, monthly income/expenses, status
- GET /pending - pending income/expense confirmations
- GET /upcoming - bills due in next 7 days
- GET /recent - recent balance activity

**routes/income.js**
- CRUD operations for income sources
- GET /history - confirmed income history

**routes/expenses.js**
- CRUD operations for expenses
- GET /summary - monthly expense summary by category

**routes/recurring.js**
- CRUD operations for recurring templates
- GET /:id/history - payment history for specific template

**routes/analytics.js**
- GET /overview - complete analytics data
- GET /category-trends - spending trends by category
- GET /year-comparison - year-over-year comparison
- GET /daily-balance - daily balance for a month

**routes/receipts.js**
- POST /process - upload receipt image, run OCR, return extracted data

**routes/settings.js**
- GET / - user settings
- PUT /household - update household name
- PUT /password - change password
- PUT /preferences - update notification preferences
- GET /export - download all data as JSON
- DELETE /delete-all - delete all expenses/income/templates
- POST /balance/update - manually update balance
- GET /balance - get current balance info
- GET /balance/history - get balance history

**routes/confirmations.js**
- GET / - get all pending confirmations
- POST /:id/confirm - confirm income or expense
- POST /:id/snooze - snooze confirmation
- POST /:id/skip - skip confirmation for this period
- PUT /:id/amount - update expected amount

**routes/reports.js**
- GET /monthly-pdf - generate monthly report PDF
- GET /tax-summary-pdf - generate tax summary PDF
- GET /transactions-csv - export transactions as CSV

**controllers/** - Business logic for each route group

**services/cronJobs.js**
- Daily (8 AM): Check for income paydays and recurring bills due
- Weekly (Sunday 8 PM): Weekly summary notification
- Monthly (1st 12:01 AM): Monthly reset and archiving

**services/calculations.js**
- Calculate monthly income totals
- Calculate expenses by category
- Detect spending trends
- Find money leaks (small recurring expenses)
- Calculate savings rate

**services/notifications.js**
- In-memory notification system
- Create, get, dismiss notifications

**services/pdfGenerator.js**
- Generate monthly reports with PDFKit
- Generate tax summaries

**services/receiptProcessor.js**
- Process receipt images with Tesseract.js OCR
- Extract amount, date, merchant
- Delete image after processing

**services/tokenService.js**
- Generate JWT tokens
- Verify JWT tokens

**middleware/auth.js**
- protect - middleware for view routes (redirects to /login)
- protectAPI - middleware for API routes (returns 401 JSON)

**middleware/upload.js**
- Multer configuration
- File type validation (JPG/PNG only)
- File size limit (5MB)
- Temporary storage in public/temp/

**utils/helpers.js**
- formatCurrency, formatDate utilities
- calculateNextPayday, calculateMonthlyIncome
- validateAmount, validateDate
- getSpendingStatus (returns color/status based on spending percentage)

### Frontend

**public/css/global.css**
- CSS variables for colors
- Base styles, resets
- Utility classes (flexbox, text alignment, colors)
- Button styles
- Form input styles
- Mobile-first responsive (min-width media queries)

**public/css/partials.css**
- Navbar with mobile toggle
- Footer
- Notification system styling

**public/css/[page].css** - Page-specific styles for each view

**public/js/global.js**
- fetchAPI wrapper function
- formatCurrency, formatDate helpers
- showError, showSuccess notification functions
- debounce, validateAmount, validateDate utilities

**public/js/partials.js**
- Navbar mobile toggle
- Logout button handler
- Active nav link highlighting
- Load pending notifications on page load

**public/js/charts.js**
- Chart.js helper functions
- createLineChart, createBarChart, createPieChart, createDoughnutChart
- Color palette generation

**public/js/confirmations.js**
- confirmIncome - confirm income received
- snoozeConfirmation - snooze for X days
- skipConfirmation - skip this period
- showDifferentAmount - enter different amount
- showExpenseDate - select payment date for expense

**public/js/receipt.js**
- Receipt file upload handler
- Display OCR results
- Pre-fill expense form with extracted data
- useReceiptData, enterManually functions

**public/js/login.js**
- Login form submission
- Remember me checkbox

**public/js/register.js**
- Registration form submission
- Security question selection (prevent duplicates)
- Display recovery code modal after registration

**public/js/forgot-password.js**
- Multi-step password reset flow
- Username verification
- Security questions OR recovery code verification
- New password submission
- Display new recovery code after reset

**public/js/dashboard.js**
- Load dashboard data (stats, pending, upcoming, recent)
- Display pending confirmations with action buttons
- Modal handlers for add expense and update balance
- Form submissions

**public/js/income.js**
- Load income sources
- Display total monthly income
- Add/edit/delete income sources
- Toggle active status
- Frequency change handling (show/hide nextPayday field)

**public/js/expenses.js**
- Load expenses with filters and pagination
- Display monthly summary
- Add expense (quick form)
- Receipt upload integration
- View expense details
- Delete expense

**public/js/recurring.js**
- Load active and inactive recurring templates
- Add/edit/delete templates
- Toggle active status
- View payment history for template

**public/js/analytics.js**
- Load analytics overview
- Display reality check with color-coded status
- Render income vs expenses trend chart
- Render category breakdown chart
- Display category trends with auto-generated messages
- Display money leaks
- Display savings rate
- Download report buttons

**public/js/settings.js**
- Load user settings
- Update household info
- Change password
- Update preferences
- Manual balance update
- View balance history
- Export all data
- Delete all data (with confirmation)

**views/** - EJS templates

**views/partials/head.ejs**
- Meta tags, viewport
- CSS links (global, partials, page-specific)
- Page title

**views/partials/navbar.ejs**
- Mobile-responsive navigation
- Links to all main pages
- Logout button

**views/partials/footer.ejs**
- Copyright info

**views/partials/notification.ejs**
- Empty container for notifications

**views/login.ejs**
- Login form
- Links to register and forgot password

**views/register.ejs**
- Registration form with household name, username, password
- 2 security questions with answers
- Recovery code display modal

**views/forgot-password.ejs**
- Multi-step password reset
- Username entry
- Method selection (security questions or recovery code)
- Security questions form
- Recovery code form
- New password form
- New recovery code display

**views/dashboard.ejs**
- Pending confirmations section
- Stats cards (balance, income, expenses, difference)
- Status message card (color-coded)
- Quick actions
- Upcoming bills
- Recent activity
- Modals for add expense and update balance

**views/income.ejs**
- Total monthly income display
- Add income source form
- List of income sources with edit/delete actions
- Edit income modal

**views/expenses.ejs**
- Filters (date range, category, type)
- Monthly summary stats
- Quick add expense form
- Expense list with pagination
- Receipt upload modal
- Expense detail modal

**views/recurring.ejs**
- Info banner explaining how it works
- Add recurring payment form
- Active recurring payments list
- Inactive templates (collapsible)
- Edit recurring modal
- Payment history modal

**views/analytics.ejs**
- Reality check card (color-coded)
- Income vs expenses trend chart
- Category breakdown chart
- Category trends list
- Money leaks card
- Savings rate (last 3 months)
- Download reports section

**views/settings.ejs**
- Household information form
- Change password form
- Balance management
- Notification preferences
- Data export/delete
- Danger zone (logout)
- Update balance modal
- Balance history modal
- Delete confirmation modal

## Environment Variables (.env)

```
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/budgettracker
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRE=7d
COOKIE_EXPIRE=7
```

## Installation

```bash
npm install
```

## Dependencies

```json
{
  "bcryptjs": "^2.4.3",
  "cookie-parser": "^1.4.6",
  "dotenv": "^16.0.3",
  "ejs": "^3.1.9",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.2",
  "mongoose": "^7.6.3",
  "multer": "^1.4.5-lts.1",
  "node-cron": "^3.0.2",
  "pdfkit": "^0.13.0",
  "tesseract.js": "^4.1.1"
}
```

## Run

```bash
npm start
```

or for development:

```bash
npm run dev
```

## Known Issues

1. **Modal closing bug on dashboard**: Modals (add expense, update balance) may not close properly when clicking X button or outside modal. Issue related to event propagation. Needs debugging.

## Password Reset Flow

Users have 2 options to reset password:
1. **Security Questions**: Answer 2 security questions set during registration
2. **Recovery Code**: Enter recovery code provided during registration

After successful reset, a NEW recovery code is generated (old one becomes invalid).

## Cron Jobs

All cron jobs are started automatically when server starts (if NODE_ENV=production).

- **Daily (8 AM)**: Checks for income paydays and recurring bills due today, creates pending confirmations
- **Weekly (Sunday 8 PM)**: Creates weekly spending summary notification
- **Monthly (1st 12:01 AM)**: Archives old confirmations, generates monthly summary

## Categories

**Necessities**: Housing, Utilities, Transportation, Groceries, Insurance, Debt Payments, Healthcare

**Luxuries**: Entertainment, Dining Out, Clothing, Hobbies, Subscriptions, Shopping, Other

## Receipt Processing

1. User uploads JPG/PNG image (max 5MB)
2. Image saved temporarily to public/temp/
3. Tesseract.js runs OCR to extract text
4. Text parsed for amount, date, merchant using regex
5. Extracted data shown to user for confirmation
6. User can accept (pre-fills form) or enter manually
7. Image deleted immediately after processing
8. Only extracted text saved to expense.receiptText field

## PDF Reports

**Monthly Report**:
- Summary stats (income, expenses, difference)
- Spending by category
- All transactions for the month
- Charts embedded as images

**Tax Summary**:
- All expenses for the year grouped by category
- Totals for each category
- Grand total

## Contact

Edgar Robledo
- Phone: 803-209-7750 (text first)
- Email: edgar@codedevhub.com
```