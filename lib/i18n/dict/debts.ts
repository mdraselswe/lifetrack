import type { Dict } from './types'

export const debts: Dict = {
  // Page chrome
  'debts.title': { bn: 'ধার দিয়েছি', en: 'Lent' },
  'debts.subtitle': { bn: 'আপনার পাওনা', en: 'What you are owed' },
  'debts.statOutstanding': { bn: 'বাকি পাওনা', en: 'Outstanding' },
  'debts.receivedBack': { bn: 'ফেরত পেয়েছি', en: 'Received back' },
  'debts.sectionActive': { bn: 'বাকি আছে', en: 'Outstanding' },

  // Empty state
  'debts.emptyTitle': { bn: 'কোনো ধার নেই', en: 'No debts yet' },
  'debts.emptyDesc': { bn: 'এখনো কাউকে টাকা ধার দেননি', en: 'You have not lent money to anyone yet' },
  'debts.addFirst': { bn: 'প্রথম ধার যোগ করুন', en: 'Add your first debt' },
  'debts.addNew': { bn: 'নতুন ধার যোগ করুন', en: 'Add new debt' },

  // Card labels
  'debts.total': { bn: 'মোট', en: 'Total' },
  'debts.paid': { bn: 'পরিশোধিত', en: 'Paid' },
  'debts.remaining': { bn: 'বাকি', en: 'Remaining' },
  'debts.paymentHistory': { bn: 'পরিশোধের ইতিহাস', en: 'Payment history' },
  'debts.initialDebt': { bn: 'প্রাথমিক ধার', en: 'Initial debt' },
  'debts.increases': { bn: 'পরিমাণ বৃদ্ধি', en: 'Amount increases' },
  'debts.settledSummary': { bn: 'মোট ৳{total} · পরিশোধ ৳{paid}', en: 'Total ৳{total} · Paid ৳{paid}' },

  // Buttons
  'debts.increaseBtn': { bn: 'বৃদ্ধি', en: 'Increase' },
  'debts.markPaid': { bn: 'পরিশোধিত চিহ্নিত করুন', en: 'Mark as paid' },
  'debts.update': { bn: 'আপডেট', en: 'Update' },
  'debts.confirmReceived': { bn: 'ফেরত পেয়েছি', en: 'Received' },
  'debts.confirmNotReceived': { bn: 'ফেরত পাইনি', en: 'Not received' },

  // Form fields
  'debts.personName': { bn: 'ব্যক্তির নাম', en: "Person's name" },
  'debts.personNamePlaceholder': { bn: 'যেমন: আলী', en: 'e.g., Ali' },
  'debts.amountLabel': { bn: 'পরিমাণ (৳)', en: 'Amount (৳)' },
  'debts.zeroPlaceholder': { bn: '০', en: '0' },
  'debts.initialReasonOptional': { bn: 'প্রাথমিক কারণ (ঐচ্ছিক)', en: 'Initial reason (optional)' },
  'debts.reasonOptional': { bn: 'কারণ (ঐচ্ছিক)', en: 'Reason (optional)' },
  'debts.noteOptional': { bn: 'নোট (ঐচ্ছিক)', en: 'Note (optional)' },
  'debts.reasonPlaceholder': { bn: 'যেমন: জরুরি প্রয়োজন', en: 'e.g., emergency need' },
  'debts.partialPaymentPlaceholder': { bn: 'যেমন: আংশিক পরিশোধ', en: 'e.g., partial payment' },
  'debts.partialReturnPlaceholder': { bn: 'যেমন: আংশিক ফেরত', en: 'e.g., partial return' },
  'debts.increaseReasonPlaceholder': { bn: 'যেমন: অতিরিক্ত প্রয়োজন', en: 'e.g., additional need' },
  'debts.increaseAmountLabel': { bn: 'বৃদ্ধির পরিমাণ (৳)', en: 'Increase amount (৳)' },
  'debts.howMuchReceived': { bn: 'কত টাকা ফেরত পেলেন?', en: 'How much did you receive back?' },
  'debts.fullReturnChip': { bn: 'সম্পূর্ণ ৳{amount} ফেরত', en: 'Full return of ৳{amount}' },
  'debts.fullPaymentNote': { bn: 'সম্পূর্ণ পরিশোধ', en: 'Full payment' },

  // Return due date & auto reminder
  'debts.dueDateOptional': { bn: 'ফেরতের তারিখ (ঐচ্ছিক)', en: 'Return due date (optional)' },
  'debts.dueReminderTitle': { bn: 'ধার ফেরত: {name}', en: 'Debt due: {name}' },
  'debts.dueReminderDesc': { bn: '{name}-এর কাছ থেকে ৳{amount} ফেরত নেওয়ার কথা ({date})', en: 'Collect ৳{amount} from {name} (due {date})' },
  'debts.dueReminderCreated': { bn: 'ফেরতের রিমাইন্ডার তৈরি হয়েছে', en: 'Return reminder created' },

  // Modal titles
  'debts.editTitle': { bn: 'ধার সম্পাদনা করুন', en: 'Edit debt' },
  'debts.editPaymentTitle': { bn: 'পেমেন্ট সম্পাদনা করুন', en: 'Edit payment' },
  'debts.editIncreaseTitle': { bn: 'পরিমাণ বৃদ্ধি সম্পাদনা করুন', en: 'Edit amount increase' },

  // Validation errors
  'debts.errNameAmount': { bn: 'নাম এবং পরিমাণ দিন', en: 'Enter a name and amount' },
  'debts.errValidAmount': { bn: 'সঠিক পরিমাণ দিন', en: 'Enter a valid amount' },
  'debts.errAmountDate': { bn: 'পরিমাণ এবং তারিখ প্রয়োজন', en: 'Amount and date are required' },
  'debts.errExceedsRemaining': { bn: 'বাকি পরিমাণ: ৳{remaining}. তার চেয়ে বেশি পরিশোধ করা যাবে না।', en: 'Remaining amount: ৳{remaining}. You cannot pay more than that.' },
  'debts.errLessThanPaid': { bn: 'মোট পরিশোধিত পরিমাণ: ৳{paid}. নতুন পরিমাণ তার চেয়ে কম হতে পারবে না।', en: 'Total paid: ৳{paid}. The new amount cannot be less than that.' },

  // Add debt
  'debts.addSuccess': { bn: 'ধার সফলভাবে যোগ করা হয়েছে', en: 'Debt added successfully' },
  'debts.addError': { bn: 'ধার যোগ করতে সমস্যা হয়েছে', en: 'Failed to add debt' },

  // Delete debt
  'debts.deleteTitle': { bn: 'ধার মুছুন', en: 'Delete debt' },
  'debts.deleteMsg': { bn: '{name} এর {amount} টাকার ধার মুছে ফেলবেন?', en: "Delete {name}'s debt of ৳{amount}?" },
  'debts.deleteSuccess': { bn: 'ধার সফলভাবে মুছে ফেলা হয়েছে', en: 'Debt deleted successfully' },
  'debts.deleteError': { bn: 'ধার মুছতে সমস্যা হয়েছে', en: 'Failed to delete debt' },

  // Toggle returned status
  'debts.statusTitle': { bn: 'ধারের অবস্থা পরিবর্তন করুন', en: 'Change debt status' },
  'debts.statusConfirmReceived': { bn: '{name} এর {amount} টাকার ধার ফেরত পেয়েছেন হিসেবে চিহ্নিত করবেন?', en: "Mark {name}'s debt of ৳{amount} as returned?" },
  'debts.statusConfirmNotReceived': { bn: '{name} এর {amount} টাকার ধার ফেরত পাননি হিসেবে চিহ্নিত করবেন?', en: "Mark {name}'s debt of ৳{amount} as not returned?" },
  'debts.statusMarkedReceived': { bn: 'ধার ফেরত পেয়েছেন হিসেবে চিহ্নিত করা হয়েছে', en: 'Debt marked as returned' },
  'debts.statusMarkedNotReceived': { bn: 'ধার ফেরত পাননি হিসেবে চিহ্নিত করা হয়েছে', en: 'Debt marked as not returned' },
  'debts.statusError': { bn: 'ধারের অবস্থা পরিবর্তন করতে সমস্যা হয়েছে', en: 'Failed to change debt status' },
  'debts.celebratePaid': { bn: '{name} সব ফেরত দিয়েছে!', en: '{name} paid you back in full!' },

  // Update debt
  'debts.updateTitle': { bn: 'ধার আপডেট করুন', en: 'Update debt' },
  'debts.updateConfirmMsg': { bn: '{name} এর ধারের তথ্য আপডেট করবেন?', en: "Update {name}'s debt details?" },
  'debts.updateSuccess': { bn: 'ধার সফলভাবে আপডেট করা হয়েছে', en: 'Debt updated successfully' },
  'debts.updateError': { bn: 'ধার আপডেট করতে সমস্যা হয়েছে', en: 'Failed to update debt' },

  // Payments
  'debts.paymentAddSuccess': { bn: 'পেমেন্ট সফলভাবে যোগ করা হয়েছে', en: 'Payment added successfully' },
  'debts.paymentAddError': { bn: 'পেমেন্ট যোগ করতে সমস্যা হয়েছে', en: 'Failed to add payment' },
  'debts.paymentDeleteTitle': { bn: 'পেমেন্ট মুছুন', en: 'Delete payment' },
  'debts.paymentDeleteMsg': { bn: '{amount} টাকার পেমেন্ট মুছে ফেলবেন?', en: 'Delete the payment of ৳{amount}?' },
  'debts.paymentDeleteSuccess': { bn: 'পেমেন্ট সফলভাবে মুছে ফেলা হয়েছে', en: 'Payment deleted successfully' },
  'debts.paymentDeleteError': { bn: 'পেমেন্ট মুছতে সমস্যা হয়েছে', en: 'Failed to delete payment' },
  'debts.paymentUpdateTitle': { bn: 'পেমেন্ট আপডেট করুন', en: 'Update payment' },
  'debts.paymentUpdateMsg': { bn: '{amount} টাকার পেমেন্ট আপডেট করবেন?', en: 'Update the payment of ৳{amount}?' },
  'debts.paymentUpdateSuccess': { bn: 'পেমেন্ট সফলভাবে আপডেট করা হয়েছে', en: 'Payment updated successfully' },
  'debts.paymentUpdateError': { bn: 'পেমেন্ট আপডেট করতে সমস্যা হয়েছে', en: 'Failed to update payment' },

  // Amount increases
  'debts.increaseTitle': { bn: 'ধারের পরিমাণ বৃদ্ধি করুন', en: 'Increase debt amount' },
  'debts.increaseConfirmMsg': { bn: '{name} এর ধারের পরিমাণ ৳{from} থেকে ৳{to} বৃদ্ধি করবেন?', en: "Increase {name}'s debt amount from ৳{from} to ৳{to}?" },
  'debts.increaseSuccess': { bn: 'ধারের পরিমাণ বৃদ্ধি করা হয়েছে', en: 'Debt amount increased' },
  'debts.increaseError': { bn: 'ধারের পরিমাণ বৃদ্ধি করতে সমস্যা হয়েছে', en: 'Failed to increase debt amount' },
  'debts.increaseDeleteTitle': { bn: 'পরিমাণ বৃদ্ধি মুছুন', en: 'Delete amount increase' },
  'debts.increaseDeleteMsg': { bn: '{amount} টাকার পরিমাণ বৃদ্ধি মুছে ফেলবেন? ধারের পরিমাণ ৳{from} থেকে ৳{to} হবে।', en: 'Delete the amount increase of ৳{amount}? The debt amount will change from ৳{from} to ৳{to}.' },
  'debts.increaseDeleteSuccess': { bn: 'পরিমাণ বৃদ্ধি সফলভাবে মুছে ফেলা হয়েছে', en: 'Amount increase deleted successfully' },
  'debts.increaseDeleteError': { bn: 'পরিমাণ বৃদ্ধি মুছতে সমস্যা হয়েছে', en: 'Failed to delete amount increase' },
  'debts.increaseUpdateTitle': { bn: 'পরিমাণ বৃদ্ধি আপডেট করুন', en: 'Update amount increase' },
  'debts.increaseUpdateMsg': { bn: '{amount} টাকার পরিমাণ বৃদ্ধি আপডেট করবেন?', en: 'Update the amount increase of ৳{amount}?' },
  'debts.increaseUpdateSuccess': { bn: 'পরিমাণ বৃদ্ধি সফলভাবে আপডেট করা হয়েছে', en: 'Amount increase updated successfully' },
  'debts.increaseUpdateError': { bn: 'পরিমাণ বৃদ্ধি আপডেট করতে সমস্যা হয়েছে', en: 'Failed to update amount increase' },
  'debts.errOverpay': { bn: 'বাকির চেয়ে বেশি দেওয়া যাবে না (বাকি ৳{remaining})', en: 'Cannot exceed the remaining amount (৳{remaining} due)' },

  // Due date help + form chrome
  'debts.dueDateHelp': { bn: 'আপনি যে ডেডলাইন ঠিক করেছেন', en: 'The deadline you set' },
  'debts.moreOptions': { bn: 'আরও অপশন', en: 'More options' },
  'debts.lessOptions': { bn: 'কম অপশন', en: 'Fewer options' },
  'debts.errDueBeforeDate': { bn: 'ফেরতের তারিখ, ধার দেওয়ার তারিখের আগে হতে পারবে না', en: 'Due date cannot be before the date given' },
  'debts.errPromiseBeforeDate': { bn: 'তারিখ, ধার দেওয়ার তারিখের আগে হতে পারবে না', en: 'Date cannot be before the date given' },
  'debts.intervalWeekly': { bn: 'সাপ্তাহিক', en: 'Weekly' },
  'debts.intervalMonthly': { bn: 'মাসিক', en: 'Monthly' },
  'debts.intervalCustom': { bn: 'কাস্টম', en: 'Custom' },

  // Follow-up reminder for when the money is due back (card action, not a form field)
  'debts.promiseCta': { bn: 'ফেরতের রিমাইন্ডার', en: 'Repayment reminder' },
  'debts.promiseChip': { bn: 'মনে করাব: {date}', en: 'Reminder: {date}' },
  'debts.promiseModalTitle': { bn: 'কবে মনে করিয়ে দেব?', en: 'When should I remind you?' },
  'debts.promiseModalLabel': { bn: 'তারিখ ও সময়', en: 'Date & time' },
  'debts.promiseModalHelp': { bn: 'যে দিন-সময়ে ফেরত পাওয়ার কথা, ঠিক তখন মনে করিয়ে দেব', en: "We'll remind you exactly when the money is due back" },
  'debts.promiseSave': { bn: 'সেট করুন', en: 'Set' },
  'debts.promiseSet': { bn: 'মনে করানোর তারিখ সেট হয়েছে', en: 'Reminder date set' },
  'debts.promiseClear': { bn: 'মুছুন', en: 'Clear' },
  'debts.promiseClearTitle': { bn: 'মনে করানোর তারিখ মুছবেন?', en: 'Clear the reminder date?' },
  'debts.promiseClearMsg': { bn: 'এই ফলো-আপ রিমাইন্ডারটি মুছে ফেলা হবে।', en: 'This follow-up reminder will be removed.' },
  'debts.promiseCleared': { bn: 'মনে করানোর তারিখ মুছে ফেলা হয়েছে', en: 'Reminder date cleared' },
  'debts.promiseReminderTitle': { bn: '{name} এর প্রতিশ্রুতির দিন', en: "{name}'s promised day" },
  'debts.promiseReminderDesc': { bn: '{name} আজ ৳{amount} দেওয়ার কথা', en: '{name} promised to pay ৳{amount} today' },
  'debts.promiseReminderDescGeneric': { bn: '{name}-এর সাথে প্রতিশ্রুতি অনুযায়ী যোগাযোগ করুন — কিস্তি অনুযায়ী পরিশোধ চলছে', en: "Follow up with {name} per their promise — repayment is via the installment plan" },

  // WhatsApp তাগাদা
  'debts.waNudge': { bn: 'আসসালামু আলাইকুম {name}, আপনার কাছে আমার ৳{amount} পাওনা আছে। সুবিধামতো ফেরত দিলে উপকার হয়। ধন্যবাদ।', en: 'Hi {name}, a friendly reminder that ৳{amount} is due to me. Please repay when convenient. Thanks.' },

  // কিস্তি (installments)
  'debts.instCountLabel': { bn: 'কিস্তি সংখ্যা (ঐচ্ছিক)', en: 'Installments (optional)' },
  'debts.instCountPlaceholder': { bn: 'যেমন: ৪', en: 'e.g., 4' },
  'debts.instIntervalLabel': { bn: 'কত দিন/সপ্তাহ/মাস পরপর', en: 'Interval' },
  'debts.instCustomDaysPlaceholder': { bn: 'যেমন: ৪৫', en: 'e.g., 45' },
  'debts.instPreview': { bn: '{n}টি কিস্তি × ৳{per}', en: '{n} installments × ৳{per}' },
  'debts.instReminderTitle': { bn: '{name} — কিস্তি {i}/{n}', en: '{name} — installment {i}/{n}' },
  'debts.instReminderDesc': { bn: '{name} এর কাছ থেকে কিস্তি ৳{amount} নেওয়ার দিন', en: 'Collect installment of ৳{amount} from {name}' },
  'debts.instCreated': { bn: '{n}টি কিস্তির রিমাইন্ডার তৈরি হয়েছে', en: '{n} installment reminders created' },
  'debts.promiseHiddenNote': { bn: 'কিস্তি প্ল্যান থাকলে আলাদা প্রতিশ্রুতির তারিখ দরকার নেই — প্রতিটি কিস্তির নিজস্ব তারিখ আছে', en: "No separate promised date needed with an installment plan — each installment has its own date" },
  'debts.instPlanSummary': { bn: 'কিস্তি পরিকল্পনা: {n}টি রিমাইন্ডার সক্রিয়', en: 'Installment plan: {n} reminders active' },
  'debts.instCancelPlan': { bn: 'পরিকল্পনা বাতিল করুন', en: 'Cancel plan' },
  'debts.instCancelTitle': { bn: 'কিস্তি পরিকল্পনা বাতিল করবেন?', en: 'Cancel installment plan?' },
  'debts.instCancelMsg': { bn: '{n}টি কিস্তির রিমাইন্ডার মুছে ফেলা হবে। এটি ফেরানো যাবে না।', en: 'All {n} installment reminders will be deleted. This cannot be undone.' },
  'debts.instCancelled': { bn: 'কিস্তি পরিকল্পনা বাতিল করা হয়েছে', en: 'Installment plan cancelled' },
  'debts.instCancelError': { bn: 'পরিকল্পনা বাতিল করতে সমস্যা হয়েছে', en: 'Failed to cancel the plan' },
}
