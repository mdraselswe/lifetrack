import type { Dict } from './types'

export const statement: Dict = {
  'statement.title': { bn: 'স্টেটমেন্ট', en: 'Statement' },
  'statement.subtitle': { bn: 'সময়সীমা অনুযায়ী হিসাব', en: 'Account by date range' },

  // Range picker
  'statement.from': { bn: 'শুরু', en: 'From' },
  'statement.to': { bn: 'শেষ', en: 'To' },
  'statement.presetThisMonth': { bn: 'এই মাস', en: 'This month' },
  'statement.presetLastMonth': { bn: 'গত মাস', en: 'Last month' },
  'statement.presetThisYear': { bn: 'এই বছর', en: 'This year' },
  'statement.presetAll': { bn: 'সব সময়', en: 'All time' },
  'statement.rangeError': { bn: 'শুরুর তারিখ শেষের চেয়ে পরে হতে পারে না', en: 'Start date cannot be after end date' },
  'statement.loadError': { bn: 'স্টেটমেন্ট তৈরি করতে সমস্যা হয়েছে', en: 'Failed to build statement' },

  // Summary
  'statement.summaryTitle': { bn: 'সারসংক্ষেপ', en: 'Summary' },
  'statement.moneyIn': { bn: 'মোট এসেছে', en: 'Money in' },
  'statement.moneyOut': { bn: 'মোট গেছে', en: 'Money out' },
  'statement.net': { bn: 'নেট', en: 'Net' },
  'statement.lent': { bn: 'ধার দিয়েছি', en: 'Lent' },
  'statement.received': { bn: 'ফেরত পেয়েছি', en: 'Received' },
  'statement.borrowed': { bn: 'ধার নিয়েছি', en: 'Borrowed' },
  'statement.repaid': { bn: 'ফেরত দিয়েছি', en: 'Repaid' },

  // Per-person table
  'statement.person': { bn: 'ব্যক্তি', en: 'Person' },
  'statement.perPersonTitle': { bn: 'ব্যক্তি অনুযায়ী', en: 'By person' },
  'statement.events': { bn: 'লেনদেন', en: 'entries' },

  // Empty / actions
  'statement.empty': { bn: 'এই সময়সীমায় কোনো লেনদেন নেই', en: 'No transactions in this range' },
  'statement.download': { bn: 'পিডিএফ ডাউনলোড', en: 'Download PDF' },
  'statement.generating': { bn: 'তৈরি হচ্ছে…', en: 'Generating…' },
  'statement.pdfError': { bn: 'পিডিএফ তৈরি করতে সমস্যা হয়েছে', en: 'Failed to generate PDF' },
  'statement.generatedAt': { bn: 'তৈরি হয়েছে', en: 'Generated' },
  'statement.account': { bn: 'অ্যাকাউন্ট', en: 'Account' },
  'statement.period': { bn: 'সময়সীমা', en: 'Period' },
}
