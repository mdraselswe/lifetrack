import type { Dict } from './types'

export const reminders: Dict = {
  // Page
  'reminders.subtitle': { bn: 'সময়মতো মনে করিয়ে দেবে', en: 'Get reminded on time' },
  'reminders.active': { bn: 'সক্রিয়', en: 'Active' },
  'reminders.completed': { bn: 'সম্পন্ন', en: 'Completed' },
  'reminders.markDone': { bn: 'সম্পন্ন', en: 'Done' },
  'reminders.history': { bn: 'ইতিহাস', en: 'History' },
  'reminders.activate': { bn: 'সক্রিয় করুন', en: 'Activate' },
  'reminders.update': { bn: 'আপডেট', en: 'Update' },
  'reminders.repetitiveChip': { bn: 'একাধিকবার', en: 'Repeating' },
  'reminders.timesCompleted': { bn: '✓ {count} বার সম্পন্ন', en: '✓ Completed {count} times' },

  // Empty state
  'reminders.emptyTitle': { bn: 'কোনো রিমাইন্ডার নেই', en: 'No reminders' },
  'reminders.emptySubtitle': { bn: 'এখনো কোনো রিমাইন্ডার সেট করেননি', en: "You haven't set any reminders yet" },
  'reminders.addFirst': { bn: 'প্রথম রিমাইন্ডার যোগ করুন', en: 'Add your first reminder' },
  'reminders.addNew': { bn: 'নতুন রিমাইন্ডার যোগ করুন', en: 'Add new reminder' },

  // Add / edit modal
  'reminders.newTitle': { bn: 'নতুন রিমাইন্ডার', en: 'New reminder' },
  'reminders.editTitle': { bn: 'রিমাইন্ডার সম্পাদনা করুন', en: 'Edit reminder' },
  'reminders.fieldTitle': { bn: 'শিরোনাম', en: 'Title' },
  'reminders.titlePlaceholder': { bn: 'যেমন: ওষুধ খাওয়া', en: 'e.g., Take medicine' },
  'reminders.fieldDescription': { bn: 'বিবরণ (ঐচ্ছিক)', en: 'Description (optional)' },
  'reminders.descriptionPlaceholder': { bn: 'অতিরিক্ত বিবরণ', en: 'Additional details' },
  'reminders.fieldTime': { bn: 'সময়', en: 'Time' },
  'reminders.repetitiveLabel': { bn: 'একাধিকবার সম্পন্ন করব (ইতিহাস রাখা হবে)', en: 'Complete multiple times (history will be kept)' },
  'reminders.repeatDays': { bn: 'দিন', en: 'Days' },
  'reminders.repeatWeeks': { bn: 'সপ্তাহ', en: 'Weeks' },
  'reminders.repeatMonths': { bn: 'মাস', en: 'Months' },

  // Form / toast messages
  'reminders.titleTimeRequired': { bn: 'শিরোনাম এবং সময় দিন', en: 'Enter a title and time' },
  'reminders.timeRequired': { bn: 'সময় দিন', en: 'Enter a time' },
  'reminders.updated': { bn: 'রিমাইন্ডার সফলভাবে আপডেট করা হয়েছে!', en: 'Reminder updated successfully!' },
  'reminders.created': { bn: 'রিমাইন্ডার সফলভাবে সেট করা হয়েছে!', en: 'Reminder set successfully!' },
  'reminders.saveError': { bn: 'রিমাইন্ডার সংরক্ষণ করতে সমস্যা হয়েছে', en: 'Failed to save the reminder' },
  'reminders.notifPermission': { bn: 'নোটিফিকেশন পাঠাতে পারমিশন দিন', en: 'Allow permission to send notifications' },
  'reminders.notifPermissionHint': { bn: 'ব্রাউজার সেটিংস থেকে নোটিফিকেশন পারমিশন দিন', en: 'Enable notification permission in your browser settings' },
  'reminders.backgroundInfo': { bn: 'নোটিফিকেশন ব্যাকগ্রাউন্ডে কাজ করবে (ব্রাউজার বন্ধ থাকলেও)', en: 'Notifications will work in the background (even when the browser is closed)' },
  'reminders.keepBrowserOpen': { bn: 'ব্রাউজার খোলা রাখুন নোটিফিকেশনের জন্য', en: 'Keep the browser open for notifications' },
  'reminders.notifNotSupported': { bn: 'এই ব্রাউজার নোটিফিকেশন সাপোর্ট করে না', en: 'This browser does not support notifications' },

  // Delete reminder
  'reminders.deleteTitle': { bn: 'রিমাইন্ডার মুছুন', en: 'Delete reminder' },
  'reminders.deleteConfirm': { bn: '"{title}" রিমাইন্ডার মুছে ফেলবেন?', en: 'Delete the reminder "{title}"?' },
  'reminders.deleted': { bn: 'রিমাইন্ডার সফলভাবে মুছে ফেলা হয়েছে', en: 'Reminder deleted successfully' },

  // Toggle active/dismissed
  'reminders.toggleTitle': { bn: 'রিমাইন্ডার অবস্থা পরিবর্তন করুন', en: 'Change reminder status' },
  'reminders.markDismissedConfirm': { bn: '"{title}" রিমাইন্ডার সম্পন্ন হিসেবে চিহ্নিত করবেন?', en: 'Mark the reminder "{title}" as completed?' },
  'reminders.markActiveConfirm': { bn: '"{title}" রিমাইন্ডার আবার সক্রিয় করবেন?', en: 'Mark the reminder "{title}" as active?' },
  'reminders.markedDismissed': { bn: 'রিমাইন্ডার সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে', en: 'Reminder marked as completed' },
  'reminders.markedActive': { bn: 'রিমাইন্ডার আবার সক্রিয় করা হয়েছে', en: 'Reminder marked as active' },
  'reminders.confirmDismiss': { bn: 'সম্পন্ন করি', en: 'Mark completed' },
  'reminders.confirmActivate': { bn: 'সক্রিয় করি', en: 'Activate' },

  // Completion modal
  'reminders.completeModalTitle': { bn: '{title} — সম্পন্ন', en: '{title} — Done' },
  'reminders.completeTitle': { bn: 'সম্পন্ন করুন', en: 'Mark as done' },
  'reminders.previouslyCompleted': { bn: 'পূর্বে {count} বার সম্পন্ন হয়েছে', en: 'Previously completed {count} times' },
  'reminders.whenCompleted': { bn: 'কখন সম্পন্ন করেছেন?', en: 'When did you complete it?' },
  'reminders.completedToast': { bn: '"{title}" সম্পন্ন! {count} বার সম্পন্ন হয়েছে।', en: '"{title}" done! Completed {count} times.' },

  // Occurrence (completion record) editing
  'reminders.editOccurrenceTitle': { bn: 'সম্পন্নের সময় সম্পাদনা', en: 'Edit completion time' },
  'reminders.completedDateTime': { bn: 'সম্পন্ন তারিখ/সময়', en: 'Completion date/time' },
  'reminders.occurrenceUpdated': { bn: 'সম্পন্নের তারিখ/সময় আপডেট করা হয়েছে', en: 'Completion date/time updated' },
  'reminders.deleteOccurrenceTitle': { bn: 'সম্পন্নের রেকর্ড মুছুন', en: 'Delete completion record' },
  'reminders.deleteOccurrenceConfirm': { bn: 'এই সম্পন্নের রেকর্ড মুছে ফেলবেন? তারিখ: {date}', en: 'Delete this completion record? Date: {date}' },
  'reminders.occurrenceDeleted': { bn: 'সম্পন্নের রেকর্ড মুছে ফেলা হয়েছে', en: 'Completion record deleted' },

  // History modal
  'reminders.historyModalTitle': { bn: '{title} — ইতিহাস', en: '{title} — History' },
  'reminders.totalCompleted': { bn: 'মোট সম্পন্ন: {count} বার', en: 'Total completed: {count} times' },
  'reminders.noOccurrences': { bn: 'এখনো কোনো সম্পন্নের রেকর্ড নেই', en: 'No completion records yet' },

  // Reschedule modal
  'reminders.rescheduleTitle': { bn: 'আবার মনে করিয়ে দিন', en: 'Remind me again' },
  'reminders.rescheduleLabel': { bn: 'কত ঘন্টা পরে আবার রিমাইন্ডার দিতে চান?', en: 'After how many hours should the reminder repeat?' },
  'reminders.reschedulePlaceholder': { bn: 'যেমন: ১', en: 'e.g., 1' },
  'reminders.setButton': { bn: 'নির্ধারণ করুন', en: 'Set' },
  'reminders.invalidHours': { bn: 'সঠিক ঘন্টা সংখ্যা দিন', en: 'Enter a valid number of hours' },
  'reminders.rescheduled': { bn: 'রিমাইন্ডার পুনঃনির্ধারণ করা হয়েছে', en: 'Reminder rescheduled' },
  'reminders.pushTitle': { bn: 'নোটিফিকেশন চালু করুন', en: 'Enable notifications' },
  'reminders.pushDesc': { bn: 'অ্যাপ বন্ধ থাকলেও রিমাইন্ডার নোটিফিকেশন পাবেন', en: 'Get reminders even when the app is closed' },
  'reminders.pushEnable': { bn: 'চালু করুন', en: 'Enable' },
  'reminders.pushEnabled': { bn: 'নোটিফিকেশন চালু হয়েছে', en: 'Notifications enabled' },
  'reminders.pushBlocked': { bn: 'নোটিফিকেশন ব্লক করা আছে। ব্রাউজার সেটিংস থেকে অনুমতি দিন', en: 'Notifications are blocked. Allow them in browser settings' },
  'reminders.pushError': { bn: 'নোটিফিকেশন চালু করতে সমস্যা হয়েছে', en: 'Could not enable notifications' },

  // Active list time-group headers
  'reminders.groupOverdue': { bn: 'মেয়াদোত্তীর্ণ', en: 'Overdue' },
  'reminders.groupToday': { bn: 'আজ', en: 'Today' },
  'reminders.groupTomorrow': { bn: 'আগামীকাল', en: 'Tomorrow' },
  'reminders.groupUpcoming': { bn: 'পরে', en: 'Upcoming' },
  'reminders.finish': { bn: 'শেষ করুন', en: 'Finish' },
  'reminders.finishTitle': { bn: 'রিমাইন্ডার শেষ করবেন?', en: 'Finish this reminder?' },
  'reminders.finishMessage': { bn: '"{title}" আর রিপিট হবে না। ইতিহাস সংরক্ষিত থাকবে।', en: '"{title}" will stop repeating. Its history will be kept.' },
  'reminders.finishConfirm': { bn: 'শেষ করুন', en: 'Finish' },
  'reminders.finished': { bn: 'রিমাইন্ডার শেষ করা হয়েছে', en: 'Reminder finished' },
  'reminders.finishError': { bn: 'শেষ করতে সমস্যা হয়েছে', en: 'Could not finish reminder' },

  // Voice input
  'reminders.voiceInput': { bn: 'ভয়েস দিয়ে লিখুন', en: 'Voice input' },
  'reminders.voiceError': { bn: 'ভয়েস শোনা যায়নি — আবার চেষ্টা করুন', en: 'Could not hear you — try again' },
}
