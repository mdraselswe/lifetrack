'use client'

import { useState, type ReactNode } from 'react'
import AppBar from '@/components/AppBar'
import {
  HomeIcon, ArrowUpRightIcon, ArrowDownLeftIcon, ClockIcon, WalletIcon,
  UserIcon, FileTextIcon, KeyIcon, DownloadIcon, SettingsIcon, HelpIcon,
  ChevronDownIcon,
} from '@/components/Icons'
import { t, useLang, type Lang } from '@/lib/i18n'

// Bilingual string.
type L = { bn: string; en: string }
interface Section {
  id: string
  icon: ReactNode
  title: L
  intro: L
  steps: L[]
  tips?: L[]
}

const SECTIONS: Section[] = [
  {
    id: 'start',
    icon: <HelpIcon className="w-5 h-5" />,
    title: { bn: 'শুরু করা', en: 'Getting started' },
    intro: {
      bn: 'LifeTrack দিয়ে আপনি পাওনা-দেনা, খরচ ও রিমাইন্ডার এক জায়গায় রাখতে পারবেন। সব তথ্য আপনার অ্যাকাউন্টে নিরাপদে সংরক্ষিত হয় এবং যেকোনো ডিভাইসে সিঙ্ক হয়।',
      en: 'LifeTrack keeps your money owed/borrowed, expenses and reminders in one place. Everything is saved securely to your account and syncs across devices.',
    },
    steps: [
      { bn: 'ইমেইল দিয়ে রেজিস্ট্রেশন করুন, ইনবক্সের ভেরিফিকেশন লিংকে ক্লিক করে লগইন করুন।', en: 'Register with your email, click the verification link in your inbox, then log in.' },
      { bn: 'অ্যাপটি ফোনে ইনস্টল করতে: ব্রাউজার মেনু → "Add to Home Screen"। এতে অ্যাপের মতো খুলবে ও দ্রুত চলবে।', en: 'Install the app: browser menu → "Add to Home Screen". It then opens like a native app.' },
      { bn: 'উপরের ডান কোণে ভাষা (বাংলা/EN) ও থিম (লাইট/ডার্ক) বদলাতে পারবেন।', en: 'Switch language (BN/EN) and theme (light/dark) from the top-right of any screen.' },
    ],
    tips: [
      { bn: 'নিচের নেভিগেশন বার দিয়ে ৫টি মূল অংশে যান: হোম, রিমাইন্ডার, দিয়েছি, নিয়েছি, খরচ।', en: 'Use the bottom nav for the 5 main areas: Home, Reminders, Lent, Borrowed, Expenses.' },
    ],
  },
  {
    id: 'dashboard',
    icon: <HomeIcon className="w-5 h-5" />,
    title: { bn: 'হোম / ড্যাশবোর্ড', en: 'Home / Dashboard' },
    intro: {
      bn: 'এক নজরে আপনার সার্বিক আর্থিক অবস্থা। উপরে নেট ব্যালেন্স — সব মিলিয়ে আপনি এগিয়ে আছেন নাকি দিতে হবে।',
      en: 'Your overall financial position at a glance. The top shows your net balance — whether you are ahead overall or owe.',
    },
    steps: [
      { bn: '“পাবেন” ও “দিতে হবে” কার্ডে মোট বকেয়া দেখুন।', en: 'The “To receive” and “To pay” cards show your outstanding totals.' },
      { bn: '“ধার দিয়েছি” / “ধার নিয়েছি” বোতামে দ্রুত নতুন হিসাব যোগ করুন।', en: 'Use the “I lent” / “I borrowed” buttons to quickly add a new record.' },
      { bn: 'সার্চ আইকনে নাম দিয়ে যেকোনো ব্যক্তি খুঁজুন।', en: 'Tap search and type a name to find any person.' },
      { bn: 'নিচে ইনসাইট, শেষ ৬ মাসের ট্রেন্ড ও বছরের সারাংশ দেখা যায়।', en: 'Scroll for insights, the last-6-months trend, and the year summary.' },
    ],
  },
  {
    id: 'debts',
    icon: <ArrowUpRightIcon className="w-5 h-5" />,
    title: { bn: 'ধার দিয়েছি (পাওনা)', en: 'Lent (receivables)' },
    intro: {
      bn: 'আপনি কাউকে টাকা দিলে এখানে রাখুন। প্রতিটি কার্ডে বকেয়া, পরিশোধ ও নানা অ্যাকশন থাকে।',
      en: 'Record money you gave someone. Each card shows the balance, payments, and quick actions.',
    },
    steps: [
      { bn: '“+” চেপে ব্যক্তির নাম ও পরিমাণ দিন। চাইলে ফোন নম্বর, কারণ, ও ফেরতের তারিখ যোগ করুন।', en: 'Tap “+”, enter the person’s name and amount. Optionally add a phone number, reason, and due date.' },
      { bn: 'ফেরতের তারিখ দিলে সেদিন স্বয়ংক্রিয় রিমাইন্ডার তৈরি হয়।', en: 'Adding a due date auto-creates a reminder for that day.' },
      { bn: 'আংশিক ফেরত পেলে কার্ডে “পরিশোধ” দিয়ে পরিমাণ লিখুন — বকেয়া নিজে থেকে কমবে।', en: 'Got a partial return? Use “payment” on the card — the balance updates automatically.' },
      { bn: 'পরে আরও ধার দিলে “বৃদ্ধি” দিয়ে পরিমাণ বাড়ান।', en: 'Lent more later? Use “increase” to raise the amount.' },
      { bn: 'পুরো ফেরত পেলে “পরিশোধিত চিহ্নিত করুন” চাপুন — কার্ডটি পরিশোধিত তালিকায় যাবে।', en: 'Fully repaid? Tap “Mark as paid” — the card moves to the settled list.' },
      { bn: 'ফোন নম্বর দিলে কল বা হোয়াটসঅ্যাপে তাগাদা পাঠাতে পারবেন (রেডিমেড বার্তাসহ)।', en: 'With a phone number you can call or send a WhatsApp nudge (message pre-filled).' },
    ],
    tips: [
      { bn: '“আবার মনে করিয়ে দিন” — কেউ নতুন তারিখে দেবে বললে সেই দিন-সময়ে রিমাইন্ডার সেট করুন।', en: '“Remind me again” — if they promise a new date, set a reminder for exactly then.' },
      { bn: 'কিস্তিতে ফেরত নিলে কিস্তি সংখ্যা দিন — প্রতিটি কিস্তির আলাদা রিমাইন্ডার তৈরি হবে।', en: 'For installment repayment, set the number of installments — each gets its own reminder.' },
      { bn: '“ব্যক্তি অনুযায়ী” ভিউ দিলে একই মানুষের সব হিসাব একসাথে দেখবেন; কার্ডে চাপলে তার প্রোফাইল।', en: 'Switch to “By person” to group everything per person; tap a card for their profile.' },
      { bn: 'মুছে ফেললে ট্র্যাশে যায় — ৩০ দিন ফিরিয়ে আনা যায়।', en: 'Deleted items go to Trash — restorable.' },
    ],
  },
  {
    id: 'loans',
    icon: <ArrowDownLeftIcon className="w-5 h-5" />,
    title: { bn: 'ধার নিয়েছি (দেনা)', en: 'Borrowed (payables)' },
    intro: {
      bn: 'আপনি কারও থেকে টাকা নিলে এখানে রাখুন। কাজগুলো “ধার দিয়েছি”-এর মতোই, শুধু উল্টো দিক থেকে।',
      en: 'Record money you took from someone. It works just like “Lent”, but from the other side.',
    },
    steps: [
      { bn: 'নাম ও পরিমাণ দিয়ে যোগ করুন; ফেরত দেওয়ার তারিখ দিলে রিমাইন্ডার হবে।', en: 'Add with a name and amount; a due date creates a repayment reminder.' },
      { bn: 'আংশিক ফেরত দিলে “পরিশোধ”, পুরো দিলে “ফেরত দিয়েছি” চাপুন।', en: 'Use “payment” for a partial repayment, or “Paid back” when fully repaid.' },
      { bn: 'কিস্তি, বৃদ্ধি, WhatsApp — সবই এখানে আছে।', en: 'Installments, increases, WhatsApp — all available here too.' },
    ],
  },
  {
    id: 'reminders',
    icon: <ClockIcon className="w-5 h-5" />,
    title: { bn: 'রিমাইন্ডার', en: 'Reminders' },
    intro: {
      bn: 'যেকোনো কাজের জন্য সময়মতো মনে করিয়ে দেয়। ধার/দেনার তারিখ থেকে কিছু রিমাইন্ডার নিজে থেকেই তৈরি হয়।',
      en: 'Get reminded on time for anything. Some reminders are auto-created from debt/loan due dates.',
    },
    steps: [
      { bn: '“+” চেপে শিরোনাম ও সময় দিন। চাইলে বিবরণ যোগ করুন।', en: 'Tap “+”, set a title and time. Add a description if you like.' },
      { bn: 'মাইক্রোফোন আইকনে চেপে কথা বলে শিরোনাম লিখতে পারবেন (ভয়েস ইনপুট)।', en: 'Tap the microphone to dictate the title (voice input).' },
      { bn: 'বারবার হয় এমন কাজ? “একাধিকবার” চালু করুন — প্রতিবার সম্পন্ন করলে ইতিহাস জমা হবে।', en: 'Recurring task? Enable “Complete multiple times” — each completion is logged in history.' },
      { bn: 'সম্পন্ন হলে টিক দিন; “ইতিহাস”-এ কবে কবে করেছেন দেখুন।', en: 'Check it off when done; view “History” for past completions.' },
      { bn: 'পরে করতে চাইলে “আবার মনে করিয়ে দিন” দিয়ে কয়েক ঘণ্টা পিছিয়ে দিন।', en: 'Not now? Use “Remind me again” to snooze by a few hours.' },
    ],
    tips: [
      { bn: 'অ্যাপ বন্ধ থাকলেও নোটিফিকেশন পেতে “নোটিফিকেশন চালু করুন” চাপুন (পুশ)।', en: 'Tap “Enable notifications” (push) to get reminders even when the app is closed.' },
    ],
  },
  {
    id: 'expenses',
    icon: <WalletIcon className="w-5 h-5" />,
    title: { bn: 'খরচ', en: 'Expenses' },
    intro: {
      bn: 'দৈনন্দিন খরচের হিসাব রাখুন এবং কোথায় কত যাচ্ছে বুঝুন।',
      en: 'Track daily spending and understand where your money goes.',
    },
    steps: [
      { bn: '“+” চেপে পরিমাণ ও ক্যাটাগরি (খাবার, বাজার, যাতায়াত…) দিন; চাইলে নোট।', en: 'Tap “+”, enter the amount and a category (food, groceries, transport…); add a note if you want.' },
      { bn: 'উপরে “মাস”/“বছর” টগল দিয়ে সময়সীমা বদলান; তীর দিয়ে আগের/পরের সময়ে যান।', en: 'Toggle “Month”/“Year” at the top; use the arrows to move between periods.' },
      { bn: 'মাসিক বাজেট নির্ধারণ করুন — কত শতাংশ শেষ হলো তা দেখা যাবে।', en: 'Set a monthly budget — see how much of it you’ve used.' },
      { bn: 'ক্যাটাগরিতে চাপলে শুধু সেই ধরনের খরচ ফিল্টার হবে; নিচে ট্রেন্ড ও ভাঙচি দেখুন।', en: 'Tap a category to filter it; scroll for the trend chart and breakdown.' },
    ],
  },
  {
    id: 'person',
    icon: <UserIcon className="w-5 h-5" />,
    title: { bn: 'ব্যক্তির প্রোফাইল', en: 'Person profile' },
    intro: {
      bn: 'একজন মানুষের সব লেনদেন এক পাতায়: আপনি কত পাবেন/দেবেন, ফেরত দেওয়ার ধরন, ও পুরো টাইমলাইন।',
      en: 'Everything about one person on a single page: net position, repayment behavior, and full timeline.',
    },
    steps: [
      { bn: '“দিয়েছি”/“নিয়েছি”-তে “ব্যক্তি অনুযায়ী” ভিউ দিয়ে কারও কার্ডে চাপুন, অথবা হোমের সার্চ থেকে যান।', en: 'From “By person” view on Lent/Borrowed tap a card, or use Home search.' },
      { bn: 'উপরে নেট ব্যালেন্স, নিচে সময়মতো/দেরিতে ফেরতের হিসাব ও প্রতিটি লেনদেনের টাইমলাইন।', en: 'See the net balance up top, on-time/late repayment stats, and a timeline of every record.' },
    ],
  },
  {
    id: 'statement',
    icon: <FileTextIcon className="w-5 h-5" />,
    title: { bn: 'স্টেটমেন্ট (পিডিএফ)', en: 'Statement (PDF)' },
    intro: {
      bn: 'নির্দিষ্ট সময়ের হিসাব ব্যক্তি অনুযায়ী সাজিয়ে পিডিএফ হিসেবে ডাউনলোড করুন।',
      en: 'Get a per-person summary for a date range and download it as a PDF.',
    },
    steps: [
      { bn: 'প্রোফাইল মেনু → “স্টেটমেন্ট”-এ যান।', en: 'Open the profile menu → “Statement”.' },
      { bn: 'সময়সীমা বেছে নিন (এই মাস/গত মাস/এই বছর/সব) বা নিজে তারিখ দিন।', en: 'Pick a preset range (this/last month, this year, all) or set custom dates.' },
      { bn: 'চাইলে “খরচ যোগ করুন” বন্ধ/চালু করুন।', en: 'Toggle “Include expenses” on or off.' },
      { bn: '“পিডিএফ ডাউনলোড” চাপুন — সবসময় পরিষ্কার লাইট কপি তৈরি হবে।', en: 'Tap “Download PDF” — always a clean light copy.' },
    ],
  },
  {
    id: 'lock',
    icon: <KeyIcon className="w-5 h-5" />,
    title: { bn: 'অ্যাপ লক (পিন)', en: 'App lock (PIN)' },
    intro: {
      bn: '৪ সংখ্যার পিন দিয়ে অ্যাপ লক করুন। অ্যাপ নতুন করে খুললে পিন চাইবে।',
      en: 'Lock the app with a 4-digit PIN. It asks for the PIN each time you open the app fresh.',
    },
    steps: [
      { bn: 'সেটিংস → “অ্যাপ লক”-এ ৪ সংখ্যার পিন দুইবার দিন → চালু করুন।', en: 'Settings → “App lock”: enter a 4-digit PIN twice → enable.' },
      { bn: 'অ্যাপ বন্ধ করে আবার খুললে পিন লাগবে; একই সেশনে বারবার লাগবে না।', en: 'Reopening the app asks for the PIN; it won’t re-ask within the same session.' },
      { bn: 'পিন ভুলে গেলে লক স্ক্রিনে “পিন ভুলে গেছেন? লগআউট করুন” — লক বন্ধ হয়ে লগআউট হবে, ডেটা নিরাপদ থাকবে।', en: 'Forgot it? On the lock screen tap “Forgot PIN? Log out” — the lock turns off and you’re logged out; your data stays safe.' },
    ],
  },
  {
    id: 'backup',
    icon: <DownloadIcon className="w-5 h-5" />,
    title: { bn: 'ব্যাকআপ (এক্সপোর্ট/ইমপোর্ট)', en: 'Backup (export/import)' },
    intro: {
      bn: 'আপনার ডেটার নিজস্ব কপি রাখুন — যাতে যেকোনো পরিস্থিতিতে ডেটা নিরাপদ থাকে।',
      en: 'Keep your own copy of your data — so it stays safe no matter what.',
    },
    steps: [
      { bn: 'সেটিংস → “গুগল শিট ব্যাকআপ” → “Google Drive যুক্ত করুন”। আপনার নিজের Drive-এ একটি পঠনযোগ্য শিট তৈরি হবে (পাওনা/দেনা/খরচ/রিমাইন্ডার আলাদা ট্যাব)।', en: 'Settings → “Google Sheet backup” → “Connect Google Drive”. A readable sheet is created in your own Drive (separate tabs for Lent/Borrowed/Expenses/Reminders).' },
      { bn: 'অ্যাপ খোলা অবস্থায় শিটটি নিজে থেকেই আপডেট হয়; চাইলে “এখন সিঙ্ক করুন” চাপুন।', en: 'The sheet updates itself while the app is open; tap “Sync now” any time.' },
      { bn: 'প্রোফাইল মেনু → “ডেটা এক্সপোর্ট (JSON)” — সম্পূর্ণ ব্যাকআপ ফাইল নামান।', en: 'Profile menu → “Export data (JSON)” — download a full backup file.' },
      { bn: 'সেটিংস → “ডেটা ইমপোর্ট (JSON)” দিয়ে ব্যাকআপ ফিরিয়ে আনুন (বর্তমান ডেটা মুছবে না)।', en: 'Settings → “Import data (JSON)” to restore a backup (existing data is kept).' },
    ],
  },
  {
    id: 'settings',
    icon: <SettingsIcon className="w-5 h-5" />,
    title: { bn: 'সেটিংস ও অ্যাকাউন্ট', en: 'Settings & account' },
    intro: {
      bn: 'নাম, পাসওয়ার্ড, অ্যাপ লক, ব্যাকআপ ও অ্যাকাউন্ট ব্যবস্থাপনা এক জায়গায়।',
      en: 'Manage your name, password, app lock, backup and account in one place.',
    },
    steps: [
      { bn: 'নাম পরিবর্তন করে সংরক্ষণ করুন।', en: 'Update your display name and save.' },
      { bn: 'পাসওয়ার্ড পরিবর্তন করতে বর্তমান ও নতুন পাসওয়ার্ড দিন (গুগল লগইন হলে দরকার নেই)।', en: 'Change your password with the current + new one (not needed for Google sign-in).' },
      { bn: 'অ্যাকাউন্ট মুছে ফেলার আগে অবশ্যই ডেটা এক্সপোর্ট করে রাখুন।', en: 'Before deleting your account, always export your data first.' },
    ],
  },
]

