#!/usr/bin/env node
/**
 * Atlas Create Now black-screen regressions.
 * Source-level: no production write, no Gate #77 processor/worker change.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("/root/boom-ai-edit");
const auth = readFileSync(resolve(root, "src/pages/Auth.tsx"), "utf8");
const hero = readFileSync(resolve(root, "src/components/Hero.tsx"), "utf8");
const app = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const prot = readFileSync(resolve(root, "src/components/ProtectedRoute.tsx"), "utf8");
const upload = readFileSync(resolve(root, "src/pages/Upload.tsx"), "utf8");
const editor = readFileSync(resolve(root, "src/pages/Editor.tsx"), "utf8");

function assert(cond, name) {
  if (!cond) {
    console.error("FAIL", name);
    process.exit(1);
  }
  console.log("PASS", name);
}

const effectIdx = auth.indexOf("useEffect(");
const userReturnIdx = auth.indexOf("if (user)");
assert(effectIdx > 0, "AUTH_HAS_USEEFFECT");
assert(userReturnIdx > 0, "AUTH_HAS_USER_RETURN");
assert(effectIdx < userReturnIdx, "HOOKS_BEFORE_CONDITIONAL_RETURN");
assert(!auth.includes('Navigate to="/" replace'), "NO_AUTH_REDIRECT_HOME");
assert(!auth.includes('to="/"'), "NO_AUTH_NAVIGATE_HOME");
assert(auth.includes('to="/upload"'), "AUTHED_AUTH_ROUTE_GOES_UPLOAD");
assert(auth.includes("authLoading"), "AUTH_WAITS_FOR_SESSION");

assert(hero.includes("Start Creating Now"), "CTA_LABEL_PRESENT");
assert(hero.includes('user ? "/upload" : "/auth"'), "AUTHED_CTA_GOES_UPLOAD");
assert(hero.includes("<Link to={createNowTo}"), "CTA_USES_SPA_LINK");
assert(!hero.includes('href="/auth"'), "CTA_NO_FULL_RELOAD_AUTH");

assert(app.includes('path="/upload"'), "UPLOAD_ROUTE_EXISTS");
assert(app.includes('path="/auth"'), "AUTH_ROUTE_EXISTS");
assert(prot.includes('to="/auth"'), "UNAUTH_PROTECTED_REDIRECTS_AUTH");
assert(upload.includes("handleFiles"), "UPLOAD_PAGE_HAS_FILE_HANDLER");
assert(editor.includes('functions.invoke("create-job"') || editor.includes("functions.invoke('create-job'"), "CREATE_JOB_INVOKE_INTACT");
assert(editor.includes("/status/"), "STATUS_NAV_INTACT");

console.log("ALL_PASS");
