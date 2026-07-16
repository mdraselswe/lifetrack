import type { Dict } from './types'

export const expenses: Dict = {
  'expenses.title': { bn: 'খরচ', en: 'Expenses' },
  'expenses.subtitle': { bn: 'দৈনন্দিন খরচের হিসাব রাখুন', en: 'Track your daily spending' },

  // View toggle
  'expenses.viewMonth': { bn: 'মাস', en: 'Month' },
  'expenses.viewYear': { bn: 'বছর', en: 'Year' },

  // Stat tiles
  'expenses.statMonthTotal': { bn: 'মোট খরচ', en: 'Total spent' },
  'expenses.statBudget': { bn: 'বাজেট', en: 'Budget' },
  'expenses.entriesCount': { bn: '{count}টি খরচ', en: '{count} expenses' },

  // Trend + metrics
  'expenses.trendMonth': { bn: 'গত মাসের চেয়ে {pct}%', en: '{pct}% vs last month' },
  'expenses.trendYear': { bn: 'গত বছরের চেয়ে {pct}%', en: '{pct}% vs last year' },
  'expenses.dailyAvg': { bn: 'দৈনিক গড়', en: 'Daily avg' },
  'expenses.perDay': { bn: 'প্রতিদিন', en: 'per day' },
  'expenses.projected': { bn: 'মাস শেষে আনুমানিক', en: 'Projected' },
  'expenses.pace': { bn: 'মাসের {elapsed}% গেছে · বাজেটের {spent}% শেষ', en: '{elapsed}% of month · {spent}% of budget spent' },
  'expenses.trendTitle': { bn: 'শেষ ৬ মাস', en: 'Last 6 months' },
  'expenses.topCategory': { bn: 'সবচেয়ে বেশি', en: 'Top category' },
  'expenses.biggestExpense': { bn: 'সবচেয়ে বড় খরচ', en: 'Biggest expense' },
  'expenses.today': { bn: 'আজ', en: 'Today' },
  'expenses.yesterday': { bn: 'গতকাল', en: 'Yesterday' },
  'expenses.remaining': { bn: 'অবশিষ্ট ৳{amount}', en: '৳{amount} remaining' },
  'expenses.overBudget': { bn: 'বাজেটের চেয়ে ৳{amount} বেশি', en: '৳{amount} over budget' },
  'expenses.budgetUsed': { bn: '{pct}% ব্যবহার হয়েছে', en: '{pct}% used' },
  'expenses.noBudget': { bn: 'বাজেট নির্ধারণ করা হয়নি', en: 'No budget set' },

  // Budget modal
  'expenses.setBudget': { bn: 'বাজেট নির্ধারণ করুন', en: 'Set budget' },
  'expenses.editBudget': { bn: 'বাজেট সম্পাদনা', en: 'Edit budget' },
  'expenses.budgetLabel': { bn: 'মাসিক বাজেট (৳)', en: 'Monthly budget (৳)' },
  'expenses.budgetSaved': { bn: 'বাজেট সংরক্ষণ হয়েছে', en: 'Budget saved' },
  'expenses.budgetError': { bn: 'বাজেট সংরক্ষণ করা যায়নি', en: 'Could not save budget' },
  'expenses.errValidBudget': { bn: 'সঠিক বাজেট লিখুন', en: 'Enter a valid budget' },

  // Month navigation
  'expenses.prevMonth': { bn: 'আগের মাস', en: 'Previous month' },
  'expenses.nextMonth': { bn: 'পরের মাস', en: 'Next month' },
  'expenses.month.0': { bn: 'জানুয়ারি', en: 'January' },
  'expenses.month.1': { bn: 'ফেব্রুয়ারি', en: 'February' },
  'expenses.month.2': { bn: 'মার্চ', en: 'March' },
  'expenses.month.3': { bn: 'এপ্রিল', en: 'April' },
  'expenses.month.4': { bn: 'মে', en: 'May' },
  'expenses.month.5': { bn: 'জুন', en: 'June' },
  'expenses.month.6': { bn: 'জুলাই', en: 'July' },
  'expenses.month.7': { bn: 'আগস্ট', en: 'August' },
  'expenses.month.8': { bn: 'সেপ্টেম্বর', en: 'September' },
  'expenses.month.9': { bn: 'অক্টোবর', en: 'October' },
  'expenses.month.10': { bn: 'নভেম্বর', en: 'November' },
  'expenses.month.11': { bn: 'ডিসেম্বর', en: 'December' },

  // Categories
  'expenses.filterAll': { bn: 'সব', en: 'All' },
  'expenses.cat.food': { bn: 'খাবার', en: 'Food' },
  'expenses.cat.groceries': { bn: 'বাজার', en: 'Groceries' },
  'expenses.cat.transport': { bn: 'যাতায়াত', en: 'Transport' },
  'expenses.cat.bills': { bn: 'বিল', en: 'Bills' },
  'expenses.cat.rent': { bn: 'বাড়িভাড়া', en: 'Rent' },
  'expenses.cat.mobile': { bn: 'রিচার্জ/ইন্টারনেট', en: 'Mobile/Internet' },
  'expenses.cat.shopping': { bn: 'কেনাকাটা', en: 'Shopping' },
  'expenses.cat.health': { bn: 'স্বাস্থ্য', en: 'Health' },
  'expenses.cat.education': { bn: 'শিক্ষা', en: 'Education' },
  'expenses.cat.entertainment': { bn: 'বিনোদন', en: 'Entertainment' },
  'expenses.cat.other': { bn: 'অন্যান্য', en: 'Other' },

  // Add / edit form
  'expenses.addNew': { bn: 'নতুন খরচ যোগ করুন', en: 'Add expense' },
  'expenses.editTitle': { bn: 'খরচ সম্পাদনা করুন', en: 'Edit expense' },
  'expenses.amountLabel': { bn: 'টাকার পরিমাণ (৳)', en: 'Amount (৳)' },
  'expenses.categoryLabel': { bn: 'ক্যাটাগরি', en: 'Category' },
  'expenses.noteOptional': { bn: 'নোট (ঐচ্ছিক)', en: 'Note (optional)' },
  'expenses.notePlaceholder': { bn: 'যেমন: দুপুরের খাবার', en: 'e.g. lunch' },
  'expenses.zeroPlaceholder': { bn: '০.০০', en: '0.00' },
  'expenses.update': { bn: 'আপডেট করুন', en: 'Update' },

  // Validation
  'expenses.errAmount': { bn: 'সঠিক পরিমাণ লিখুন', en: 'Enter a valid amount' },
  'expenses.errCategory': { bn: 'একটি ক্যাটাগরি নির্বাচন করুন', en: 'Select a category' },
  'expenses.errDate': { bn: 'তারিখ নির্বাচন করুন', en: 'Select a date' },

  // Toasts
  'expenses.addSuccess': { bn: 'খরচ যোগ হয়েছে', en: 'Expense added' },
  'expenses.addError': { bn: 'খরচ যোগ করা যায়নি', en: 'Could not add expense' },
  'expenses.updateSuccess': { bn: 'খরচ আপডেট হয়েছে', en: 'Expense updated' },
  'expenses.updateError': { bn: 'খরচ আপডেট করা যায়নি', en: 'Could not update expense' },
  'expenses.deleteTitle': { bn: 'খরচ মুছবেন?', en: 'Delete expense?' },
  'expenses.deleteMsg': { bn: '৳{amount} খরচটি মুছে ফেলবেন? এটি ফেরানো যাবে না।', en: 'Delete this ৳{amount} expense? This cannot be undone.' },
  'expenses.deleteSuccess': { bn: 'খরচ মুছে ফেলা হয়েছে', en: 'Expense deleted' },
  'expenses.deleteError': { bn: 'খরচ মুছতে সমস্যা হয়েছে', en: 'Could not delete expense' },

  // Empty states
  'expenses.emptyTitle': { bn: 'এই মাসে কোনো খরচ নেই', en: 'No expenses this month' },
  'expenses.emptyDesc': { bn: 'প্রথম খরচ যোগ করে হিসাব শুরু করুন', en: 'Add your first expense to start tracking' },
  'expenses.addFirst': { bn: 'প্রথম খরচ যোগ করুন', en: 'Add your first expense' },
  'expenses.noneInCategory': { bn: 'এই ক্যাটাগরিতে কোনো খরচ নেই', en: 'No expenses in this category' },

  // Breakdown
  'expenses.breakdownTitle': { bn: 'ক্যাটাগরি অনুযায়ী খরচ', en: 'Spending by category' },
}
