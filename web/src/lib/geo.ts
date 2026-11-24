// Divisions and the 64 districts. Division codes match the Prisma `Division` enum.
export type DivisionCode = "DHAKA" | "CHATTOGRAM" | "RAJSHAHI" | "KHULNA" | "BARISHAL" | "SYLHET" | "RANGPUR" | "MYMENSINGH" | "ABROAD";

export const DIVISIONS: { code: DivisionCode; bn: string; en: string }[] = [
  { code: "DHAKA", bn: "ঢাকা", en: "Dhaka" },
  { code: "CHATTOGRAM", bn: "চট্টগ্রাম", en: "Chattogram" },
  { code: "RAJSHAHI", bn: "রাজশাহী", en: "Rajshahi" },
  { code: "KHULNA", bn: "খুলনা", en: "Khulna" },
  { code: "BARISHAL", bn: "বরিশাল", en: "Barishal" },
  { code: "SYLHET", bn: "সিলেট", en: "Sylhet" },
  { code: "RANGPUR", bn: "রংপুর", en: "Rangpur" },
  { code: "MYMENSINGH", bn: "ময়মনসিংহ", en: "Mymensingh" },
  { code: "ABROAD", bn: "প্রবাস", en: "Abroad" },
];

/** [bangla, english, division] — district → division computed from geoBoundaries ADM2 centroids */
export const DISTRICTS: [string, string, DivisionCode][] = [
  ["বাগেরহাট", "Bagerhat", "KHULNA"], ["বান্দরবান", "Bandarban", "CHATTOGRAM"], ["বরগুনা", "Barguna", "BARISHAL"],
  ["বরিশাল", "Barishal", "BARISHAL"], ["ভোলা", "Bhola", "BARISHAL"], ["বগুড়া", "Bogura", "RAJSHAHI"],
  ["ব্রাহ্মণবাড়িয়া", "Brahmanbaria", "CHATTOGRAM"], ["চাঁদপুর", "Chandpur", "CHATTOGRAM"], ["চট্টগ্রাম", "Chattogram", "CHATTOGRAM"],
  ["চুয়াডাঙ্গা", "Chuadanga", "KHULNA"], ["কুমিল্লা", "Cumilla", "CHATTOGRAM"], ["কক্সবাজার", "Cox's Bazar", "CHATTOGRAM"],
  ["ঢাকা", "Dhaka", "DHAKA"], ["দিনাজপুর", "Dinajpur", "RANGPUR"], ["ফরিদপুর", "Faridpur", "DHAKA"],
  ["ফেনী", "Feni", "CHATTOGRAM"], ["গাইবান্ধা", "Gaibandha", "RANGPUR"], ["গাজীপুর", "Gazipur", "DHAKA"],
  ["গোপালগঞ্জ", "Gopalganj", "DHAKA"], ["হবিগঞ্জ", "Habiganj", "SYLHET"], ["জামালপুর", "Jamalpur", "MYMENSINGH"],
  ["যশোর", "Jashore", "KHULNA"], ["ঝালকাঠি", "Jhalokati", "BARISHAL"], ["ঝিনাইদহ", "Jhenaidah", "KHULNA"],
  ["জয়পুরহাট", "Joypurhat", "RAJSHAHI"], ["খাগড়াছড়ি", "Khagrachhari", "CHATTOGRAM"], ["খুলনা", "Khulna", "KHULNA"],
  ["কিশোরগঞ্জ", "Kishoreganj", "DHAKA"], ["কুড়িগ্রাম", "Kurigram", "RANGPUR"], ["কুষ্টিয়া", "Kushtia", "KHULNA"],
  ["লক্ষ্মীপুর", "Lakshmipur", "CHATTOGRAM"], ["লালমনিরহাট", "Lalmonirhat", "RANGPUR"], ["মাদারীপুর", "Madaripur", "DHAKA"],
  ["মাগুরা", "Magura", "KHULNA"], ["মানিকগঞ্জ", "Manikganj", "DHAKA"], ["মৌলভীবাজার", "Moulvibazar", "SYLHET"],
  ["মেহেরপুর", "Meherpur", "KHULNA"], ["মুন্সীগঞ্জ", "Munshiganj", "DHAKA"], ["ময়মনসিংহ", "Mymensingh", "MYMENSINGH"],
  ["নওগাঁ", "Naogaon", "RAJSHAHI"], ["নড়াইল", "Narail", "KHULNA"], ["নারায়ণগঞ্জ", "Narayanganj", "DHAKA"],
  ["নরসিংদী", "Narsingdi", "DHAKA"], ["নাটোর", "Natore", "RAJSHAHI"], ["চাঁপাইনবাবগঞ্জ", "Chapai Nawabganj", "RAJSHAHI"],
  ["নেত্রকোনা", "Netrokona", "MYMENSINGH"], ["নীলফামারী", "Nilphamari", "RANGPUR"], ["নোয়াখালী", "Noakhali", "CHATTOGRAM"],
  ["পাবনা", "Pabna", "RAJSHAHI"], ["পঞ্চগড়", "Panchagarh", "RANGPUR"], ["পটুয়াখালী", "Patuakhali", "BARISHAL"],
  ["পিরোজপুর", "Pirojpur", "BARISHAL"], ["রাজবাড়ী", "Rajbari", "DHAKA"], ["রাজশাহী", "Rajshahi", "RAJSHAHI"],
  ["রাঙ্গামাটি", "Rangamati", "CHATTOGRAM"], ["রংপুর", "Rangpur", "RANGPUR"], ["সাতক্ষীরা", "Satkhira", "KHULNA"],
  ["শরীয়তপুর", "Shariatpur", "DHAKA"], ["শেরপুর", "Sherpur", "MYMENSINGH"], ["সিরাজগঞ্জ", "Sirajganj", "RAJSHAHI"],
  ["সুনামগঞ্জ", "Sunamganj", "SYLHET"], ["সিলেট", "Sylhet", "SYLHET"], ["টাঙ্গাইল", "Tangail", "DHAKA"],
  ["ঠাকুরগাঁও", "Thakurgaon", "RANGPUR"],
];

export const divisionLabel = (c: string | null | undefined, lang: "bn" | "en" = "bn") =>
  DIVISIONS.find((d) => d.code === c)?.[lang] ?? "";

export const districtsOf = (c: string | null | undefined) =>
  DISTRICTS.filter((d) => !c || d[2] === c).sort((a, b) => a[0].localeCompare(b[0], "bn"));

/** Districts are stored by their Bangla name. Map an English name to it if needed. */
export function normaliseDistrict(v: string): string {
  const t = v.trim();
  const hit = DISTRICTS.find((d) => d[0] === t || d[1].toLowerCase() === t.toLowerCase());
  return hit ? hit[0] : t;
}
export const districtLabel = (bn: string, lang: "bn" | "en") =>
  lang === "en" ? DISTRICTS.find((d) => d[0] === bn)?.[1] ?? bn : bn;
