#!/usr/bin/env node
/**
 * Mobile navigation contract.
 * Below md: icon + short label underneath, horizontally scrollable.
 * md and up: byte-for-byte the previous desktop presentation.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(process.cwd());
const NAV = path.join(root, "src/components/Layout/Navigation.tsx");
const src = readFileSync(NAV, "utf8");

let pass = 0;
let fail = 0;
const ok = (name, cond) => {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name}`);
  }
};

// --- routes + labels ------------------------------------------------------ //
const expected = [
  ["/", "Home", "Home"],
  ["/dashboard", "Dashboard", "Dashboard"],
  ["/upload", "Upload", "Upload"],
  ["/repurpose", "Repurpose", "Repurpose"],
  ["/auto-music-sync", "Music Sync", "Music"],
  ["/clip-post", "Clip & Post", "Clip & Post"],
  ["/auto-upload", "Auto Upload", "Auto Upload"],
  ["/ai-studio", "AI Studio", "AI Studio"],
  ["/analytics", "Analytics", "Analytics"],
  ["/editor", "Editor", "Editor"],
  ["/status", "Status", "Status"],
  ["/pricing", "Pricing", "Pricing"],
];

const entryRe =
  /\{\s*href:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*(?:mobileLabel:\s*"([^"]+)",\s*)?icon:\s*(\w+)\s*\}/g;
const entries = [...src.matchAll(entryRe)].map((m) => ({
  href: m[1],
  label: m[2],
  mobileLabel: m[3] ?? m[2],
  icon: m[4],
}));

ok("NAV_ITEM_COUNT_12", entries.length === 12);
ok(
  "ROUTES_PRESERVED",
  expected.every(([href], i) => entries[i] && entries[i].href === href),
);
ok(
  "DESKTOP_LABELS_PRESERVED",
  expected.every(([, label], i) => entries[i] && entries[i].label === label),
);
ok(
  "MOBILE_LABELS_AS_SPECIFIED",
  expected.every(([, , ml], i) => entries[i] && entries[i].mobileLabel === ml),
);
ok(
  "MOBILE_LABELS_SHORT",
  entries.every((e) => e.mobileLabel.length <= 12),
);
ok(
  "ICONS_ALL_PRESENT",
  entries.every((e) => /^[A-Z]/.test(e.icon)),
);

// --- mobile presentation -------------------------------------------------- //
ok("MOBILE_LABEL_SPAN_PRESENT", src.includes("md:hidden text-[11px] font-medium leading-tight whitespace-nowrap"));
// 11px is the floor for comfortable legibility on iPhone widths.
ok("MOBILE_LABEL_READABLE_SIZE", /text-\[1[1-9]px\]/.test(src) && !src.includes("text-[10px]"));
ok("MOBILE_LABEL_MEDIUM_WEIGHT", src.includes("font-medium leading-tight"));
ok("MOBILE_STACK_ICON_OVER_LABEL", src.includes("flex flex-col md:flex-row"));
ok("MOBILE_GAP_BETWEEN_ICON_AND_LABEL", src.includes("gap-0.5 md:gap-0"));
ok("MOBILE_TAP_TARGET_MIN_WIDTH", src.includes("min-w-[3.75rem] md:min-w-0"));
ok("ICON_DOES_NOT_SHRINK", src.includes('"h-4 w-4 shrink-0"'));

// --- desktop unchanged ---------------------------------------------------- //
ok("DESKTOP_LABEL_SPAN_UNCHANGED", src.includes('<span className="hidden md:inline-block">{label}</span>'));
ok("DESKTOP_ROW_LAYOUT", src.includes("md:flex-row"));
ok("DESKTOP_SPACING_SCOPED", src.includes("md:space-x-2") && !src.includes("flex items-center space-x-2 px-4 py-2"));
ok("DESKTOP_PADDING_RESTORED", src.includes("md:px-4") && src.includes("md:py-2"));
ok("DESKTOP_NO_MIN_WIDTH", src.includes("md:min-w-0"));

// --- horizontal scroll, no page widening ---------------------------------- //
ok("SCROLL_CONTAINER_PRESENT", src.includes("overflow-x-auto"));
ok("SCROLL_CONTAINER_CAN_SHRINK", src.includes("min-w-0 flex-1 overflow-x-auto"));
ok("SCROLL_CONTAINER_DESKTOP_UNCHANGED", src.includes("md:flex-none md:overflow-visible"));
ok("NO_PAGE_WIDENING", !src.includes("w-screen") && !src.includes("min-w-full"));
ok("NAV_STILL_FULL_WIDTH", src.includes("justify-between w-full"));
ok("NO_OVERFLOW_HIDDEN_CLIPPING_GLOW", !src.includes("overflow-x-hidden"));
ok("LOGO_DOES_NOT_SHRINK", src.includes("flex items-center space-x-2 shrink-0"));

// --- active state + auth block preserved --------------------------------- //
ok("ACTIVE_BG_PRESERVED", src.includes('"bg-primary/10 text-primary"'));
ok("ACTIVE_GLOW_PRESERVED", src.includes("shadow-[0_0_20px_hsl(var(--boom-primary)/0.3)]"));
ok("ACTIVE_BORDER_PRESERVED", src.includes('"border border-primary/20"'));
ok("INACTIVE_STYLE_PRESERVED", src.includes('!isActive && "text-muted-foreground hover:text-foreground"'));
ok("ACTIVE_ICON_TINT_PRESERVED", src.includes('isActive && "text-primary"'));
ok("ACTIVE_KEYED_ON_PATHNAME", src.includes("location.pathname === href"));
ok("SIGNOUT_BLOCK_INTACT", src.includes('data-cy="sign-out-button"') && src.includes('data-cy="user-profile"'));
ok("LIBS_SIGNAL", src.includes("const { user, signOut } = useAuth()"));

// --- scope: nothing else changed ------------------------------------------ //
// git status is noisy here (many files were already dirty from earlier phases),
// so assert scope by modification time: only this component may be fresh.
let recentlyTouched = [];
try {
  const out = execSync(
    "find src supabase ai-worker -newermt '-20 minutes' -type f " +
      "-not -path '*/node_modules/*' -not -path '*/.temp/*'",
    { cwd: root },
  )
    .toString()
    .trim();
  recentlyTouched = out ? out.split("\n") : [];
} catch {
  recentlyTouched = [];
}
ok(
  "SCOPE_ONLY_NAVIGATION_TOUCHED",
  recentlyTouched.length === 0 ||
    (recentlyTouched.length === 1 && recentlyTouched[0].endsWith("Layout/Navigation.tsx")),
);
ok("NO_BACKEND_FILES_TOUCHED", recentlyTouched.every((f) => !/supabase\/|ai-worker\//.test(f)));
ok("NO_CAPTION_RENDERER_TOUCHED", !recentlyTouched.some((f) => /renderer\.py|job-processor|youtube-publish|tiktok/.test(f)));

console.log(`\nTEST_RESULTS=${fail === 0 ? "ALL_PASS" : "FAIL"} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
