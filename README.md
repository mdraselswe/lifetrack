# 💰 LifeTrack — আপনার দৈনন্দিন জীবন পরিচালক

**ধার-দেনার হিসাব, রিমাইন্ডার আর টাকার ট্র্যাকিং — সব এক জায়গায়, সম্পূর্ণ বাংলায়।**

একটি আধুনিক Progressive Web App (PWA) — মোবাইলে app-এর মতো install করুন, offline-এও চলে, আর রিমাইন্ডারের notification পান app বন্ধ থাকলেও। বাংলা ও English দুই ভাষাতেই।

🔗 **Live:** https://lifetrack-site.vercel.app
📥 **Android APK:** [Download](https://drive.google.com/file/d/1V470VuBgjShNZ6KIWS1xbStOsnDqpQpr/view?usp=sharing)

---

## ✨ ফিচারসমূহ

### 💸 ধার-দেনা ব্যবস্থাপনা (দিয়েছি / নিয়েছি)
- **ধার দিয়েছি** — কাকে, কত, কবে, কেন ধার দিয়েছেন
- **ধার নিয়েছি** — কার কাছ থেকে কত নিয়েছেন
- **আংশিক বা সম্পূর্ণ ফেরত** — কিস্তিতে ফেরত রেকর্ড, এক ট্যাপে সম্পূর্ণ পরিশোধ
- **পরিশোধের ইতিহাস** — প্রতিটি পেমেন্টের তারিখ, পরিমাণ, নোট
- **পরিমাণ বৃদ্ধি** — একই ব্যক্তিকে আবার ধার দিলে টাইমলাইনে যোগ হয়, চলমান মোট দেখায়
- **প্রাথমিক ধার আলাদা** — মূল টাকা আর বৃদ্ধি আলাদা করে দেখা যায়
- **ফেরতের তারিখ (due date)** — দিলে স্বয়ংক্রিয় রিমাইন্ডার তৈরি হয়
- **Progress bar** — কত শতাংশ পরিশোধ হলো এক নজরে
- **পরিশোধিত ⇄ ফেরত (revert)** — ভুলে পরিশোধিত করলে ফিরিয়ে আনা যায়, হিসাব ঠিক থাকে
- সব entry **সম্পাদনা ও মুছে ফেলা** যায় (পেমেন্ট, বৃদ্ধি সহ)
- **Overpay guard** — বাকির চেয়ে বেশি পরিশোধ আটকে দেয়

### 🔍 তালিকা ব্যবস্থাপনা
- **নাম দিয়ে search**
- **Filter** — সব / বাকি / পরিশোধিত / মেয়াদোত্তীর্ণ
- **Sort** — নতুন, পুরনো, বাকি বেশি/কম, নাম অনুযায়ী
- **ব্যক্তি অনুযায়ী view** — একই মানুষের সব হিসাব একসাথে, মোট বাকি সহ
- **Multi-select + bulk action** — একাধিক card নির্বাচন করে মোট দেখুন, একসাথে পরিশোধিত/মুছুন
- **Statement share** — যেকোনো হিসাব বা ব্যক্তির পুরো হিসাব WhatsApp/Messenger-এ share বা copy

### 📊 ড্যাশবোর্ড
- **নেট ব্যালেন্স hero** — সব মিলিয়ে এগিয়ে না পিছিয়ে, count-up animation সহ
- **পাবেন vs দিতে হবে** — proportion bar ও ব্যক্তি-সংখ্যা সহ tiles
- **দিয়েছি/নিয়েছি tabs** — home থেকেই সব বাকির তালিকা ও এক-ট্যাপ ফেরত
- **Quick-add (+) বাটন** — home ছেড়ে না গিয়েই ধার, লোন বা রিমাইন্ডার যোগ
- **এই মাসের সারাংশ** — ফেরত পেয়েছেন / ফেরত দিয়েছেন
- **শেষ ৬ মাসের chart** — মাসভিত্তিক লেনদেনের bar chart
- **সাম্প্রতিক কার্যক্রম** — সব লেনদেনের টাইমলাইন, আপেক্ষিক সময় সহ ("২ ঘণ্টা আগে")
- **রিমাইন্ডার alert** — মেয়াদোত্তীর্ণ বা আজকের রিমাইন্ডার banner
- **Pull-to-refresh** — টেনে নামিয়ে refresh

### ⏰ রিমাইন্ডার
- নির্দিষ্ট সময়ে notification — **app/browser বন্ধ থাকলেও** (Web Push)
- **Notification-এই action** — ✓ সম্পন্ন বা +১ ঘণ্টা snooze, app খোলা লাগে না
- **Repeat রিমাইন্ডার** — প্রতি X দিন/সপ্তাহ/মাস, notification-এর পর নিজে-নিজেই পরের বারে চলে যায়
- **সম্পন্নের ইতিহাস** — প্রতিবারের রেকর্ড, সম্পাদনাযোগ্য
- **শেষ করুন** — repeat রিমাইন্ডার চিরতরে বন্ধ (ইতিহাস থেকে যায়)
- **Group view** — মেয়াদোত্তীর্ণ / আজ / আগামীকাল / পরে
- **Reschedule** — কত ঘণ্টা পরে আবার মনে করাবে, নিজে ঠিক করুন

### 🌐 দুই ভাষা (বাংলা + English)
- এক ট্যাপে **সম্পূর্ণ app** বাংলা ⇄ English (৩৬০+ অনুবাদ)
- **সংখ্যা ও তারিখও বদলায়** — ৳৫৩,৬০০ · জুলাই ৫, ২০২৬ ⇄ ৳53,600 · July 5, 2026
- পছন্দ মনে রাখে — পরেরবার একই ভাষায় খুলবে
- সব device-এ বাংলা সংখ্যা নির্ভুল (নিজস্ব converter)

### 🎨 ডিজাইন ও অভিজ্ঞতা
- **Light / Dark theme** — নিজে বাছুন বা system অনুযায়ী, flash-free
- Clean minimal design — token-ভিত্তিক consistent রঙ, semantic colors (সবুজ = পাবেন, লাল = দেবেন)
- **Smooth animation সর্বত্র** — page cross-fade, list stagger, press effects (Reduce Motion সম্মান করে)
- সম্পূর্ণ **mobile-first responsive** — bottom nav, bottom-sheet modal, swipe gesture navigation
- **Accessibility** — pinch-zoom, modal focus trap, screen-reader label, keyboard navigation

### 📱 PWA ও Offline
- **Install করুন** home screen-এ — native app-এর মতো (standalone)
- **Android app** — একই PWA থেকে Trusted Web Activity (TWA) হিসেবে packaged, Play Store-এ দেওয়া যায়
- **Offline-এও চলে** — data দেখা ও লেখা যায়, সংযোগ ফিরলে auto-sync
- **Offline indicator** — সংযোগ গেলে banner দেখায়
- **Realtime sync** — এক device-এ পরিবর্তন, সব device-এ সাথে সাথে update

### 🔐 নিরাপত্তা ও Account
- Email/password + **Google login**
- **Email verification বাধ্যতামূলক** — ভুয়া email-এ account চলে না
- **Password reset** — ভুলে গেলে email-এ link
- **Settings page** — নাম বদল, password বদল, account delete
- Server-side security rules — নিজের data ছাড়া কেউ কিছুই দেখে না
- **নিজের data export** — এক ক্লিকে JSON download

### 💾 Data Backup (৩ স্তর)
- **Realtime Google Sheet mirror** — প্রতিটি পরিবর্তন কয়েক সেকেন্ডের মধ্যে Sheet-এ
- **দৈনিক স্বয়ংক্রিয় backup** — প্রতিদিন পুরো snapshot
- **ব্যক্তিগত JSON export** — যখন খুশি নিজে নামান

### 👑 Admin Panel
- কে কে registration করেছে, কে কবে শেষ login করেছে
- প্রতি user-এর ব্যবহারের পরিসংখ্যান (ধার/লোন/রিমাইন্ডার সংখ্যা)
- Search, verified badge, ৭ দিনের সক্রিয়তার হিসাব
- শুধুমাত্র admin দেখতে পায় (server-side token যাচাই)

### ⚡ Performance ও Quality
- **Instant load** — দ্বিতীয়বার থেকে cache-first, চোখের পলকে
- Variable font, code-splitting, preconnect — সর্বত্র optimize
- **২১টি unit test** — টাকার হিসাবের নির্ভুলতা যাচাই করা

---

## 🛠 Tech Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Firebase Firestore (realtime + offline persistence) |
| Auth | Firebase Auth (email + Google) |
| Notification | Web Push (VAPID) + Service Worker |
| Backup | Google Sheets API + Cron |
| Styling | Tailwind CSS + design tokens |
| Hosting | Vercel |
| Test | Vitest |

## 🚀 Local Setup

```bash
git clone <repo>
cd lifetrack
npm install
cp .env.example .env.local   # মান বসান (Firebase console / vercel env pull)
npm run dev
```

Firebase setup-এর বিস্তারিত: [FIREBASE_SETUP.md](FIREBASE_SETUP.md) · প্রয়োজনীয় variable-এর তালিকা: [.env.example](.env.example)

```bash
npm run build        # production build
npm run type-check   # tsc --noEmit
npm test             # vitest (21 tests)
```

## 🤖 Android app (TWA)

Android app-টি একটি **Trusted Web Activity** — live PWA-কেই wrap করে, আলাদা native code নেই।

📥 **সরাসরি install:** [APK download](https://drive.google.com/file/d/1V470VuBgjShNZ6KIWS1xbStOsnDqpQpr/view?usp=sharing) → phone-এ খুলে "unknown source" allow করে install করুন।

1. [PWABuilder](https://www.pwabuilder.com)-এ live URL দিন → **Package For Stores → Android → Google Play (`.aab`)**
2. package id `com.lifetrack.app`, signing key auto-generate — **keystore + password নিরাপদে সংরক্ষণ করুন** (হারালে আর update দেওয়া যাবে না)
3. Digital Asset Links আগে থেকেই serve হয় `/.well-known/assetlinks.json`-এ ([app/api/assetlinks/route.ts](app/api/assetlinks/route.ts)) — নতুন signing key হলে সেখানকার fingerprint আপডেট করুন
4. `.aab` [Play Console](https://play.google.com/console)-এ upload করে publish করুন

## 📄 লাইসেন্স

MIT License — আপনার ইচ্ছামতো ব্যবহার করুন!

---

**LifeTrack** — কাগজের হিসাব ভুলে যান। 📒✨
