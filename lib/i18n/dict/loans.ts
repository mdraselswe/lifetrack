import type { Dict } from './types'

export const loans: Dict = {
  // AppBar
  'loans.title': { bn: 'ধার নিয়েছি', en: 'Borrowed' },
  'loans.subtitle': { bn: 'আপনার দেনা', en: 'Your loans' },

  // Stats
  'loans.statToPay': { bn: 'দিতে হবে', en: 'To pay' },
  'loans.statReturned': { bn: 'ফেরত দিয়েছি', en: 'Returned' },

  // Empty state
  'loans.emptyTitle': { bn: 'কোনো ধার নেই', en: 'No loans' },
  'loans.emptyDesc': { bn: 'এখনো কারো থেকে টাকা ধার নেননি', en: "You haven't borrowed money from anyone yet" },
  'loans.addFirst': { bn: 'প্রথম ধার যোগ করুন', en: 'Add your first loan' },

  // Section headers
  'loans.sectionActive': { bn: 'ফেরত দিতে হবে', en: 'To repay' },
  'loans.sectionReturned': { bn: 'ফেরত দিয়েছি', en: 'Returned' },
  'loans.paymentHistory': { bn: 'পরিশোধের ইতিহাস', en: 'Payment history' },
  'loans.initialLoan': { bn: 'প্রাথমিক ধার', en: 'Initial loan' },
  'loans.amountIncrease': { bn: 'পরিমাণ বৃদ্ধি', en: 'Amount increases' },

  // Card labels
  'loans.total': { bn: 'মোট', en: 'Total' },
  'loans.paid': { bn: 'পরিশোধিত', en: 'Paid' },
  'loans.paidLabel': { bn: 'পরিশোধ', en: 'Paid' },
  'loans.remaining': { bn: 'বাকি', en: 'Remaining' },

  // Buttons
  'loans.increaseBtn': { bn: 'বৃদ্ধি', en: 'Increase' },
  'loans.paidBackBtn': { bn: 'ফেরত দিয়েছি', en: 'Paid back' },
  'loans.markPaid': { bn: 'পরিশোধিত চিহ্নিত করুন', en: 'Mark as paid' },
  'loans.updateBtn': { bn: 'আপডেট', en: 'Update' },

  // Modal titles
  'loans.addNew': { bn: 'নতুন ধার যোগ করুন', en: 'Add a new loan' },
  'loans.editTitle': { bn: 'ধার সম্পাদনা করুন', en: 'Edit loan' },
  'loans.editPaymentTitle': { bn: 'পেমেন্ট সম্পাদনা করুন', en: 'Edit payment' },
  'loans.editIncreaseTitle': { bn: 'পরিমাণ বৃদ্ধি সম্পাদনা করুন', en: 'Edit amount increase' },
  'loans.increaseTitle': { bn: 'ধারের পরিমাণ বৃদ্ধি করুন', en: 'Increase loan amount' },

  // Form fields & placeholders
  'loans.personName': { bn: 'ব্যক্তির নাম', en: "Person's name" },
  'loans.personPlaceholder': { bn: 'যেমন: রহিম', en: 'e.g. Rahim' },
  'loans.amountLabel': { bn: 'পরিমাণ (৳)', en: 'Amount (৳)' },
  'loans.zero': { bn: '০', en: '0' },
  'loans.initialReasonOptional': { bn: 'প্রাথমিক কারণ (ঐচ্ছিক)', en: 'Initial reason (optional)' },
  'loans.reasonOptional': { bn: 'কারণ (ঐচ্ছিক)', en: 'Reason (optional)' },
  'loans.noteOptional': { bn: 'নোট (ঐচ্ছিক)', en: 'Note (optional)' },
  'loans.reasonPlaceholder': { bn: 'যেমন: জরুরি খরচ', en: 'e.g. emergency expense' },
  'loans.paymentNotePlaceholder': { bn: 'যেমন: আংশিক পরিশোধ', en: 'e.g. partial payment' },
  'loans.returnNotePlaceholder': { bn: 'যেমন: আংশিক ফেরত', en: 'e.g. partial return' },
  'loans.increaseReasonPlaceholder': { bn: 'যেমন: অতিরিক্ত প্রয়োজন', en: 'e.g. needed more' },
  'loans.increaseAmountLabel': { bn: 'বৃদ্ধির পরিমাণ (৳)', en: 'Increase amount (৳)' },
  'loans.howMuchReturned': { bn: 'কত টাকা ফেরত দিলেন?', en: 'How much did you pay back?' },
  'loans.fullReturnChip': { bn: 'সম্পূর্ণ ৳{amount} ফেরত', en: 'Return full ৳{amount}' },

  // Return due date & auto reminder
  'loans.dueDateOptional': { bn: 'ফেরতের তারিখ (ঐচ্ছিক)', en: 'Return due date (optional)' },
  'loans.dueReminderTitle': { bn: 'ধার পরিশোধ: {name}', en: 'Repayment due: {name}' },
  'loans.dueReminderDesc': { bn: '{name}-কে ৳{amount} ফেরত দেওয়ার কথা ({date})', en: 'Repay ৳{amount} to {name} (due {date})' },
  'loans.dueReminderCreated': { bn: 'ফেরতের রিমাইন্ডার তৈরি হয়েছে', en: 'Return reminder created' },

  // Validation errors
  'loans.errNameAmount': { bn: 'নাম এবং পরিমাণ দিন', en: 'Enter a name and amount' },
  'loans.errValidAmount': { bn: 'সঠিক পরিমাণ দিন', en: 'Enter a valid amount' },
  'loans.errAmountDate': { bn: 'পরিমাণ এবং তারিখ প্রয়োজন', en: 'Amount and date are required' },
  'loans.errOverpay': { bn: 'বাকি পরিমাণ: ৳{remaining}. তার চেয়ে বেশি পরিশোধ করা যাবে না।', en: 'Remaining: ৳{remaining}. You cannot pay more than that.' },
  'loans.errAmountBelowPaid': { bn: 'মোট পরিশোধিত পরিমাণ: ৳{paid}. নতুন পরিমাণ তার চেয়ে কম হতে পারবে না।', en: 'Total paid: ৳{paid}. The new amount cannot be less than that.' },

  // Add loan
  'loans.addSuccess': { bn: 'ধার সফলভাবে যোগ করা হয়েছে', en: 'Loan added successfully' },
  'loans.addError': { bn: 'ধার যোগ করতে সমস্যা হয়েছে', en: 'Failed to add loan' },

  // Toggle returned status
  'loans.toggleTitle': { bn: 'ধারের অবস্থা পরিবর্তন করুন', en: 'Change loan status' },
  'loans.toggleMessage': { bn: '{name} এর {amount} টাকার ধার {action} হিসেবে চিহ্নিত করবেন?', en: "Mark {name}'s loan of ৳{amount} as {action}?" },
  'loans.toggleSuccess': { bn: 'ধার {action} হিসেবে চিহ্নিত করা হয়েছে', en: 'Loan marked as {action}' },
  'loans.toggleError': { bn: 'ধারের অবস্থা পরিবর্তন করতে সমস্যা হয়েছে', en: 'Failed to change loan status' },
  'loans.statusReturned': { bn: 'ফেরত দিয়েছেন', en: 'returned' },
  'loans.statusNotReturned': { bn: 'ফেরত দেননি', en: 'not returned' },
  'loans.confirmReturned': { bn: 'ফেরত দিয়েছি', en: 'Returned' },
  'loans.confirmNotReturned': { bn: 'ফেরত দেইনি', en: 'Not returned' },
  'loans.fullPaymentNote': { bn: 'সম্পূর্ণ পরিশোধ', en: 'Full payment' },

  // Delete loan
  'loans.deleteTitle': { bn: 'ধার মুছুন', en: 'Delete loan' },
  'loans.deleteMessage': { bn: '{name} এর {amount} টাকার ধার মুছে ফেলবেন?', en: "Delete {name}'s loan of ৳{amount}?" },
  'loans.deleteSuccess': { bn: 'ধার সফলভাবে মুছে ফেলা হয়েছে', en: 'Loan deleted successfully' },
  'loans.deleteError': { bn: 'ধার মুছতে সমস্যা হয়েছে', en: 'Failed to delete loan' },

  // Update loan
  'loans.updateTitle': { bn: 'ধার আপডেট করুন', en: 'Update loan' },
  'loans.updateMessage': { bn: '{name} এর ধারের তথ্য আপডেট করবেন?', en: "Update {name}'s loan details?" },
  'loans.updateSuccess': { bn: 'ধার সফলভাবে আপডেট করা হয়েছে', en: 'Loan updated successfully' },
  'loans.updateError': { bn: 'ধার আপডেট করতে সমস্যা হয়েছে', en: 'Failed to update loan' },

  // Payments
  'loans.paymentAddSuccess': { bn: 'পেমেন্ট সফলভাবে যোগ করা হয়েছে', en: 'Payment added successfully' },
  'loans.paymentAddError': { bn: 'পেমেন্ট যোগ করতে সমস্যা হয়েছে', en: 'Failed to add payment' },
  'loans.paymentDeleteTitle': { bn: 'পেমেন্ট মুছুন', en: 'Delete payment' },
  'loans.paymentDeleteMessage': { bn: '{amount} টাকার পেমেন্ট মুছে ফেলবেন?', en: 'Delete the payment of ৳{amount}?' },
  'loans.paymentDeleteSuccess': { bn: 'পেমেন্ট সফলভাবে মুছে ফেলা হয়েছে', en: 'Payment deleted successfully' },
  'loans.paymentDeleteError': { bn: 'পেমেন্ট মুছতে সমস্যা হয়েছে', en: 'Failed to delete payment' },
  'loans.paymentUpdateTitle': { bn: 'পেমেন্ট আপডেট করুন', en: 'Update payment' },
  'loans.paymentUpdateMessage': { bn: '{amount} টাকার পেমেন্ট আপডেট করবেন?', en: 'Update the payment of ৳{amount}?' },
  'loans.paymentUpdateSuccess': { bn: 'পেমেন্ট সফলভাবে আপডেট করা হয়েছে', en: 'Payment updated successfully' },
  'loans.paymentUpdateError': { bn: 'পেমেন্ট আপডেট করতে সমস্যা হয়েছে', en: 'Failed to update payment' },

  // Increases
  'loans.increaseConfirmMessage': { bn: '{name} এর ধারের পরিমাণ ৳{from} থেকে ৳{to} বৃদ্ধি করবেন?', en: "Increase {name}'s loan amount from ৳{from} to ৳{to}?" },
  'loans.increaseSuccess': { bn: 'ধারের পরিমাণ বৃদ্ধি করা হয়েছে', en: 'Loan amount increased' },
  'loans.increaseError': { bn: 'ধারের পরিমাণ বৃদ্ধি করতে সমস্যা হয়েছে', en: 'Failed to increase loan amount' },
  'loans.increaseDeleteTitle': { bn: 'পরিমাণ বৃদ্ধি মুছুন', en: 'Delete amount increase' },
  'loans.increaseDeleteMessage': { bn: '{amount} টাকার পরিমাণ বৃদ্ধি মুছে ফেলবেন? ধারের পরিমাণ ৳{from} থেকে ৳{to} হবে।', en: 'Delete the increase of ৳{amount}? The loan amount will change from ৳{from} to ৳{to}.' },
  'loans.increaseDeleteSuccess': { bn: 'পরিমাণ বৃদ্ধি সফলভাবে মুছে ফেলা হয়েছে', en: 'Amount increase deleted successfully' },
  'loans.increaseDeleteError': { bn: 'পরিমাণ বৃদ্ধি মুছতে সমস্যা হয়েছে', en: 'Failed to delete amount increase' },
  'loans.increaseUpdateTitle': { bn: 'পরিমাণ বৃদ্ধি আপডেট করুন', en: 'Update amount increase' },
  'loans.increaseUpdateMessage': { bn: '{amount} টাকার পরিমাণ বৃদ্ধি আপডেট করবেন?', en: 'Update the increase of ৳{amount}?' },
  'loans.increaseUpdateSuccess': { bn: 'পরিমাণ বৃদ্ধি সফলভাবে আপডেট করা হয়েছে', en: 'Amount increase updated successfully' },
  'loans.increaseUpdateError': { bn: 'পরিমাণ বৃদ্ধি আপডেট করতে সমস্যা হয়েছে', en: 'Failed to update amount increase' },

  // Due date help + form chrome
  'loans.dueDateHelp': { bn: 'আপনি যে ডেডলাইন ঠিক করেছেন', en: 'The deadline you set' },
  'loans.moreOptions': { bn: 'আরও অপশন', en: 'More options' },
  'loans.lessOptions': { bn: 'কম অপশন', en: 'Fewer options' },
  'loans.errDueBeforeDate': { bn: 'ফেরতের তারিখ, ধার নেওয়ার তারিখের আগে হতে পারবে না', en: 'Due date cannot be before the date taken' },
  'loans.errPromiseBeforeDate': { bn: 'তারিখ, ধার নেওয়ার তারিখের আগে হতে পারবে না', en: 'Date cannot be before the date taken' },
  'loans.intervalWeekly': { bn: 'সাপ্তাহিক', en: 'Weekly' },
  'loans.intervalMonthly': { bn: 'মাসিক', en: 'Monthly' },
  'loans.intervalCustom': { bn: 'কাস্টম', en: 'Custom' },

  // "আবার মনে করিয়ে দিন" — follow-up promise reminder (card action, not a form field)
  'loans.promiseCta': { bn: 'আবার মনে করিয়ে দিন', en: 'Remind me again' },
  'loans.promiseChip': { bn: 'মনে করাবে: {date}', en: 'Reminder: {date}' },
  'loans.promiseModalTitle': { bn: 'আবার কবে মনে করাব?', en: 'Remind again when?' },
  'loans.promiseModalLabel': { bn: 'তারিখ', en: 'Date' },
  'loans.promiseModalHelp': { bn: 'আপনি নতুন করে যে দিন-সময় দেবেন বলেছেন, ঠিক তখন মনে করিয়ে দেব', en: "We'll remind you at the date & time you now promise" },
  'loans.promiseSave': { bn: 'সেট করুন', en: 'Set' },
  'loans.promiseSet': { bn: 'মনে করানোর তারিখ সেট হয়েছে', en: 'Reminder date set' },
  'loans.promiseClear': { bn: 'মুছুন', en: 'Clear' },
  'loans.promiseClearTitle': { bn: 'মনে করানোর তারিখ মুছবেন?', en: 'Clear the reminder date?' },
  'loans.promiseClearMsg': { bn: 'এই ফলো-আপ রিমাইন্ডারটি মুছে ফেলা হবে।', en: 'This follow-up reminder will be removed.' },
  'loans.promiseCleared': { bn: 'মনে করানোর তারিখ মুছে ফেলা হয়েছে', en: 'Reminder date cleared' },
  'loans.promiseReminderTitle': { bn: '{name} কে দেওয়ার প্রতিশ্রুতির দিন', en: 'Promised day to pay {name}' },
  'loans.promiseReminderDesc': { bn: '{name} কে আজ ৳{amount} দেওয়ার কথা', en: 'You promised to pay {name} ৳{amount} today' },
  'loans.promiseReminderDescGeneric': { bn: '{name} কে প্রতিশ্রুতি অনুযায়ী যোগাযোগ করুন — কিস্তি অনুযায়ী পরিশোধ চলছে', en: "Follow up with {name} per your promise — repayment is via the installment plan" },

  // WhatsApp
  'loans.waNudge': { bn: 'আসসালামু আলাইকুম {name}, আপনার ৳{amount} শীঘ্রই ফেরত দেব ইনশাআল্লাহ। ধন্যবাদ।', en: 'Hi {name}, I will repay your ৳{amount} soon. Thanks for your patience.' },

  // কিস্তি (installments)
  'loans.instCountLabel': { bn: 'কিস্তি সংখ্যা (ঐচ্ছিক)', en: 'Installments (optional)' },
  'loans.instCountPlaceholder': { bn: 'যেমন: ৪', en: 'e.g., 4' },
  'loans.instIntervalLabel': { bn: 'কত দিন/সপ্তাহ/মাস পরপর', en: 'Interval' },
  'loans.instCustomDaysPlaceholder': { bn: 'যেমন: ৪৫', en: 'e.g., 45' },
  'loans.instPreview': { bn: '{n}টি কিস্তি × ৳{per}', en: '{n} installments × ৳{per}' },
  'loans.instReminderTitle': { bn: '{name} — কিস্তি {i}/{n}', en: '{name} — installment {i}/{n}' },
  'loans.instReminderDesc': { bn: '{name} কে কিস্তি ৳{amount} দেওয়ার দিন', en: 'Pay installment of ৳{amount} to {name}' },
  'loans.instCreated': { bn: '{n}টি কিস্তির রিমাইন্ডার তৈরি হয়েছে', en: '{n} installment reminders created' },
  'loans.promiseHiddenNote': { bn: 'কিস্তি প্ল্যান থাকলে আলাদা প্রতিশ্রুতির তারিখ দরকার নেই — প্রতিটি কিস্তির নিজস্ব তারিখ আছে', en: "No separate promised date needed with an installment plan — each installment has its own date" },
  'loans.instPlanSummary': { bn: 'কিস্তি পরিকল্পনা: {n}টি রিমাইন্ডার সক্রিয়', en: 'Installment plan: {n} reminders active' },
  'loans.instCancelPlan': { bn: 'পরিকল্পনা বাতিল করুন', en: 'Cancel plan' },
  'loans.instCancelTitle': { bn: 'কিস্তি পরিকল্পনা বাতিল করবেন?', en: 'Cancel installment plan?' },
  'loans.instCancelMsg': { bn: '{n}টি কিস্তির রিমাইন্ডার মুছে ফেলা হবে। এটি ফেরানো যাবে না।', en: 'All {n} installment reminders will be deleted. This cannot be undone.' },
  'loans.instCancelled': { bn: 'কিস্তি পরিকল্পনা বাতিল করা হয়েছে', en: 'Installment plan cancelled' },
  'loans.instCancelError': { bn: 'পরিকল্পনা বাতিল করতে সমস্যা হয়েছে', en: 'Failed to cancel the plan' },
}
