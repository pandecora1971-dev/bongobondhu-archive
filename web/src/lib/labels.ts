// Bangla / English labels for every enum. Order = display order in the forms (verbatim from the prototype).
// Safe to import on the client.

export type L = readonly [bn: string, en: string];
type Table<K extends string> = readonly (readonly [K, string, string])[];

const mk = <K extends string>(t: Table<K>) => ({
  codes: t.map((r) => r[0]) as K[],
  list: t,
  label: (k: K | null | undefined, lang: "bn" | "en" = "bn") => {
    const r = t.find((x) => x[0] === k);
    return r ? (lang === "en" ? r[2] : r[1]) : "";
  },
});

export const CONTRIBUTION_TYPES = mk([
  ["EVENT", "ঘটনা / তথ্য", "Event / fact"],
  ["QUOTE", "উক্তি / বক্তৃতা", "Quote / speech"],
  ["PHOTO", "ছবি", "Photo"],
  ["VIDEO", "ভিডিও", "Video"],
  ["DOCUMENT", "দলিল / চিঠি", "Document / letter"],
  ["LINK", "লিংক", "Link"],
  ["MEMOIR", "স্মৃতিকথা", "Memoir"],
] as const);

export const SUBJECTS = mk([
  ["BB", "বঙ্গবন্ধু", "Bangabandhu"],
  ["SH", "শেখ হাসিনা", "Sheikh Hasina"],
] as const);

export const ATTRIBUTION = mk([
  ["NAME", "আমার নামে", "With my name"],
  ["ALIAS", "ছদ্মনামে", "With a pseudonym"],
  ["ANON", "বেনামে", "Anonymously"],
] as const);

export const CRIMES = mk([
  ["JULY_MILITANT", "জুলাই জঙ্গি সন্ত্রাসী", "July militant terrorists"],
  ["MOB", "মব সৃষ্টি", "Mob violence"],
  ["LOOTING", "বাড়িঘর লুটপাট", "Looting of homes"],
  ["ARSON", "অগ্নিসংযোগ", "Arson"],
  ["JOY_BANGLA_ASSAULT", "জয় বাংলা স্লোগানের জন্য মারধর ও নির্যাতন", "Beaten or tortured for saying Joy Bangla"],
  ["ADMIN_INVOLVED", "প্রশাসনের জড়িত ব্যক্তি", "Officials involved"],
  ["JAIL_KILLING_TORTURE", "জেলে হত্যা ও নির্যাতন", "Killing and torture in jail"],
  ["BAIL_OBSTRUCTION", "জামিনে বাধা", "Obstruction of bail"],
  ["EDU_INSTITUTION_MOB", "শিক্ষা প্রতিষ্ঠানে বাধা ও মব", "Obstruction and mobs at schools"],
  ["MURDER_ABDUCTION", "খুন / অপহরণ", "Murder / abduction"],
  ["ATTEMPTED_MURDER", "হত্যাচেষ্টা", "Attempted murder"],
  ["KILLING_TORTURE", "হত্যা ও নির্যাতন", "Killing and torture"],
  ["FALSE_CASE", "মিথ্যা মামলা", "False case"],
  ["THREAT_EXTORTION", "হুমকি ও চাঁদাবাজি", "Threats and extortion"],
  ["LAND_GRAB", "বাড়ি বা জমি দখল", "Seizure of home or land"],
  ["CHILD_ABUSE", "শিশু নির্যাতন", "Child abuse"],
  ["OTHER", "অন্যান্য", "Other"],
] as const);

export const HARMS = mk([
  ["DEATH", "মৃত্যু", "Death"],
  ["INJURY", "শারীরিক আঘাত", "Physical injury"],
  ["PROPERTY", "সম্পদের ক্ষতি", "Loss of property"],
  ["DISPLACED", "ঘরছাড়া হওয়া", "Forced from home"],
  ["LIVELIHOOD", "চাকরি বা ব্যবসা হারানো", "Lost job or business"],
  ["TRAUMA", "মানসিক আঘাত", "Psychological harm"],
] as const);

export const VICTIMS = mk([
  ["SELF", "আমি নিজে", "Myself"],
  ["FAMILY", "আমার পরিবারের কেউ", "Someone in my family"],
  ["OTHER_PERSON", "অন্য কোনো ব্যক্তি", "Another person"],
  ["MULTIPLE", "একাধিক মানুষ / একটি এলাকা", "Several people / an area"],
] as const);

export const HOW_KNOWN = mk([
  ["SAW", "নিজে দেখেছি", "I saw it myself"],
  ["MEDIA", "ছবি বা ভিডিওতে দেখেছি", "I saw it in a photo or video"],
  ["VICTIM_TOLD", "ভুক্তভোগী জানিয়েছেন", "The victim told me"],
  ["HEARD", "অন্যের কাছে শুনেছি", "I heard it from others"],
] as const);

export const WITNESS = mk([
  ["YES", "হ্যাঁ", "Yes"],
  ["NO", "না", "No"],
  ["UNKNOWN", "জানি না", "Don't know"],
] as const);

export const CASE_FILED = mk([
  ["YES", "হ্যাঁ", "Yes"],
  ["NO", "না", "No"],
  ["REFUSED", "নিতে চায়নি", "Police refused"],
] as const);

export const ID_MODES = mk([
  ["ANON", "সম্পূর্ণ বেনামে", "Fully anonymous"],
  ["CONTACT", "যাচাইকারী দল যোগাযোগ করতে পারবে", "Reviewers may contact me"],
] as const);

