import type {AppLanguage} from './types';

export const LANGUAGE_OPTIONS: {code: AppLanguage; label: string; nativeLabel: string}[] = [
  {code: 'en', label: 'English', nativeLabel: 'English'},
  {code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা'},
  {code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी'},
];

export interface PortalCopy {
  brandTitle: string;
  portalHeaderTitle: string;
  papersLabel: string;
  facultyLabel: string;
  traineesLabel: string;
  kolkataLabel: string;
  windowOpen: string;
  windowClosed: string;
  startsIn: string;
  heroTitle: string;
  heroSubtitle: string;
  statTraineeStrength: string;
  statActiveFaculty: string;
  statIndividualEvals: string;
  statEvalCriteria: string;
  statQuestionsWord: string;
  statAcrossPapers: (count: number) => string;
  scheduleBoxTitle: string;
  opensIst: string;
  closesIst: string;
  signInTitle: string;
  signInSubtitle: string;
  traineeLoginTab: string;
  adminLoginTab: string;
  traineeChestIdLabel: string;
  adminIdLabel: string;
  traineeChestIdPlaceholder: string;
  adminIdPlaceholder: string;
  traineeChestIdHelp: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  verifying: string;
  signInAsTrainee: string;
  signInAsAdmin: string;
  bothRequiredError: string;
  changePassword: string;
  signOut: string;
  timeLeft: string;
  opensAt: string;
  closesAt: string;
  closedAt: string;
  savingDraft: string;
  draftSaved: string;
  saveError: string;
  autoSaveActive: string;
  yourProgress: string;
  paperWord: string;
  teacherSingular: string;
  teacherPlural: string;
  jumpToNextUnrated: string;
  submitting: string;
  submitAllFeedback: (done: number, total: number) => string;
  paperOf: (current: number, total: number) => string;
  activeQuestionsHint: (count: number) => string;
  completedBadge: string;
  pendingRatingBadge: string;
  quickAll: string;
  optionalRemarksFor: (name: string) => string;
  remarksPlaceholder: string;
  previousPaper: string;
  nextPaper: (next: number) => string;
  ratingScale: Record<1 | 2 | 3 | 4 | 5, string>;
  submittedHeading: string;
  submittedBody: (id: string) => string;
  submittedAtIst: string;
  completionDuration: string;
  recorded: string;
  scheduledHeading: string;
  scheduledBody: (start: string, end: string) => string;
  expiredHeading: string;
  expiredBody: (title: string, end: string) => string;
  questionLanguagesLegend: string;
  missingRatingsError: (total: number, remaining: number) => string;
}

export const PORTAL_COPY: Record<AppLanguage, PortalCopy> = {
  en: {
    brandTitle: 'STCLRC Faculty Feedback Portal',
    portalHeaderTitle: 'STCLRC Evaluation Portal',
    papersLabel: 'Papers',
    facultyLabel: 'Faculty',
    traineesLabel: 'Trainees',
    kolkataLabel: 'Kolkata',
    windowOpen: 'Open',
    windowClosed: 'Window Closed',
    startsIn: 'Starts in',
    heroTitle: 'Confidential Trainee Feedback Portal',
    heroSubtitle:
      'Trainees submit individual faculty evaluations across all 12 curriculum papers within the scheduled Kolkata Standard Time (IST) window. All feedback data and performance analytics are strictly visible only inside the Admin Panel.',
    statTraineeStrength: 'Trainee Strength',
    statActiveFaculty: 'Active Faculty',
    statIndividualEvals: 'Individual evaluations',
    statEvalCriteria: 'Evaluation Criteria',
    statQuestionsWord: 'Questions',
    statAcrossPapers: (count) => `Across ${count} Papers`,
    scheduleBoxTitle: 'Scheduled Evaluation Window (Kolkata Standard Time · IST)',
    opensIst: 'Opens (IST)',
    closesIst: 'Closes (IST)',
    signInTitle: 'Portal Sign In',
    signInSubtitle: 'Select your role and enter your assigned credentials.',
    traineeLoginTab: 'Trainee Login',
    adminLoginTab: 'Admin Login',
    traineeChestIdLabel: 'Trainee Chest ID',
    adminIdLabel: 'Administrator ID',
    traineeChestIdPlaceholder: 'Enter Trainee Chest ID',
    adminIdPlaceholder: 'Enter Administrator ID',
    traineeChestIdHelp: 'Use your assigned 4-digit chest login ID',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter password',
    verifying: 'Verifying...',
    signInAsTrainee: 'Sign In as Trainee',
    signInAsAdmin: 'Sign In to Admin Console',
    bothRequiredError: 'Please enter both your Login ID and password.',
    changePassword: 'Change Password',
    signOut: 'Sign Out',
    timeLeft: 'Time Left',
    opensAt: 'Opens at',
    closesAt: 'Closes at',
    closedAt: 'Closed at',
    savingDraft: 'Saving draft...',
    draftSaved: 'Draft saved',
    saveError: 'Save error',
    autoSaveActive: 'Auto-save active',
    yourProgress: 'Your Progress',
    paperWord: 'Paper',
    teacherSingular: 'Teacher',
    teacherPlural: 'Teachers',
    jumpToNextUnrated: 'Jump to Next Unrated Teacher',
    submitting: 'Submitting...',
    submitAllFeedback: (done, total) => `Submit All Feedback (${done}/${total})`,
    paperOf: (current, total) => `Paper ${current} of ${total}`,
    activeQuestionsHint: (count) => `${count} active evaluation questions per teacher (1–5 scale)`,
    completedBadge: 'Completed',
    pendingRatingBadge: 'Pending Rating',
    quickAll: 'Quick all:',
    optionalRemarksFor: (name) => `Optional Remarks for ${name}`,
    remarksPlaceholder: 'Share constructive feedback about teaching clarity, pace, or examples...',
    previousPaper: 'Previous Paper',
    nextPaper: (next) => `Next: Paper ${next}`,
    ratingScale: {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent',
    },
    submittedHeading: 'Feedback Confidentially Submitted',
    submittedBody: (id) =>
      `Thank you, ${id}. Your evaluations have been locked and recorded in the Admin Panel. To preserve evaluation confidentiality, feedback data and scores are accessible only to Administrators.`,
    submittedAtIst: 'Submitted At (IST)',
    completionDuration: 'Completion Duration',
    recorded: 'Recorded',
    scheduledHeading: 'Evaluation Window Scheduled',
    scheduledBody: (start, end) =>
      `This session is scheduled to open at ${start} and close at ${end}.`,
    expiredHeading: 'Feedback Time Window Expired',
    expiredBody: (title, end) =>
      `The evaluation timer for ${title} closed at ${end}. Please contact the Administrator if the schedule needs to be extended.`,
    questionLanguagesLegend: 'Questions displayed in English, বাংলা (Bengali) & हिन्दी (Hindi)',
    missingRatingsError: (total, remaining) =>
      `Please rate all ${total} faculty members before submitting. ${remaining} teacher(s) still need all active questions rated.`,
  },
  bn: {
    brandTitle: 'STCLRC প্রশিক্ষক মূল্যায়ন পোর্টাল',
    portalHeaderTitle: 'STCLRC মূল্যায়ন পোর্টাল',
    papersLabel: 'পেপার',
    facultyLabel: 'প্রশিক্ষক',
    traineesLabel: 'প্রশিক্ষণার্থী',
    kolkataLabel: 'কলকাতা',
    windowOpen: 'খোলা আছে',
    windowClosed: 'সময় শেষ',
    startsIn: 'শুরু হতে বাকি',
    heroTitle: 'গোপনীয় প্রশিক্ষণার্থী মতামত পোর্টাল',
    heroSubtitle:
      'প্রশিক্ষণার্থীরা নির্ধারিত কলকাতা স্ট্যান্ডার্ড টাইম (IST)-এর মধ্যে ১২টি পেপারের সকল প্রশিক্ষকের জন্য পৃথক মূল্যায়ন জমা দেবেন। সমস্ত মতামত ও বিশ্লেষণ সম্পূর্ণ গোপনীয়ভাবে শুধুমাত্র অ্যাডমিন প্যানেলেই দেখা যাবে।',
    statTraineeStrength: 'মোট প্রশিক্ষণার্থী',
    statActiveFaculty: 'সক্রিয় প্রশিক্ষক',
    statIndividualEvals: 'পৃথক মূল্যায়ন',
    statEvalCriteria: 'মূল্যায়নের প্রশ্ন',
    statQuestionsWord: 'টি প্রশ্ন',
    statAcrossPapers: (count) => `মোট ${count}টি পেপারে`,
    scheduleBoxTitle: 'নির্ধারিত মূল্যায়নের সময়সূচী (কলকাতা সময় · IST)',
    opensIst: 'শুরু (IST)',
    closesIst: 'শেষ (IST)',
    signInTitle: 'পোর্টাল লগইন',
    signInSubtitle: 'আপনার ভূমিকা নির্বাচন করুন এবং নির্ধারিত আইডি ও পাসওয়ার্ড দিন।',
    traineeLoginTab: 'প্রশিক্ষণার্থী লগইন',
    adminLoginTab: 'অ্যাডমিন লগইন',
    traineeChestIdLabel: 'প্রশিক্ষণার্থী চেস্ট আইডি',
    adminIdLabel: 'অ্যাডমিনিস্ট্রেটর আইডি',
    traineeChestIdPlaceholder: 'চেস্ট লগইন আইডি লিখুন',
    adminIdPlaceholder: 'অ্যাডমিন আইডি লিখুন',
    traineeChestIdHelp: 'আপনার নির্ধারিত ৪-অঙ্কের চেস্ট লগইন আইডি ব্যবহার করুন',
    passwordLabel: 'পাসওয়ার্ড',
    passwordPlaceholder: 'পাসওয়ার্ড লিখুন',
    verifying: 'যাচাই করা হচ্ছে...',
    signInAsTrainee: 'প্রশিক্ষণার্থী হিসেবে লগইন করুন',
    signInAsAdmin: 'অ্যাডমিন প্যানেলে লগইন করুন',
    bothRequiredError: 'অনুগ্রহ করে লগইন আইডি এবং পাসওয়ার্ড উভয়ই লিখুন।',
    changePassword: 'পাসওয়ার্ড পরিবর্তন',
    signOut: 'লগ আউট',
    timeLeft: 'বাকি সময়',
    opensAt: 'শুরু হবে',
    closesAt: 'বন্ধ হবে',
    closedAt: 'বন্ধ হয়েছে',
    savingDraft: 'খসড়া সংরক্ষণ হচ্ছে...',
    draftSaved: 'খসড়া সংরক্ষিত',
    saveError: 'সংরক্ষণে ত্রুটি',
    autoSaveActive: 'স্বয়ংক্রিয় সংরক্ষণ চালু',
    yourProgress: 'আপনার অগ্রগতি',
    paperWord: 'পেপার',
    teacherSingular: 'প্রশিক্ষক',
    teacherPlural: 'প্রশিক্ষক',
    jumpToNextUnrated: 'পরবর্তী বাকি প্রশিক্ষকে যান',
    submitting: 'জমা হচ্ছে...',
    submitAllFeedback: (done, total) => `সব মতামত জমা দিন (${done}/${total})`,
    paperOf: (current, total) => `পেপার ${current} / ${total}`,
    activeQuestionsHint: (count) => `প্রতি প্রশিক্ষকের জন্য ${count}টি প্রশ্ন (১–৫ রেটিং স্কেল)`,
    completedBadge: 'সম্পন্ন',
    pendingRatingBadge: 'মূল্যায়ন বাকি',
    quickAll: 'সব একসাথে:',
    optionalRemarksFor: (name) => `${name}-এর জন্য ঐচ্ছিক মন্তব্য`,
    remarksPlaceholder: 'শিক্ষাদানের স্পষ্টতা, গতি বা উদাহরণ সম্পর্কে গঠনমূলক মতামত লিখুন...',
    previousPaper: 'পূর্ববর্তী পেপার',
    nextPaper: (next) => `পরবর্তী: পেপার ${next}`,
    ratingScale: {
      1: 'দুর্বল',
      2: 'মোটামুটি',
      3: 'ভালো',
      4: 'খুব ভালো',
      5: 'চমৎকার',
    },
    submittedHeading: 'মতামত গোপনীয়ভাবে জমা হয়েছে',
    submittedBody: (id) =>
      `ধন্যবাদ, ${id}। আপনার মূল্যায়ন সফলভাবে লক ও অ্যাডমিন প্যানেলে সংরক্ষিত হয়েছে। গোপনীয়তা বজায় রাখতে ফলাফল শুধুমাত্র অ্যাডমিনিস্ট্রেটররাই দেখতে পারবেন।`,
    submittedAtIst: 'জমার সময় (IST)',
    completionDuration: 'মোট সময়',
    recorded: 'সংরক্ষিত',
    scheduledHeading: 'মূল্যায়ন সেশন নির্ধারিত আছে',
    scheduledBody: (start, end) =>
      `এই সেশনটি ${start}-এ শুরু হবে এবং ${end}-এ শেষ হবে।`,
    expiredHeading: 'মতামত দেওয়ার সময়সীমা শেষ হয়েছে',
    expiredBody: (title, end) =>
      `${title}-এর নির্ধারিত সময় ${end}-এ শেষ হয়েছে। সময় বাড়াতে অনুগ্রহ করে অ্যাডমিনিস্ট্রেটরের সাথে যোগাযোগ করুন।`,
    questionLanguagesLegend: 'প্রশ্নসমূহ English, বাংলা ও हिन्दी ভাষায় প্রদর্শিত',
    missingRatingsError: (total, remaining) =>
      `জমা দেওয়ার আগে সকল ${total} জন প্রশিক্ষককে রেটিং দিন। এখনও ${remaining} জন প্রশিক্ষকের মূল্যায়ন বাকি আছে।`,
  },
  hi: {
    brandTitle: 'STCLRC प्रशिक्षक फीडबैक पोर्टल',
    portalHeaderTitle: 'STCLRC मूल्यांकन पोर्टल',
    papersLabel: 'पेपर',
    facultyLabel: 'प्रशिक्षक',
    traineesLabel: 'प्रशिक्षु',
    kolkataLabel: 'कोलकाता',
    windowOpen: 'खुला है',
    windowClosed: 'समय समाप्त',
    startsIn: 'शुरू होने में',
    heroTitle: 'गोपनीय प्रशिक्षु फीडबैक पोर्टल',
    heroSubtitle:
      'प्रशिक्षु निर्धारित कोलकाता मानक समय (IST) के भीतर सभी 12 पेपरों के प्रत्येक प्रशिक्षक का व्यक्तिगत मूल्यांकन जमा करेंगे। सभी फीडबैक डेटा और विश्लेषण केवल एडमिन पैनल में ही दिखाई देंगे।',
    statTraineeStrength: 'कुल प्रशिक्षु',
    statActiveFaculty: 'सक्रिय प्रशिक्षक',
    statIndividualEvals: 'व्यक्तिगत मूल्यांकन',
    statEvalCriteria: 'मूल्यांकन प्रश्न',
    statQuestionsWord: 'प्रश्न',
    statAcrossPapers: (count) => `सभी ${count} पेपरों में`,
    scheduleBoxTitle: 'निर्धारित मूल्यांकन समय-सारणी (कोलकाता समय · IST)',
    opensIst: 'प्रारंभ (IST)',
    closesIst: 'समाप्ति (IST)',
    signInTitle: 'पोर्टल लॉगिन',
    signInSubtitle: 'अपनी भूमिका चुनें और अपनी निर्धारित आईडी व पासवर्ड दर्ज करें।',
    traineeLoginTab: 'प्रशिक्षु लॉगिन',
    adminLoginTab: 'एडमिन लॉगिन',
    traineeChestIdLabel: 'प्रशिक्षु चेस्ट आईडी',
    adminIdLabel: 'एडमिनिस्ट्रेटर आईडी',
    traineeChestIdPlaceholder: 'चेस्ट लॉगिन आईडी दर्ज करें',
    adminIdPlaceholder: 'एडमिन आईडी दर्ज करें',
    traineeChestIdHelp: 'अपनी निर्धारित 4-अंकीय चेस्ट लॉगिन आईडी का उपयोग करें',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: 'पासवर्ड दर्ज करें',
    verifying: 'सत्यापन हो रहा है...',
    signInAsTrainee: 'प्रशिक्षु के रूप में लॉगिन करें',
    signInAsAdmin: 'एडमिन कंसोल में लॉगिन करें',
    bothRequiredError: 'कृपया अपनी लॉगिन आईडी और पासवर्ड दोनों दर्ज करें।',
    changePassword: 'पासवर्ड बदलें',
    signOut: 'लॉग आउट',
    timeLeft: 'शेष समय',
    opensAt: 'शुरू होगा',
    closesAt: 'बंद होगा',
    closedAt: 'बंद हो गया',
    savingDraft: 'ड्राफ्ट सहेजा जा रहा है...',
    draftSaved: 'ड्राफ्ट सहेजा गया',
    saveError: 'सहेजने में त्रुटि',
    autoSaveActive: 'ऑटो-सेव सक्रिय',
    yourProgress: 'आपकी प्रगति',
    paperWord: 'पेपर',
    teacherSingular: 'प्रशिक्षक',
    teacherPlural: 'प्रशिक्षक',
    jumpToNextUnrated: 'अगले शेष प्रशिक्षक पर जाएं',
    submitting: 'जमा किया जा रहा है...',
    submitAllFeedback: (done, total) => `सभी फीडबैक जमा करें (${done}/${total})`,
    paperOf: (current, total) => `पेपर ${current} / ${total}`,
    activeQuestionsHint: (count) => `प्रत्येक प्रशिक्षक के लिए ${count} प्रश्न (1–5 रेटिंग स्केल)`,
    completedBadge: 'पूर्ण',
    pendingRatingBadge: 'रेटिंग शेष',
    quickAll: 'सभी एक साथ:',
    optionalRemarksFor: (name) => `${name} के लिए वैकल्पिक टिप्पणी`,
    remarksPlaceholder: 'शिक्षण की स्पष्टता, गति या उदाहरणों के बारे में रचनात्मक सुझाव लिखें...',
    previousPaper: 'पिछला पेपर',
    nextPaper: (next) => `अगला: पेपर ${next}`,
    ratingScale: {
      1: 'कमज़ोर',
      2: 'साधारण',
      3: 'अच्छा',
      4: 'बहुत अच्छा',
      5: 'उत्कृष्ट',
    },
    submittedHeading: 'फीडबैक गोपनीय रूप से जमा हो गया',
    submittedBody: (id) =>
      `धन्यवाद, ${id}। आपका मूल्यांकन सफलतापूर्वक लॉक करके एडमिन पैनल में सुरक्षित कर दिया गया है। गोपनीयता बनाए रखने के लिए परिणाम केवल एडमिनिस्ट्रेटर ही देख सकते हैं।`,
    submittedAtIst: 'जमा करने का समय (IST)',
    completionDuration: 'कुल समय',
    recorded: 'दर्ज',
    scheduledHeading: 'मूल्यांकन सत्र निर्धारित है',
    scheduledBody: (start, end) =>
      `यह सत्र ${start} पर शुरू होगा और ${end} पर समाप्त होगा।`,
    expiredHeading: 'फीडबैक की समय-सीमा समाप्त हो गई है',
    expiredBody: (title, end) =>
      `${title} के लिए मूल्यांकन समय ${end} पर समाप्त हो गया है। समय बढ़ाने के लिए कृपया एडमिनिस्ट्रेटर से संपर्क करें।`,
    questionLanguagesLegend: 'प्रश्न English, বাংলা (बंगाली) और हिन्दी में प्रदर्शित हैं',
    missingRatingsError: (total, remaining) =>
      `जमा करने से पहले सभी ${total} प्रशिक्षकों को रेटिंग दें। अभी ${remaining} प्रशिक्षक का मूल्यांकन शेष है।`,
  },
};
