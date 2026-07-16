import type { Dict } from './types'

// Person profile page (/person/[name]) — net position, contact actions,
// repayment behavior and unified timeline for a single person.
export const person: Dict = {
  'person.subtitle': { bn: 'ব্যক্তিগত লেনদেনের হিসাব', en: 'Person profile' },

  // Net position hero
  'person.theyOwe': { bn: 'আপনি পাবেন', en: 'They owe you' },
  'person.youOwe': { bn: 'আপনি দেবেন', en: 'You owe them' },
  'person.net': { bn: 'নেট ব্যালেন্স', en: 'Net balance' },
  'person.netPositive': { bn: 'মোট হিসাবে আপনি ৳{amount} পাবেন', en: 'Overall, you are owed ৳{amount}' },
  'person.netNegative': { bn: 'মোট হিসাবে আপনি ৳{amount} দেবেন', en: 'Overall, you owe ৳{amount}' },
  'person.netSettled': { bn: 'সব হিসাব মিটে গেছে', en: 'All settled up' },

  // Contact actions
  'person.call': { bn: 'কল করুন', en: 'Call' },
  'person.whatsapp': { bn: 'WhatsApp', en: 'WhatsApp' },
  'person.waTemplate': {
    bn: 'আসসালামু আলাইকুম {name}, আপনার কাছে আমার ৳{amount} পাওনা আছে। সুবিধামতো ফেরত দেওয়ার ব্যবস্থা করলে ভালো হয়। ধন্যবাদ।',
    en: 'Hi {name}, a friendly reminder that ৳{amount} is outstanding with you. Please arrange the return at your convenience. Thank you.',
  },

  // Repayment behavior
  'person.behaviorTitle': { bn: 'ফেরত দেওয়ার ধরন', en: 'Repayment behavior' },
  'person.totalTransactions': { bn: 'মোট লেনদেন', en: 'Total records' },
  'person.onTime': { bn: 'সময়মতো', en: 'On time' },
  'person.late': { bn: 'দেরিতে', en: 'Late' },
  'person.avgDelayLate': { bn: 'গড়ে {days} দিন দেরিতে ফেরত দেয়', en: 'Repays {days} days late on average' },
  'person.avgDelayEarly': { bn: 'গড়ে {days} দিন আগে ফেরত দেয়', en: 'Repays {days} days early on average' },
  'person.avgOnTime': { bn: 'গড়ে সময়মতো ফেরত দেয়', en: 'Repays on time on average' },
  'person.noBehaviorData': { bn: 'ফেরতের তারিখের তথ্য নেই — হিসাবে ফেরতের তারিখ দিলে এখানে বিশ্লেষণ দেখা যাবে', en: 'No due-date data yet — add due dates to records to see repayment insights here' },
  'person.behaviorHint': { bn: 'ফেরতের তারিখ দেওয়া কোনো হিসাব পরিশোধ হলে এখানে সময়মতো/দেরির হিসাব দেখাবে', en: 'On-time/late stats appear once a record with a due date is settled' },
  'person.settled': { bn: 'সম্পন্ন', en: 'Settled' },
  'person.active': { bn: 'চলমান', en: 'Active' },
  'person.overdue': { bn: 'মেয়াদোত্তীর্ণ', en: 'Overdue' },

  // Timeline
  'person.timelineTitle': { bn: 'টাইমলাইন', en: 'Timeline' },
  'person.evLent': { bn: 'ধার দিয়েছি', en: 'Money lent' },
  'person.evDebtPayment': { bn: 'ফেরত পেয়েছি', en: 'Payment received' },
  'person.evBorrowed': { bn: 'ধার নিয়েছি', en: 'Money borrowed' },
  'person.evLoanPayment': { bn: 'ফেরত দিয়েছি', en: 'Payment made' },
  'person.evIncrease': { bn: 'বৃদ্ধি', en: 'Increase' },

  // Empty state
  'person.empty': { bn: 'এই ব্যক্তির কোনো হিসাব পাওয়া যায়নি', en: 'No records found for this person' },
}