export const ORGS = mk([
  ["AWAMI_LEAGUE", "আওয়ামী লীগ", "Awami League"],
  ["JUBO_LEAGUE", "যুবলীগ", "Jubo League"],
  ["CHHATRA_LEAGUE", "ছাত্রলীগ", "Chhatra League"],
  ["SWECHCHHASEBAK_LEAGUE", "স্বেচ্ছাসেবক লীগ", "Swechchhasebak League"],
  ["KRISHAK_LEAGUE", "কৃষক লীগ", "Krishak League"],
  ["SRAMIK_LEAGUE", "শ্রমিক লীগ", "Sramik League"],
  ["MOHILA_AWAMI_LEAGUE", "মহিলা আওয়ামী লীগ", "Mohila Awami League"],
  ["JUBO_MOHILA_LEAGUE", "যুব মহিলা লীগ", "Jubo Mohila League"],
  ["TANTI_LEAGUE", "তাঁতী লীগ", "Tanti League"],
  ["MATSYAJIBI_LEAGUE", "মৎস্যজীবী লীগ", "Matsyajibi League"],
  ["AINJIBI_PARISHAD", "আইনজীবী পরিষদ", "Ainjibi Parishad"],
  ["BANGABANDHU_PARISHAD", "বঙ্গবন্ধু পরিষদ", "Bangabandhu Parishad"],
  ["PROBASHI", "প্রবাসী শাখা", "Overseas branch"],
  ["OTHER", "অন্যান্য", "Other"],
] as const);

export const ACTIVITY_TYPES = mk([
  ["MEETING", "মিটিং / সভা", "Meeting"],
  ["PROCESSION", "মিছিল", "Procession"],
  ["HUMAN_CHAIN", "মানববন্ধন", "Human chain"],
  ["PROTEST", "বিক্ষোভ / প্রতিবাদ", "Protest"],
  ["RELIEF", "ত্রাণ / সেবা", "Relief / service"],
  ["PRAYER", "দোয়া / মিলাদ", "Prayer / milad"],
  ["OUTREACH", "জনসংযোগ", "Outreach"],
  ["ONLINE_CAMPAIGN", "অনলাইন প্রচারণা", "Online campaign"],
  ["LEGAL_AID", "আইনি সহায়তা", "Legal aid"],
  ["SUPPORT_DETAINED", "আহত বা বন্দি কর্মীর পাশে", "Supporting injured or jailed workers"],
  ["OTHER", "অন্যান্য", "Other"],
] as const);

export const LEVELS = mk([
  ["CENTRAL", "কেন্দ্রীয়", "Central"],
  ["METRO", "মহানগর", "Metropolitan"],
  ["DISTRICT", "জেলা", "District"],
  ["UPAZILA", "উপজেলা / থানা", "Upazila / thana"],
  ["MUNICIPALITY", "পৌরসভা", "Municipality"],
  ["UNION", "ইউনিয়ন", "Union"],
  ["WARD", "ওয়ার্ড", "Ward"],
  ["CAMPUS", "কলেজ / বিশ্ববিদ্যালয় শাখা", "College / university unit"],
  ["ABROAD", "প্রবাসী শাখা", "Overseas branch"],
] as const);

export const STATUS = mk([
  ["PENDING", "অপেক্ষমাণ", "Pending"],
  ["APPROVED", "অনুমোদিত", "Approved"],
  ["REJECTED", "বাতিল", "Rejected"],
  ["ARCHIVED", "আর্কাইভ", "Archived"],
] as const);

export const PROGRESS = mk([
  ["RECEIVED", "জমা হয়েছে", "Received"],
  ["UNDER_REVIEW", "যাচাই চলছে", "Under review"],
  ["NEED_INFO", "আরও তথ্য দরকার", "More information needed"],
  ["VERIFIED", "যাচাই সম্পন্ন", "Verified"],
  ["CLOSED", "বন্ধ", "Closed"],
] as const);

export const PROJECT_STATUS = mk([
  ["D", "চালু / সম্পন্ন", "Operational / done"],
  ["P", "আংশিক", "Partial"],
  ["O", "চলমান", "Ongoing"],
  ["L", "নীতি / পরিকল্পনা", "Policy / plan"],
  ["A", "নথিভুক্তির বিষয়", "For documentation"],
] as const);

export const ROLES = mk([
  ["SUPER_ADMIN", "সুপার অ্যাডমিন", "Super admin"],
  ["MODERATOR", "মডারেটর", "Moderator"],
] as const);

export const PERMISSIONS = mk([
  ["CONTRIBUTIONS", "তথ্য জমা (BB / SH) যাচাই", "Review BB / SH contributions"],
  ["POSTS", "দুঃসময়ের গল্প যাচাই", "Review দুঃসময়ের গল্প posts"],
  ["COMPLAINTS", "অভিযোগ দেখা ও হালনাগাদ", "View and update complaints"],
  ["COMPLAINT_PII", "গোপন যোগাযোগ তথ্য দেখা (অভিযোগ ও তথ্য জমা)", "See private contact details and victim names"],
  ["CONTENT", "সাইটের কনটেন্ট সম্পাদনা", "Edit site content"],
  ["EXPORT", "CSV ডাউনলোড (যোগাযোগ ছাড়া)", "CSV export (without contact details)"],
] as const);
