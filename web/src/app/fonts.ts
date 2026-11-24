import { Anek_Bangla, Noto_Serif_Bengali, Noto_Serif, Outfit } from "next/font/google";

export const anek = Anek_Bangla({ subsets: ["bengali", "latin"], weight: ["400", "500", "600", "700", "800"], variable: "--ff-anek", display: "swap" });
export const serifBn = Noto_Serif_Bengali({ subsets: ["bengali", "latin"], weight: ["500", "600", "700"], variable: "--ff-serif-bn", display: "swap" });
export const serif = Noto_Serif({ subsets: ["latin"], weight: ["500", "600"], variable: "--ff-serif", display: "swap" });
export const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--ff-outfit", display: "swap" });

export const fontVars = [anek.variable, serifBn.variable, serif.variable, outfit.variable].join(" ");