export default function GuidePage() {
  const lang: Lang = useLang()
  const [open, setOpen] = useState<string | null>('start')

  return (
    <div className="min-h-full">
      <AppBar title={t('profile.guide')} back />
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3 fade-in">
        <p className="text-sm text-muted px-1">
          {lang === 'bn'
            ? 'প্রতিটি অংশে চাপলে ধাপে ধাপে নির্দেশনা খুলবে।'
            : 'Tap any section to expand step-by-step instructions.'}
        </p>

        {SECTIONS.map((s) => {
          const isOpen = open === s.id
          return (
            <div key={s.id} className="card overflow-hidden p-0">
              <button
                onClick={() => setOpen(isOpen ? null : s.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                aria-expanded={isOpen}
              >
                <span className="w-9 h-9 rounded-full tint-accent text-accent flex items-center justify-center flex-shrink-0">
                  {s.icon}
                </span>
                <span className="font-semibold text-content flex-1 min-w-0">{s.title[lang]}</span>
                <ChevronDownIcon className={`w-5 h-5 text-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-0 space-y-3">
                  <p className="text-sm text-muted">{s.intro[lang]}</p>
                  <ol className="space-y-2.5">
                    {s.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-accent text-accent-fg text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {lang === 'bn' ? toBn(i + 1) : i + 1}
                        </span>
                        <span className="text-sm text-content leading-relaxed">{step[lang]}</span>
                      </li>
                    ))}
                  </ol>
                  {s.tips && s.tips.length > 0 && (
                    <div className="rounded-xl tint-accent px-3 py-2.5 space-y-1.5">
                      {s.tips.map((tip, i) => (
                        <p key={i} className="text-xs text-content flex gap-1.5">
                          <span aria-hidden>💡</span>
                          <span className="leading-relaxed">{tip[lang]}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Latin digits → Bengali (small helper, only for step numbers here).
const toBn = (n: number) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d])
