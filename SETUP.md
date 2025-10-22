# 🚀 LifeTrack সেটআপ গাইড

## প্রথম ধাপ: প্রজেক্ট সেটআপ

### 1. নির্ভরতা ইনস্টল করুন

```bash
cd lifetrack
npm install
```

### 2. আইকন তৈরি করুন

PWA-র জন্য দুটি আইকন প্রয়োজন। আপনি নিচের যেকোনো পদ্ধতি ব্যবহার করতে পারেন:

#### পদ্ধতি ১: অনলাইন টুল ব্যবহার করে
1. [favicon.io](https://favicon.io/) বা [RealFaviconGenerator](https://realfavicongenerator.net/) এ যান
2. একটি সুন্দর আইকন তৈরি করুন
3. 192x192 এবং 512x512 সাইজের PNG ফাইল ডাউনলোড করুন
4. ফাইলগুলোর নাম দিন:
   - `icon-192x192.png`
   - `icon-512x512.png`
5. `public` ফোল্ডারে রাখুন

#### পদ্ধতি ২: দ্রুত টেস্টিং এর জন্য
আপাতত টেস্টিং এর জন্য সাধারণ রঙিন স্কয়ার আইকন ব্যবহার করতে পারেন। ImageMagick দিয়ে:

```bash
# 192x192 আইকন
convert -size 192x192 xc:#0ea5e9 -pointsize 100 -fill white -gravity center -annotate +0+0 "LT" public/icon-192x192.png

# 512x512 আইকন
convert -size 512x512 xc:#0ea5e9 -pointsize 280 -fill white -gravity center -annotate +0+0 "LT" public/icon-512x512.png
```

অথবা অনলাইনে [Canva](https://www.canva.com/) ব্যবহার করে সুন্দর আইকন ডিজাইন করুন।

### 3. ডেভেলপমেন্ট সার্ভার চালু করুন

```bash
npm run dev
```

ব্রাউজারে খুলুন: `http://localhost:3000`

## নোটিফিকেশন পরীক্ষা করা

### 1. ব্রাউজার সেটিংস
- Chrome/Edge: Settings > Privacy and security > Site settings > Notifications
- Firefox: Settings > Privacy & Security > Permissions > Notifications
- Safari: Safari > Preferences > Websites > Notifications

### 2. নোটিফিকেশন পারমিশন দিন
1. "রিমাইন্ডার" পেজে যান
2. নতুন রিমাইন্ডার যোগ করুন
3. পারমিশন প্রম্পট আসলে "Allow" ক্লিক করুন

### 3. টেস্ট করুন
- ১-২ মিনিট পরের জন্য একটি রিমাইন্ডার সেট করুন
- নোটিফিকেশন পাবেন দুটি বাটন সহ:
  - "বাতিল করুন" - রিমাইন্ডার বন্ধ করবে
  - "আবার সময় দিন" - নতুন সময় সেট করবে

## PWA ইনস্টল করা

### মোবাইলে (Android/iOS)
1. Chrome/Safari এ সাইট খুলুন
2. Menu > "Add to Home Screen" ক্লিক করুন
3. নাম দিন এবং Add করুন
4. হোম স্ক্রীন থেকে অ্যাপ চালু করুন

### ডেস্কটপে (Chrome/Edge)
1. ব্রাউজার অ্যাড্রেস বারে install আইকনে ক্লিক করুন
2. "Install" ক্লিক করুন
3. অ্যাপ্লিকেশন মেনু থেকে চালু করুন

## প্রোডাকশন ডিপ্লয়

### Vercel এ ডিপ্লয় (সুপারিশকৃত)

```bash
# Vercel CLI ইনস্টল করুন
npm i -g vercel

# প্রজেক্ট ডিপ্লয় করুন
vercel
```

অথবা [Vercel Dashboard](https://vercel.com) এ গিয়ে GitHub রিপোজিটরি সংযুক্ত করুন।

### অন্যান্য প্ল্যাটফর্ম
- **Netlify**: Drag & drop the `.next` folder
- **Railway**: Connect GitHub repo
- **DigitalOcean**: Deploy using App Platform

## ট্রাবলশুটিং

### নোটিফিকেশন কাজ করছে না
1. ব্রাউজার নোটিফিকেশন পারমিশন চেক করুন
2. HTTPS বা localhost এ চালাচ্ছেন কিনা নিশ্চিত করুন
3. Service Worker রেজিস্টার হয়েছে কিনা DevTools এ চেক করুন

### PWA ইনস্টল হচ্ছে না
1. `manifest.json` সঠিকভাবে লোড হচ্ছে কিনা চেক করুন
2. আইকন ফাইল আছে কিনা নিশ্চিত করুন
3. HTTPS এ চালাচ্ছেন কিনা দেখুন (localhost এ কাজ করবে)

### ডেটা হারিয়ে গেছে
LocalStorage ক্লিয়ার হলে ডেটা হারিয়ে যাবে। ব্যাকআপ ফিচার শীঘ্রই আসছে!

## পরবর্তী ধাপ

- 🎨 আইকন কাস্টমাইজ করুন
- 🌐 ডোমেইন যুক্ত করুন
- 📱 বন্ধুদের সাথে শেয়ার করুন
- ⭐ নতুন ফিচার রিকোয়েস্ট করুন

---

**শুভকামনা! 🎉**

